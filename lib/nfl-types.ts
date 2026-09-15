export type Team = {
  name: string;
  abbreviation: string;
  score: number | null;
  spread: number | null;
  color: string;
};

export type Injury = {
  player: string;
  position: string;
  status: string;
  detail: string | null;
};

export type Quarter = [string[], string[]];
export type TeamPointTotals = [number | null, number | null];
export type TeamInjuries = [Injury[], Injury[]];

export type Game = {
  id: string;
  teams: [Team, Team];
  quarters: Quarter[];
  offensivePoints: TeamPointTotals;
  defensivePoints: TeamPointTotals;
  injuries: TeamInjuries;
  completed: boolean;
  oddsProvider: string | null;
};

export type WeekData = {
  number: number;
  status: "Completed" | "Upcoming";
  games: Game[];
};
