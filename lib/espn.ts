import type { Game, Quarter, Team, WeekData } from "@/lib/nfl-types";

const ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const ESPN_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";
const SEASON = 2026;
const PERIOD_COUNT = 5;

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
  awayScore?: number | string;
  homeScore?: number | string;
};

type EspnSummary = {
  scoringPlays?: EspnScoringPlay[];
};

type ScoreBucket = "offense" | "defense";

type PointTotals = {
  offense: number;
  defense: number;
};

type NormalizedGame = {
  game: Game;
  completed: boolean;
  teamIds: [string | undefined, string | undefined];
  lineScores: [number[], number[]];
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

function competitorLineScores(competitor: EspnCompetitor) {
  return Array.from({ length: PERIOD_COUNT }, (_, periodIndex) => competitor.linescores?.[periodIndex]?.value ?? 0);
}

function fallbackQuarterBlocks(
  teams: [EspnCompetitor, EspnCompetitor],
  completed: boolean,
): Quarter[] {
  return Array.from({ length: PERIOD_COUNT }, (_, periodIndex) => {
    if (!completed) return [[], []] as Quarter;

    return teams.map((team) => {
      const value = team.linescores?.[periodIndex]?.value ?? 0;
      return value > 0 ? [`${value} pts`] : [];
    }) as Quarter;
  });
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
      offensivePoints: [null, null],
      defensivePoints: [null, null],
    },
    completed,
    teamIds: [away.team?.id, home.team?.id],
    lineScores: [competitorLineScores(away), competitorLineScores(home)],
  };
}

