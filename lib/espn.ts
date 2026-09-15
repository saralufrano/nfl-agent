import type { Game, Quarter, Team, WeekData } from "@/lib/nfl-types";

const ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const ESPN_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";
const SEASON = 2026;

type EspnLineScore = {
  value?: number;
};

type EspnCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  linescores?: EspnLineScore[];
  team?: {
    id?: string;
    name?: string;
    abbreviation?: string;
    color?: string;
  };
};

type EspnCompetition = {
  competitors?: EspnCompetitor[];
  status?: {
    type?: {
      state?: string;
      completed?: boolean;
    };
  };
};

type EspnEvent = {
  id?: string;
  competitions?: EspnCompetition[];
};

type EspnScoreboard = {
  events?: EspnEvent[];
};

type EspnScoringPlay = {
  id?: string;
  type?: {
    text?: string;
    abbreviation?: string;
  };
  period?: {
    number?: number;
  };
  team?: {
    id?: string;
  };
  text?: string;
  shortText?: string;
  scoreValue?: number;
};

type EspnSummary = {
  scoringPlays?: EspnScoringPlay[];
};

type ScoreBucket = "offense" | "defense" | "special";

type LastTouchdown = {
  quarterIndex: number;
  teamIndex: number;
  playIndex: number;
  bucket: ScoreBucket;
  points: number;
};

type NormalizedGame = {
  game: Game;
  completed: boolean;
  teamIds: [string | undefined, string | undefined];
};

function normalizeTeam(competitor: EspnCompetitor, completed: boolean): Team {
  const rawColor = competitor.team?.color || "4b5563";
  return {
    name: competitor.team?.name || "Team",
    abbreviation: competitor.team?.abbreviation || "NFL",
    score: completed ? Number(competitor.score || 0) : null,
    spread: "—",
    color: rawColor.startsWith("#") ? rawColor : `#${rawColor}`,
  };
}

function fallbackQuarterBlocks(
  teams: [EspnCompetitor, EspnCompetitor],
  completed: boolean,
): [Quarter, Quarter, Quarter, Quarter] {
  return [0, 1, 2, 3].map((quarterIndex) => {
    if (!completed) return [[], []] as Quarter;

    return teams.map((team) => {
      const value = team.linescores?.[quarterIndex]?.value ?? 0;
      return value > 0 ? [`${value} pts`] : [];
    }) as Quarter;
  }) as [Quarter, Quarter, Quarter, Quarter];
}

function normalizeGame(event: EspnEvent): NormalizedGame | null {
  const competition = event.competitions?.[0];
  if (!competition || !event.id) return null;

  const competitors = competition.competitors || [];
  const away = competitors.find((team) => team.homeAway === "away");
  const home = competitors.find((team) => team.homeAway === "home");
  if (!away || !home) return null;

  const completed = Boolean(competition.status?.type?.completed);
  const orderedTeams: [EspnCompetitor, EspnCompetitor] = [away, home];

  return {
    game: {
      id: event.id,
      teams: [normalizeTeam(away, completed), normalizeTeam(home, completed)],
      quarters: fallbackQuarterBlocks(orderedTeams, completed),
      offensivePoints: null,
      defensivePoints: null,
    },
    completed,
    teamIds: [away.team?.id, home.team?.id],
  };
}

