import type { Game, Quarter, Team, WeekData } from "@/lib/nfl-types";

const ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const SEASON = 2026;

type EspnLineScore = {
  value?: number;
};

type EspnCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  linescores?: EspnLineScore[];
  team?: {
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

function quarterBlocks(teams: [EspnCompetitor, EspnCompetitor], completed: boolean): [Quarter, Quarter, Quarter, Quarter] {
  return [0, 1, 2, 3].map((quarterIndex) => {
    if (!completed) return [[], []] as Quarter;

    return teams.map((team) => {
      const value = team.linescores?.[quarterIndex]?.value ?? 0;
      return [`${value} pts`];
    }) as Quarter;
  }) as [Quarter, Quarter, Quarter, Quarter];
}

function normalizeGame(event: EspnEvent): Game | null {
  const competition = event.competitions?.[0];
  if (!competition || !event.id) return null;

  const competitors = competition.competitors || [];
  const away = competitors.find((team) => team.homeAway === "away");
  const home = competitors.find((team) => team.homeAway === "home");
  if (!away || !home) return null;

  const completed = Boolean(competition.status?.type?.completed);
  const orderedTeams: [EspnCompetitor, EspnCompetitor] = [away, home];

  return {
    id: event.id,
    teams: [normalizeTeam(away, completed), normalizeTeam(home, completed)],
    quarters: quarterBlocks(orderedTeams, completed),
    offensivePoints: null,
    defensivePoints: null,
  };
}

export async function fetchNflWeek(week: number): Promise<WeekData> {
  const url = `${ESPN_SCOREBOARD}?dates=${SEASON}&seasontype=2&week=${week}`;
  const response = await fetch(url, { next: { revalidate: 300 } });

  if (!response.ok) {
    throw new Error(`ESPN scoreboard request failed: ${response.status}`);
  }

  const data = (await response.json()) as EspnScoreboard;
  const games = (data.events || []).map(normalizeGame).filter((game): game is Game => Boolean(game));
  const completed = games.length > 0 && (data.events || []).every((event) => event.competitions?.[0]?.status?.type?.completed);

  return {
    number: week,
    status: completed ? "Completed" : "Upcoming",
    games,
  };
}
