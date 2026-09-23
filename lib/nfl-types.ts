export type Team = {
  name: string;
  abbreviation: string;
  score: number | null;
  spread: number | null;
  color: string;
  record?: string | null;
  offenseRank?: number | null;
  defenseRank?: number | null;
};

export type AvailabilityRole = "Starter" | "Rotation" | "Roster" | "Depth";

export type Injury = {
  player: string;
  position: string;
  status: string;
  detail: string | null;
  availabilityRole?: AvailabilityRole;
  depthChartOrder?: number | null;
  depthChartPosition?: string | null;
};

export type AvailabilityNote = {
  headline: string;
  detail: string | null;
  published: string | null;
};

export type Venue = {
  name: string | null;
  city: string | null;
  state: string | null;
  indoor: boolean;
};

export type GameWeather = {
  summary: string;
  condition: string | null;
  temperatureF: number | null;
  precipitationProbability: number | null;
  windMph: number | null;
  indoor: boolean;
};

export type Quarter = [string[], string[]];
export type TeamPointTotals = [number | null, number | null];
export type TeamInjuries = [Injury[], Injury[]];
export type TeamAvailability = [AvailabilityNote[], AvailabilityNote[]];

export type Game = {
  id: string;
  teams: [Team, Team];
  quarters: Quarter[];
  offensivePoints: TeamPointTotals;
  defensivePoints: TeamPointTotals;
  injuries: TeamInjuries;
  availabilityNotes?: TeamAvailability;
  completed: boolean;
  oddsProvider: string | null;
  kickoff?: string | null;
  venue?: Venue | null;
  weather?: GameWeather | null;
};

export type WeekData = {
  number: number;
  status: "Completed" | "Upcoming";
  games: Game[];
};
