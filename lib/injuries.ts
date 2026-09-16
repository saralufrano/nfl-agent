import type { AvailabilityRole, Injury, WeekData } from "@/lib/nfl-types";

const SLEEPER_PLAYERS = "https://api.sleeper.app/v1/players/nfl";
const SIX_HOURS = 60 * 60 * 6;

type SleeperPlayer = {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  team?: string | null;
  position?: string | null;
  active?: boolean | null;
  status?: string | null;
  injury_status?: string | null;
  injury_body_part?: string | null;
  injury_start_date?: string | null;
  injury_notes?: string | null;
  practice_participation?: string | null;
  practice_description?: string | null;
  depth_chart_order?: number | null;
  depth_chart_position?: string | null;
};

type SleeperPlayersPayload = Record<string, SleeperPlayer>;

const TEAM_ALIASES: Record<string, string> = {
  WAS: "WSH",
  JAC: "JAX",
  OAK: "LV",
  SD: "LAC",
  STL: "LAR",
};

function normalizeTeam(value: string | null | undefined) {
  if (!value) return null;
  const abbreviation = value.toUpperCase();
  return TEAM_ALIASES[abbreviation] || abbreviation;
}

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isFullPractice(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return !normalized || normalized === "full" || normalized === "fp" || normalized === "full participation";
}

function playerName(player: SleeperPlayer) {
  return (
    clean(player.full_name) ||
    [clean(player.first_name), clean(player.last_name)].filter(Boolean).join(" ") ||
    "Unknown player"
  );
}

function isUsablePlayer(player: SleeperPlayer) {
  const name = playerName(player).toLowerCase();
  return name !== "duplicate player" && name !== "unknown player";
}

function isAvailabilityConcern(player: SleeperPlayer) {
  const rosterStatus = clean(player.status)?.toLowerCase();

  return Boolean(
    clean(player.injury_status) ||
      clean(player.injury_notes) ||
      clean(player.injury_body_part) ||
      !isFullPractice(player.practice_participation) ||
      clean(player.practice_description) ||
      (rosterStatus && rosterStatus !== "active") ||
      player.active === false,
  );
}

function availabilityStatus(player: SleeperPlayer) {
  const injuryStatus = clean(player.injury_status);
  if (injuryStatus) return injuryStatus;

  const rosterStatus = clean(player.status);
  if (rosterStatus && rosterStatus.toLowerCase() !== "active") return rosterStatus;

  const practiceDescription = clean(player.practice_description);
  if (practiceDescription) return practiceDescription;

  const practiceParticipation = clean(player.practice_participation);
  if (practiceParticipation && !isFullPractice(practiceParticipation)) return practiceParticipation;

  return "Injury watch";
}

function availabilityRole(player: SleeperPlayer): AvailabilityRole {
  const order = player.depth_chart_order;
  if (order === 1) return "Starter";
  if (order === 2) return "Rotation";
  if (typeof order === "number" && order >= 3) return "Depth";
  return "Roster";
}

function normalizeSleeperPlayer(player: SleeperPlayer): Injury {
  const details = [
    clean(player.injury_body_part),
    clean(player.injury_notes),
    clean(player.practice_description),
    !isFullPractice(player.practice_participation) ? clean(player.practice_participation) : null,
    clean(player.injury_start_date) ? `Since ${clean(player.injury_start_date)}` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    player: playerName(player),
    position: clean(player.position) || "—",
    status: availabilityStatus(player),
    detail: details.length ? [...new Set(details)].join(" · ") : null,
    availabilityRole: availabilityRole(player),
    depthChartOrder: player.depth_chart_order ?? null,
    depthChartPosition: clean(player.depth_chart_position),
  };
}

function availabilityPriority(status: string) {
  const normalized = status.toLowerCase();
  if (
    normalized.includes("out") ||
    normalized.includes("injured reserve") ||
    normalized === "ir" ||
    normalized.includes("pup") ||
    normalized.includes("inactive")
  ) {
    return 0;
  }
  if (normalized.includes("doubtful")) return 1;
  if (normalized.includes("questionable")) return 2;
  if (normalized.includes("did not practice") || normalized === "dnp") return 2;
  if (normalized.includes("limited")) return 3;
  return 4;
}

function rolePriority(role: AvailabilityRole | undefined) {
  if (role === "Starter") return 0;
  if (role === "Rotation") return 1;
  if (role === "Roster") return 2;
  return 3;
}

async function fetchSleeperAvailability(): Promise<Map<string, Injury[]>> {
  try {
    const response = await fetch(SLEEPER_PLAYERS, {
      headers: {
        Accept: "application/json",
        "User-Agent": "nfl-game-tracker/1.0",
      },
      next: { revalidate: SIX_HOURS },
    });

    if (!response.ok) return new Map();

    const payload = (await response.json()) as SleeperPlayersPayload;
    const byTeam = new Map<string, Injury[]>();

    for (const player of Object.values(payload)) {
      const team = normalizeTeam(player.team);
      if (!team || !isUsablePlayer(player) || !isAvailabilityConcern(player)) continue;

      const current = byTeam.get(team) || [];
      current.push(normalizeSleeperPlayer(player));
      byTeam.set(team, current);
    }

    for (const [team, players] of byTeam) {
      players.sort(
        (a, b) =>
          rolePriority(a.availabilityRole) - rolePriority(b.availabilityRole) ||
          availabilityPriority(a.status) - availabilityPriority(b.status) ||
          (a.depthChartOrder ?? 99) - (b.depthChartOrder ?? 99) ||
          a.position.localeCompare(b.position) ||
          a.player.localeCompare(b.player),
      );
      byTeam.set(team, players);
    }

    return byTeam;
  } catch {
    return new Map();
  }
}

export async function enrichWeeksWithAvailabilityWatch(weeks: WeekData[]): Promise<WeekData[]> {
  const availabilityMap = await fetchSleeperAvailability();

  return weeks.map((week) => ({
    ...week,
    games: week.games.map((game) => ({
      ...game,
      injuries: [
        availabilityMap.get(normalizeTeam(game.teams[0].abbreviation) || "") || [],
        availabilityMap.get(normalizeTeam(game.teams[1].abbreviation) || "") || [],
      ],
      availabilityNotes: undefined,
    })),
  }));
}
