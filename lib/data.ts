import type { DashboardData } from "./types";

// Demo provider. Swap this function's implementation for an API-backed provider later;
// components only depend on the normalized DashboardData contract.
export function getDashboardData(): DashboardData {
  const sf = { id: "sf", city: "San Francisco", name: "49ers", abbreviation: "SF", record: "8–4", color: "#aa0000" };
  const chi = { id: "chi", city: "Chicago", name: "Bears", abbreviation: "CHI", record: "7–5", color: "#c83803" };
  const buf = { id: "buf", city: "Buffalo", name: "Bills", abbreviation: "BUF", record: "9–3", color: "#00338d" };
  const lac = { id: "lac", city: "Los Angeles", name: "Chargers", abbreviation: "LAC", record: "8–4", color: "#0073cf" };
  const phi = { id: "phi", city: "Philadelphia", name: "Eagles", abbreviation: "PHI", record: "10–2", color: "#006c66" };
  const bal = { id: "bal", city: "Baltimore", name: "Ravens", abbreviation: "BAL", record: "8–5", color: "#241773" };
  const gb = { id: "gb", city: "Green Bay", name: "Packers", abbreviation: "GB", record: "9–3", color: "#203731" };
  const den = { id: "den", city: "Denver", name: "Broncos", abbreviation: "DEN", record: "7–5", color: "#fb4f14" };

  return {
    weekLabel: "Week 14",
    dateLabel: "Sunday, December 7",
    games: [
      {
        id: "sf-chi", pinned: true, kickoff: "1:00 PM", status: "UPCOMING", network: "FOX", venue: "Levi’s Stadium",
        away: chi, home: sf, awayScore: null, homeScore: null,
        stats: {
          season: { away: { pointsFor: 24.3, pointsAgainst: 20.8, passingYards: 218.6, rushingYards: 126.4, turnovers: 1.1, sacks: 2.5 }, home: { pointsFor: 28.1, pointsAgainst: 19.6, passingYards: 262.4, rushingYards: 142.8, turnovers: 0.9, sacks: 3.2 } },
          lastFive: { away: { pointsFor: 26.8, pointsAgainst: 18.4, passingYards: 231.2, rushingYards: 139.6, turnovers: 0.8, sacks: 3.0 }, home: { pointsFor: 30.4, pointsAgainst: 17.8, passingYards: 276.8, rushingYards: 151.2, turnovers: 0.6, sacks: 3.8 } },
        },
        injuries: {
          away: [{ player: "D. Moore", position: "WR", status: "Questionable", reportDate: "Dec 5" }, { player: "T. Smith", position: "LB", status: "Out", reportDate: "Dec 5" }],
          home: [{ player: "T. Williams", position: "OT", status: "Questionable", reportDate: "Dec 5" }, { player: "D. Greenlaw", position: "LB", status: "Out", reportDate: "Dec 4" }, { player: "J. Jennings", position: "WR", status: "Questionable", reportDate: "Dec 5" }],
        },
      },
      {
        id: "buf-lac", kickoff: "1:00 PM", status: "UPCOMING", network: "CBS", venue: "SoFi Stadium", away: buf, home: lac, awayScore: null, homeScore: null,
        stats: { season: { away: { pointsFor: 29.2, pointsAgainst: 21.5, passingYards: 249.3, rushingYards: 130.2, turnovers: 0.8, sacks: 2.8 }, home: { pointsFor: 25.1, pointsAgainst: 19.4, passingYards: 241.7, rushingYards: 112.4, turnovers: 1.0, sacks: 3.1 } }, lastFive: { away: { pointsFor: 31.4, pointsAgainst: 20.2, passingYards: 258.6, rushingYards: 141.0, turnovers: 0.6, sacks: 3.2 }, home: { pointsFor: 27.2, pointsAgainst: 18.0, passingYards: 254.4, rushingYards: null, turnovers: 0.8, sacks: 3.6 } } },
        injuries: { away: [{ player: "D. Knox", position: "TE", status: "Questionable", reportDate: "Dec 5" }], home: [{ player: "J. Palmer", position: "WR", status: "Doubtful", reportDate: "Dec 5" }] },
      },
      {
        id: "phi-bal", kickoff: "4:25 PM", status: "UPCOMING", network: "CBS", venue: "M&T Bank Stadium", away: phi, home: bal, awayScore: null, homeScore: null,
        stats: { season: { away: { pointsFor: 27.6, pointsAgainst: 18.8, passingYards: 228.1, rushingYards: 154.2, turnovers: 0.7, sacks: 3.4 }, home: { pointsFor: 29.4, pointsAgainst: 22.1, passingYards: 237.2, rushingYards: 168.7, turnovers: 1.0, sacks: 3.0 } }, lastFive: { away: { pointsFor: 29.8, pointsAgainst: 16.6, passingYards: 235.0, rushingYards: 161.4, turnovers: 0.4, sacks: 4.0 }, home: { pointsFor: 30.2, pointsAgainst: 23.4, passingYards: 244.8, rushingYards: 172.2, turnovers: 1.2, sacks: 2.6 } } },
        injuries: { away: [{ player: "D. Goedert", position: "TE", status: "Questionable", reportDate: "Dec 5" }], home: [{ player: "K. Mitchell", position: "RB", status: "IR", reportDate: "Dec 3" }] },
      },
      {
        id: "gb-den", kickoff: "FINAL", status: "FINAL", network: "NFLN", venue: "Empower Field", away: gb, home: den, awayScore: 27, homeScore: 23,
        stats: { season: { away: { pointsFor: 26.2, pointsAgainst: 20.4, passingYards: 246.0, rushingYards: 133.5, turnovers: 0.9, sacks: 2.7 }, home: { pointsFor: 23.8, pointsAgainst: 21.2, passingYards: 221.6, rushingYards: 119.3, turnovers: 1.1, sacks: 3.3 } }, lastFive: { away: { pointsFor: 28.6, pointsAgainst: 19.8, passingYards: 259.2, rushingYards: 140.6, turnovers: 0.8, sacks: 3.0 }, home: { pointsFor: 25.4, pointsAgainst: 18.6, passingYards: 230.4, rushingYards: 127.8, turnovers: 0.8, sacks: 3.8 } } },
        injuries: { away: [], home: [{ player: "P. Surtain II", position: "CB", status: "Questionable", reportDate: "Dec 5" }] },
      },
    ],
  };
}
