export type Team = {
  name: string;
  abbreviation: string;
  score: number | null;
  spread: string;
  color: string;
};

export type Quarter = [string[], string[]];

export type Game = {
  id: string;
  teams: [Team, Team];
  quarters: [Quarter, Quarter, Quarter, Quarter];
  offensivePoints: number | null;
  defensivePoints: number | null;
};

export type WeekData = {
  number: number;
  status: "Completed" | "Upcoming";
  games: Game[];
};
