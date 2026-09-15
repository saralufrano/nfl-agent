"use client";

import { useState } from "react";

type Team = {
  name: string;
  abbreviation: string;
  score: number | null;
  spread: string;
  color: string;
};

type Quarter = [string[], string[]];

type Game = {
  id: string;
  teams: [Team, Team];
  quarters: [Quarter, Quarter, Quarter, Quarter];
  offensivePoints: number | null;
  defensivePoints: number | null;
};

type WeekData = {
  number: number;
  status: "Completed" | "Upcoming";
  games: Game[];
};

const emptyQuarters: [Quarter, Quarter, Quarter, Quarter] = [
  [[], []],
  [[], []],
  [[], []],
  [[], []],
];

const weeks: WeekData[] = [
  {
    number: 1,
    status: "Completed",
    games: [
      {
        id: "w1-sf-la",
        teams: [
          { name: "49ers", abbreviation: "SF", score: 28, spread: "-3", color: "#aa0000" },
          { name: "Rams", abbreviation: "LA", score: 7, spread: "+3", color: "#003594" },
        ],
        quarters: [
          [["7 Off. TD Pass"], []],
          [["7 Off. TD Run"], ["7 Off. TD Pass"]],
          [["7 Def. TD (INT)"], []],
          [["7 Off. TD Pass"], []],
        ],
        offensivePoints: 28,
        defensivePoints: 7,
      },
      {
        id: "w1-dal-nyg",
        teams: [
          { name: "Cowboys", abbreviation: "DAL", score: 28, spread: "-3", color: "#041e42" },
          { name: "Giants", abbreviation: "NYG", score: 7, spread: "+3", color: "#0b2265" },
        ],
        quarters: [
          [["7 Off. TD Pass"], []],
          [["7 Off. TD Run"], ["7 Off. TD Pass"]],
          [["7 Off. TD Pass"], []],
          [["7 Def. TD (Fum)"], []],
        ],
        offensivePoints: 28,
        defensivePoints: 7,
      },
      {
        id: "w1-kc-bal",
        teams: [
          { name: "Chiefs", abbreviation: "KC", score: 27, spread: "-3", color: "#e31837" },
          { name: "Ravens", abbreviation: "BAL", score: 20, spread: "+3", color: "#241773" },
        ],
        quarters: [
          [["7 Off. TD Pass"], ["7 Off. TD Run"]],
          [["7 Off. TD Run"], ["3 Kick FG"]],
          [["7 Off. TD Pass"], ["7 Off. TD Pass"]],
          [["6 Kick FG ×2"], ["3 Kick FG"]],
        ],
        offensivePoints: 35,
        defensivePoints: 0,
      },
    ],
  },
  {
    number: 2,
    status: "Upcoming",
    games: [
      {
        id: "w2-det-buf",
        teams: [
          { name: "Lions", abbreviation: "DET", score: null, spread: "+3", color: "#0076b6" },
          { name: "Bills", abbreviation: "BUF", score: null, spread: "-3", color: "#00338d" },
        ],
        quarters: emptyQuarters,
        offensivePoints: null,
        defensivePoints: null,
      },
      {
        id: "w2-phi-ten",
        teams: [
          { name: "Eagles", abbreviation: "PHI", score: null, spread: "-4", color: "#004c54" },
          { name: "Titans", abbreviation: "TEN", score: null, spread: "+4", color: "#4b92db" },
        ],
        quarters: emptyQuarters,
        offensivePoints: null,
        defensivePoints: null,
      },
      {
        id: "w2-mia-sf",
        teams: [
          { name: "Dolphins", abbreviation: "MIA", score: null, spread: "+6", color: "#008e97" },
          { name: "49ers", abbreviation: "SF", score: null, spread: "-6", color: "#aa0000" },
        ],
        quarters: emptyQuarters,
        offensivePoints: null,
        defensivePoints: null,
      },
    ],
  },
];

function TeamBadge({ team }: { team: Team }) {
  return (
    <span className="team-badge" style={{ backgroundColor: team.color }}>
      {team.abbreviation}
    </span>
  );
}

function displayValue(value: number | null) {
  return value === null ? "—" : value;
}

export function Dashboard() {
  const [weekIndex, setWeekIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({
    "w1-sf-la": "SF",
    "w1-dal-nyg": "DAL",
  });

  const week = weeks[weekIndex];
  const hasPreviousWeek = weekIndex > 0;
  const hasNextWeek = weekIndex < weeks.length - 1;

  return (
    <main className="tracker-shell">
      <section className="week-card">
        <header className="week-header">
          <button
            className="week-arrow"
            type="button"
            disabled={!hasPreviousWeek}
            onClick={() => hasPreviousWeek && setWeekIndex((current) => current - 1)}
            aria-label="Previous week"
          >
            ‹
          </button>
          <h1>Week {week.number}</h1>
          <button
            className="week-arrow"
            type="button"
            disabled={!hasNextWeek}
            onClick={() => hasNextWeek && setWeekIndex((current) => current + 1)}
            aria-label="Next week"
          >
            ›
          </button>
          <div className={`week-status ${week.status === "Upcoming" ? "upcoming-pill" : "completed-pill"}`}>
            {week.status === "Completed" ? "✓" : "◷"} {week.status}
          </div>
        </header>

        <div className="tracker-scroll">
          <div className="tracker-grid header-row">
            <div>Teams</div>
            <div>Score</div>
            <div>Vegas Line</div>
            <div>Your Pick</div>
            <div>Q1</div>
            <div>Q2</div>
            <div>Q3</div>
            <div>Q4</div>
            <div>Total Offensive Points</div>
            <div>Total Defensive Points</div>
          </div>

          {week.games.map((game) => (
            <div className="tracker-grid game-row" key={game.id}>
              <div className="team-stack">
                {game.teams.map((team) => (
                  <div className="team-line" key={team.abbreviation}>
                    <TeamBadge team={team} />
                    <strong>{team.name}</strong>
                  </div>
                ))}
              </div>

              <div className="value-stack score-stack">
                {game.teams.map((team) => (
                  <strong key={team.abbreviation}>{displayValue(team.score)}</strong>
                ))}
              </div>

              <div className="value-stack">
                {game.teams.map((team) => (
                  <span key={team.abbreviation}>{team.spread}</span>
                ))}
              </div>

              <div className="value-stack pick-stack">
                {game.teams.map((team) => (
                  <label className="pick-control" key={team.abbreviation}>
                    <input
                      type="radio"
                      name={`pick-${game.id}`}
                      checked={picks[game.id] === team.abbreviation}
                      onChange={() => setPicks((current) => ({ ...current, [game.id]: team.abbreviation }))}
                      aria-label={`Pick ${team.name}`}
                    />
                  </label>
                ))}
              </div>

              {game.quarters.map((teamPlays, quarterIndex) => (
                <div className="quarter-box" key={`${game.id}-q${quarterIndex + 1}`}>
                  {teamPlays.map((plays, teamIndex) => (
                    <div className="quarter-team-block" key={`${game.id}-q${quarterIndex + 1}-team${teamIndex}`}>
                      {plays.map((play, playIndex) => (
                        <div className="play-line" key={`${play}-${playIndex}`}>
                          {play}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}

              <div className="total-box offense-total">{displayValue(game.offensivePoints)}</div>
              <div className="total-box defense-total">{displayValue(game.defensivePoints)}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="tracker-footer">
        <span>NFL Game Tracker</span>
        <span>Work in progress</span>
        <span>Go Niners ❤️</span>
        <span className="footer-note">Hardcoded demo data for the first working slice.</span>
      </footer>
    </main>
  );
}
