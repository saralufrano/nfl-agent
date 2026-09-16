import type { AvailabilityNote, Injury, WeekData } from "@/lib/nfl-types";

const ESPN_TEAMS = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams";

const ESPN_TEAM_IDS: Record<string, string> = {
  ARI: "22",
  ATL: "1",
  BAL: "33",
  BUF: "2",
  CAR: "29",
  CHI: "3",
  CIN: "4",
  CLE: "5",
  DAL: "6",
  DEN: "7",
  DET: "8",
  GB: "9",
  HOU: "34",
  IND: "11",
  JAX: "30",
  KC: "12",
  LV: "13",
  LAC: "24",
  LAR: "14",
  MIA: "15",
  MIN: "16",
  NE: "17",
  NO: "18",
  NYG: "19",
  NYJ: "20",
  PHI: "21",
  PIT: "23",
  SF: "25",
  SEA: "26",
  TB: "27",
  TEN: "10",
  WSH: "28",
};

type RawStatus =
  | string
  | {
      name?: string;
      description?: string;
      type?: {
        name?: string;
        description?: string;
        abbreviation?: string;
      };
    };

type RawInjury = {
  athlete?: {
    fullName?: string;
    displayName?: string;
    shortName?: string;
    position?: {
      abbreviation?: string;
      name?: string;
    };
  };
  status?: RawStatus;
  type?: {
    name?: string;
    description?: string;
    abbreviation?: string;
  };
  details?: {
    type?: string;
    detail?: string;
    location?: string;
    side?: string;
  };
  shortComment?: string;
  longComment?: string;
};

type TeamInjuryPayload = {
  injuries?: unknown[];
  items?: unknown[];
};

type RawNewsArticle = {
  headline?: string;
  description?: string;
  published?: string;
};

type TeamNewsPayload = {
  articles?: RawNewsArticle[];
};

type TeamAvailabilityData = {
  injuries: Injury[];
  notes: AvailabilityNote[];
};

const INJURY_NEWS_PATTERN =
  /injur|hurt|out\b|miss(?:es|ing|ed)?\b|sidelined|questionable|doubtful|inactive|ruled out|return timetable|expected to miss|will not play|won't play/i;

function statusText(status: RawStatus | undefined) {
  if (typeof status === "string") return status;
  return (
    status?.name ||
    status?.description ||
    status?.type?.name ||
    status?.type?.description ||
    status?.type?.abbreviation ||
    "Injury report"
  );
}

function looksLikeInjury(value: unknown): value is RawInjury {
  if (!value || typeof value !== "object") return false;
  const candidate = value as RawInjury;
  return Boolean(candidate.athlete?.fullName || candidate.athlete?.displayName || candidate.athlete?.shortName);
}

function extractRawInjuries(payload: TeamInjuryPayload): RawInjury[] {
  const candidates = [...(payload.injuries || []), ...(payload.items || [])];
  const direct = candidates.filter(looksLikeInjury);
  if (direct.length) return direct;

  return candidates.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const nested = (candidate as { injuries?: unknown[] }).injuries || [];
    return nested.filter(looksLikeInjury);
  });
}

function normalizeInjury(injury: RawInjury): Injury {
  const detailParts = [
    injury.details?.type,
    injury.details?.detail,
    injury.details?.location,
    injury.type?.description,
    injury.shortComment,
    injury.longComment,
  ].filter((value): value is string => Boolean(value));

  return {
    player: injury.athlete?.fullName || injury.athlete?.displayName || injury.athlete?.shortName || "Unknown player",
    position: injury.athlete?.position?.abbreviation || "—",
    status: statusText(injury.status),
    detail: detailParts.length ? [...new Set(detailParts)].join(" · ") : null,
  };
}

function injuryPriority(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("out") || normalized.includes("injured reserve") || normalized === "ir") return 0;
  if (normalized.includes("doubtful")) return 1;
  if (normalized.includes("questionable")) return 2;
  if (normalized.includes("probable")) return 3;
  return 4;
}

function recentEnough(published: string | undefined) {
  if (!published) return true;
  const timestamp = Date.parse(published);
  if (!Number.isFinite(timestamp)) return true;
  return Date.now() - timestamp <= 10 * 24 * 60 * 60 * 1000;
}

async function fetchTeamInjuries(teamId: string): Promise<Injury[]> {
  try {
    const response = await fetch(`${ESPN_TEAMS}/${teamId}/injuries`, {
      cache: "no-store",
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as TeamInjuryPayload;
    return extractRawInjuries(payload)
      .map(normalizeInjury)
      .sort((a, b) => injuryPriority(a.status) - injuryPriority(b.status) || a.player.localeCompare(b.player));
  } catch {
    return [];
  }
}

async function fetchTeamAvailabilityNews(teamId: string): Promise<AvailabilityNote[]> {
  try {
    const response = await fetch(`${ESPN_TEAMS}/${teamId}/news?limit=20`, {
      cache: "no-store",
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as TeamNewsPayload;
    return (payload.articles || [])
      .filter((article) => recentEnough(article.published))
      .filter((article) => INJURY_NEWS_PATTERN.test(`${article.headline || ""} ${article.description || ""}`))
      .slice(0, 4)
      .map((article) => ({
        headline: article.headline || "Injury update",
        detail: article.description || null,
        published: article.published || null,
      }));
  } catch {
    return [];
  }
}

function newsRows(notes: AvailabilityNote[]): Injury[] {
  return notes.map((note) => ({
    player: note.headline,
    position: "NEWS",
    status: "Availability watch",
    detail: note.detail,
  }));
}

async function fetchTeamAvailability(abbreviation: string): Promise<TeamAvailabilityData> {
  const teamId = ESPN_TEAM_IDS[abbreviation.toUpperCase()];
  if (!teamId) return { injuries: [], notes: [] };

  const [officialInjuries, notes] = await Promise.all([
    fetchTeamInjuries(teamId),
    fetchTeamAvailabilityNews(teamId),
  ]);

  const injuries = officialInjuries.length ? officialInjuries : newsRows(notes);
  return { injuries, notes };
}

export async function enrichWeeksWithCurrentInjuries(weeks: WeekData[]): Promise<WeekData[]> {
  const upcomingTeams = new Set(
    weeks
      .filter((week) => week.status === "Upcoming")
      .flatMap((week) => week.games.flatMap((game) => game.teams.map((team) => team.abbreviation.toUpperCase()))),
  );

  const entries = await Promise.all(
    [...upcomingTeams].map(async (abbreviation) => [abbreviation, await fetchTeamAvailability(abbreviation)] as const),
  );
  const availabilityMap = new Map(entries);

  return weeks.map((week) => ({
    ...week,
    games: week.games.map((game) => {
      const away = availabilityMap.get(game.teams[0].abbreviation.toUpperCase());
      const home = availabilityMap.get(game.teams[1].abbreviation.toUpperCase());

      return {
        ...game,
        injuries: [
          away?.injuries.length ? away.injuries : game.injuries[0],
          home?.injuries.length ? home.injuries : game.injuries[1],
        ],
        availabilityNotes: [away?.notes || [], home?.notes || []],
      };
    }),
  }));
}
