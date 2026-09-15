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

type PointTotals = {
  offense: number;
  defense: number;
};

type TouchdownRef = {
  playIndex: number;
  bucket: ScoreBucket;
  points: number;
};

type LastTouchdown = TouchdownRef & {
  quarterIndex: number;
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
  return [0, 1, 2, 3].map((quarterIndex) => competitor.linescores?.[quarterIndex]?.value ?? 0);
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

function addPoints(totals: PointTotals, bucket: ScoreBucket, points: number) {
  if (bucket === "defense") totals.defense += points;
  if (bucket === "offense") totals.offense += points;
}

function bumpMergedTouchdownLabel(label: string, points: number, twoPoint: boolean) {
  const rest = label.replace(/^\d+\s+/, "").replace(/ \+ 2PT$/, "");
  return `${points} ${rest}${twoPoint ? " + 2PT" : ""}`;
}

function addMissingConversion(
  quarters: [Quarter, Quarter, Quarter, Quarter],
  teamTotals: [PointTotals, PointTotals],
  quarterIndex: number,
  teamIndex: number,
  touchdown: TouchdownRef,
  points: number,
  twoPoint: boolean,
) {
  const currentLabel = quarters[quarterIndex][teamIndex][touchdown.playIndex];
  touchdown.points += points;
  quarters[quarterIndex][teamIndex][touchdown.playIndex] = bumpMergedTouchdownLabel(
    currentLabel,
    touchdown.points,
    twoPoint,
  );
  addPoints(teamTotals[teamIndex], touchdown.bucket, points);
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

    const teamTotals: [PointTotals, PointTotals] = [
      { offense: 0, defense: 0 },
      { offense: 0, defense: 0 },
    ];
    const quarterScoredPoints = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    const touchdownRefs: TouchdownRef[][][] = [
      [[], []],
      [[], []],
      [[], []],
      [[], []],
    ];
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
        quarterScoredPoints[quarterIndex][teamIndex] += points;
        addPoints(teamTotals[teamIndex], previousTouchdown.bucket, points);
        continue;
      }

      const classified = classifyScoringPlay(play);
      const playIndex = quarters[quarterIndex][teamIndex].push(classified.label) - 1;
      quarterScoredPoints[quarterIndex][teamIndex] += points;
      addPoints(teamTotals[teamIndex], classified.bucket, points);

      if (classified.isTouchdown) {
        const touchdown: TouchdownRef = {
          playIndex,
          bucket: classified.bucket,
          points,
        };
        touchdownRefs[quarterIndex][teamIndex].push(touchdown);
        lastTouchdownByTeam.set(teamIndex, {
          ...touchdown,
          quarterIndex,
        });
      } else {
        lastTouchdownByTeam.delete(teamIndex);
      }
    }

    // ESPN's scoring-play feed sometimes omits PATs even though the scoreboard quarter
    // totals include them. Reconcile the classified plays against the authoritative
    // quarter total so a 6-point TD becomes the 7-point score the user actually saw.
    for (let quarterIndex = 0; quarterIndex < 4; quarterIndex += 1) {
      for (let teamIndex = 0; teamIndex < 2; teamIndex += 1) {
        const target = normalized.lineScores[teamIndex][quarterIndex] ?? 0;
        let missingPoints = target - quarterScoredPoints[quarterIndex][teamIndex];
        if (missingPoints <= 0) continue;

        const sixPointTouchdowns = touchdownRefs[quarterIndex][teamIndex].filter((touchdown) => touchdown.points === 6);

        if (missingPoints === 2 && sixPointTouchdowns.length === 1) {
          addMissingConversion(quarters, teamTotals, quarterIndex, teamIndex, sixPointTouchdowns[0], 2, true);
          quarterScoredPoints[quarterIndex][teamIndex] += 2;
          continue;
        }

        for (const touchdown of sixPointTouchdowns) {
          if (missingPoints <= 0) break;
          addMissingConversion(quarters, teamTotals, quarterIndex, teamIndex, touchdown, 1, false);
          quarterScoredPoints[quarterIndex][teamIndex] += 1;
          missingPoints -= 1;
        }
      }
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
