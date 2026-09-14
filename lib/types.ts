export type Team = {
  id: string;
  city: string;
  name: string;
  abbreviation: string;
  record: string;
  color: string;
};

export type TeamStats = {
  pointsFor: number | null;
  pointsAgainst: number | null;
  passingYards: number | null;
  rushingYards: number | null;
  turnovers: number | null;
  sacks: number | null;
};

export type Injury = {
  player: string;
  position: string;
  status: "Out" | "Questionable" | "Doubtful" | "IR";
  reportDate: string;
};

export type Game = {
  id: string;
  pinned?: boolean;
  kickoff: string;
  status: string;
  network: string;
  venue: string;
  away: Team;
  home: Team;
  awayScore: number | null;
  homeScore: number | null;
  stats: {
    season: { away: TeamStats; home: TeamStats };
    lastFive: { away: TeamStats; home: TeamStats };
  };
  injuries: { away: Injury[]; home: Injury[] };
};

export type DashboardData = {
  weekLabel: string;
  dateLabel: string;
  games: Game[];
};