function scoringText(play: EspnScoringPlay) {
  return [play.type?.text, play.type?.abbreviation, play.shortText, play.text]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function asNumber(value: number | string | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function fallbackPoints(play: EspnScoringPlay) {
  const text = scoringText(play);
  if (text.includes("field goal")) return 3;
  if (text.includes("safety")) return 2;
  if (text.includes("two-point") || text.includes("two point") || text.includes("2pt")) return 2;
  if (text.includes("extra point") || text.includes("pat")) return 1;
  if (text.includes("touchdown") || text.includes(" td ") || text.endsWith(" td")) return 6;
  if (typeof play.scoreValue === "number") return play.scoreValue;
  return 0;
}

function scoreSnapshot(play: EspnScoringPlay): [number, number] | null {
  const away = asNumber(play.awayScore);
  const home = asNumber(play.homeScore);
  if (away === null || home === null) return null;
  return [away, home];
}

function inferTeamIndex(
  play: EspnScoringPlay,
  teamIds: [string | undefined, string | undefined],
  previousScore: [number, number],
) {
  const byId = teamIds.findIndex((id) => id && id === play.team?.id);
  if (byId !== -1) return byId;

  const snapshot = scoreSnapshot(play);
  if (!snapshot) return -1;

  const awayDelta = snapshot[0] - previousScore[0];
  const homeDelta = snapshot[1] - previousScore[1];
  if (awayDelta > 0 && homeDelta <= 0) return 0;
  if (homeDelta > 0 && awayDelta <= 0) return 1;
  return -1;
}

function pointsFromScoreProgress(
  play: EspnScoringPlay,
  teamIndex: number,
  previousScore: [number, number],
) {
  const snapshot = scoreSnapshot(play);
  if (!snapshot) return fallbackPoints(play);

  const delta = snapshot[teamIndex] - previousScore[teamIndex];
  return delta > 0 ? delta : fallbackPoints(play);
}

function touchdownConversionNote(points: number) {
  if (points === 8) return " (+2PT)";
  if (points === 6) return " (no conversion)";
  return "";
}

function classifyScoringPlay(
  play: EspnScoringPlay,
  points: number,
): { label: string; bucket: ScoreBucket } {
  const text = scoringText(play);
  const prefix = `${points} `;
  const conversionNote = touchdownConversionNote(points);

  if (points <= 2 && (text.includes("extra point") || text.includes("pat"))) {
    if (points === 2 && (text.includes("return") || text.includes("blocked"))) {
      return { label: `${prefix}Def. PAT Return`, bucket: "defense" };
    }
    return { label: `${prefix}Kick XP`, bucket: "offense" };
  }

  if (points === 2 && (text.includes("two-point") || text.includes("two point") || text.includes("2pt"))) {
    if (text.includes("return") || text.includes("blocked") || text.includes("interception")) {
      return { label: `${prefix}Def. 2PT Return`, bucket: "defense" };
    }
    const suffix = text.includes("pass") ? "Pass" : text.includes("rush") || text.includes("run") ? "Run" : "Conv";
    return { label: `${prefix}Off. 2PT ${suffix}`, bucket: "offense" };
  }

  if ((text.includes("interception") || text.includes("pick six") || text.includes("pick-six")) && text.includes("touchdown")) {
    return { label: `${prefix}Def. TD (INT)${conversionNote}`, bucket: "defense" };
  }

  if (text.includes("fumble") && text.includes("touchdown")) {
    return { label: `${prefix}Def. TD (Fum)${conversionNote}`, bucket: "defense" };
  }

  if (text.includes("blocked") && text.includes("touchdown") && points >= 6) {
    return { label: `${prefix}Def. TD (Block)${conversionNote}`, bucket: "defense" };
  }

  if (text.includes("safety")) {
    return { label: `${prefix}Def. Safety`, bucket: "defense" };
  }

  if ((text.includes("kickoff return") || text.includes("punt return")) && text.includes("touchdown")) {
    return { label: `${prefix}ST TD Return${conversionNote}`, bucket: "offense" };
  }

  if (text.includes("field goal")) {
    return { label: `${prefix}Kick FG`, bucket: "offense" };
  }

  if ((text.includes("rushing touchdown") || text.includes("rush") || text.includes(" yd run")) && text.includes("touchdown")) {
    return { label: `${prefix}Off. TD Run${conversionNote}`, bucket: "offense" };
  }

  if (
    (text.includes("passing touchdown") || text.includes("pass") || text.includes(" yd pass")) &&
    text.includes("touchdown")
  ) {
    return { label: `${prefix}Off. TD Pass${conversionNote}`, bucket: "offense" };
  }

  if (text.includes("touchdown") || points >= 6) {
    return { label: `${prefix}Off. TD${conversionNote}`, bucket: "offense" };
  }

  return { label: `${prefix}${play.type?.text || "Score"}`.trim(), bucket: "offense" };
}

function addPoints(totals: PointTotals, bucket: ScoreBucket, points: number) {
  if (bucket === "defense") totals.defense += points;
  else totals.offense += points;
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

    const quarters: Quarter[] = Array.from({ length: PERIOD_COUNT }, () => [[], []] as Quarter);
    const teamTotals: [PointTotals, PointTotals] = [
      { offense: 0, defense: 0 },
      { offense: 0, defense: 0 },
    ];
    const quarterScoredPoints = Array.from({ length: PERIOD_COUNT }, () => [0, 0]);

    let previousScore: [number, number] = [0, 0];

    for (const play of scoringPlays) {
      const quarterNumber = play.period?.number;
      const snapshot = scoreSnapshot(play);

      if (!quarterNumber || quarterNumber < 1 || quarterNumber > PERIOD_COUNT) {
        if (snapshot) previousScore = snapshot;
        continue;
      }

      const teamIndex = inferTeamIndex(play, normalized.teamIds, previousScore);
      if (teamIndex === -1) {
        if (snapshot) previousScore = snapshot;
        continue;
      }

      const points = pointsFromScoreProgress(play, teamIndex, previousScore);
      if (snapshot) previousScore = snapshot;

      if (points <= 0) continue;

      const quarterIndex = quarterNumber - 1;
      const classified = classifyScoringPlay(play, points);
      quarters[quarterIndex][teamIndex].push(classified.label);
      quarterScoredPoints[quarterIndex][teamIndex] += points;
      addPoints(teamTotals[teamIndex], classified.bucket, points);
    }

    for (let quarterIndex = 0; quarterIndex < PERIOD_COUNT; quarterIndex += 1) {
      for (let teamIndex = 0; teamIndex < 2; teamIndex += 1) {
        const target = normalized.lineScores[teamIndex][quarterIndex] ?? 0;
        const accounted = quarterScoredPoints[quarterIndex][teamIndex];
        const missing = target - accounted;

        if (missing > 0) {
          quarters[quarterIndex][teamIndex].push(`${missing} Off. Other`);
          quarterScoredPoints[quarterIndex][teamIndex] += missing;
          teamTotals[teamIndex].offense += missing;
        }
      }
    }

    for (let teamIndex = 0; teamIndex < 2; teamIndex += 1) {
      const finalScore = normalized.game.teams[teamIndex].score ?? 0;
      const accounted = teamTotals[teamIndex].offense + teamTotals[teamIndex].defense;
      const missing = finalScore - accounted;
      if (missing > 0) teamTotals[teamIndex].offense += missing;
    }

    return {
      ...normalized.game,
      quarters,
      offensivePoints: [teamTotals[0].offense, teamTotals[1].offense],
      defensivePoints: [teamTotals[0].defense, teamTotals[1].defense],
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