function scoringText(play: EspnScoringPlay) {
  return [play.type?.text, play.type?.abbreviation, play.shortText, play.text]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoringPoints(play: EspnScoringPlay) {
  if (typeof play.scoreValue === "number") return play.scoreValue;

  const text = scoringText(play);
  if (text.includes("field goal")) return 3;
  if (text.includes("safety")) return 2;
  if (text.includes("two-point") || text.includes("two point") || text.includes("2pt")) return 2;
  if (text.includes("extra point") || text.includes("pat")) return 1;
  if (text.includes("touchdown") || text.includes(" td ") || text.endsWith(" td")) return 6;
  return 0;
}

function isExtraPoint(play: EspnScoringPlay) {
  const text = scoringText(play);
  return text.includes("extra point") || text.includes("pat");
}

function isTwoPoint(play: EspnScoringPlay) {
  const text = scoringText(play);
  return text.includes("two-point") || text.includes("two point") || text.includes("2pt");
}

function classifyScoringPlay(play: EspnScoringPlay): { label: string; bucket: ScoreBucket; isTouchdown: boolean } {
  const text = scoringText(play);
  const points = scoringPoints(play);
  const prefix = points > 0 ? `${points} ` : "";

  if ((text.includes("interception") || text.includes("pick six") || text.includes("pick-six")) && text.includes("touchdown")) {
    return { label: `${prefix}Def. TD (INT)`, bucket: "defense", isTouchdown: true };
  }

  if (text.includes("fumble") && text.includes("touchdown")) {
    return { label: `${prefix}Def. TD (Fum)`, bucket: "defense", isTouchdown: true };
  }

  if (text.includes("blocked") && text.includes("touchdown")) {
    return { label: `${prefix}Def. TD (Block)`, bucket: "defense", isTouchdown: true };
  }

  if (text.includes("safety")) {
    return { label: `${prefix}Def. Safety`, bucket: "defense", isTouchdown: false };
  }

  if ((text.includes("kickoff return") || text.includes("punt return")) && text.includes("touchdown")) {
    return { label: `${prefix}ST TD Return`, bucket: "special", isTouchdown: true };
  }

  if (text.includes("field goal")) {
    return { label: `${prefix}Kick FG`, bucket: "offense", isTouchdown: false };
  }

  if ((text.includes("rushing touchdown") || text.includes("rush") || text.includes(" yd run")) && text.includes("touchdown")) {
    return { label: `${prefix}Off. TD Run`, bucket: "offense", isTouchdown: true };
  }

  if (
    (text.includes("passing touchdown") || text.includes("pass") || text.includes(" yd pass")) &&
    text.includes("touchdown")
  ) {
    return { label: `${prefix}Off. TD Pass`, bucket: "offense", isTouchdown: true };
  }

  if (text.includes("touchdown")) {
    return { label: `${prefix}Off. TD`, bucket: "offense", isTouchdown: true };
  }

  if (isExtraPoint(play)) {
    return { label: `${prefix}Kick XP`, bucket: "offense", isTouchdown: false };
  }

  if (isTwoPoint(play)) {
    const suffix = text.includes("pass") ? "Pass" : text.includes("rush") || text.includes("run") ? "Run" : "Conv";
    return { label: `${prefix}Off. 2PT ${suffix}`, bucket: "offense", isTouchdown: false };
  }

  return { label: `${prefix}${play.type?.text || "Score"}`.trim(), bucket: "offense", isTouchdown: false };
}

function addPoints(totals: { offense: number; defense: number }, bucket: ScoreBucket, points: number) {
  if (bucket === "defense") totals.defense += points;
  if (bucket === "offense") totals.offense += points;
}

function bumpMergedTouchdownLabel(label: string, points: number, twoPoint: boolean) {
  const rest = label.replace(/^\d+\s+/, "");
  return `${points} ${rest}${twoPoint ? " + 2PT" : ""}`;
}

async function enrichWithScoringPlays(normalized: NormalizedGame): Promise<Game> {
  if (!normalized.completed) return normalized.game;

  try {
    const response = await fetch(`${ESPN_SUMMARY}?event=${normalized.game.id}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) return normalized.game;

    const summary = (await response.json()) as EspnSummary;
    const scoringPlays = summary.scoringPlays || [];
    if (!scoringPlays.length) return normalized.game;

    const quarters: [Quarter, Quarter, Quarter, Quarter] = [
      [[], []],
      [[], []],
      [[], []],
      [[], []],
    ];

    const topTeamTotals = { offense: 0, defense: 0 };
    const lastTouchdownByTeam = new Map<number, LastTouchdown>();

    for (const play of scoringPlays) {
      const quarterNumber = play.period?.number;
      if (!quarterNumber || quarterNumber < 1 || quarterNumber > 4) continue;

      const teamIndex = normalized.teamIds.findIndex((id) => id && id === play.team?.id);
      if (teamIndex === -1) continue;

      const quarterIndex = quarterNumber - 1;
      const points = scoringPoints(play);
      const previousTouchdown = lastTouchdownByTeam.get(teamIndex);

      if ((isExtraPoint(play) || isTwoPoint(play)) && previousTouchdown?.quarterIndex === quarterIndex) {
        const mergedPoints = previousTouchdown.points + points;
        const existingLabel = quarters[quarterIndex][teamIndex][previousTouchdown.playIndex];
        quarters[quarterIndex][teamIndex][previousTouchdown.playIndex] = bumpMergedTouchdownLabel(
          existingLabel,
          mergedPoints,
          isTwoPoint(play),
        );
        previousTouchdown.points = mergedPoints;

        if (teamIndex === 0) addPoints(topTeamTotals, previousTouchdown.bucket, points);
        continue;
      }

      const classified = classifyScoringPlay(play);
      const playIndex = quarters[quarterIndex][teamIndex].push(classified.label) - 1;

      if (classified.isTouchdown) {
        lastTouchdownByTeam.set(teamIndex, {
          quarterIndex,
          teamIndex,
          playIndex,
          bucket: classified.bucket,
          points,
        });
      } else {
        lastTouchdownByTeam.delete(teamIndex);
      }

      if (teamIndex === 0) addPoints(topTeamTotals, classified.bucket, points);
    }

    return {
      ...normalized.game,
      quarters,
      offensivePoints: topTeamTotals.offense,
      defensivePoints: topTeamTotals.defense,
    };
  } catch {
    return normalized.game;
  }
}

export async function fetchNflWeek(week: number): Promise<WeekData> {
  const url = `${ESPN_SCOREBOARD}?dates=${SEASON}&seasontype=2&week=${week}`;
  const response = await fetch(url, { next: { revalidate: 300 } });

  if (!response.ok) {
    throw new Error(`ESPN scoreboard request failed: ${response.status}`);
  }

  const data = (await response.json()) as EspnScoreboard;
  const normalizedGames = (data.events || [])
    .map(normalizeGame)
    .filter((game): game is NormalizedGame => Boolean(game));
  const games = await Promise.all(normalizedGames.map(enrichWithScoringPlays));
  const completed =
    games.length > 0 &&
    (data.events || []).every((event) => event.competitions?.[0]?.status?.type?.completed);

  return {
    number: week,
    status: completed ? "Completed" : "Upcoming",
    games,
  };
}
