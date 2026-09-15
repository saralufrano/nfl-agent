"use client";

import { useState } from "react";

type Team = {
  name: string;
  abbreviation: string;
  score: number;
  spread: string;
  color: string;
};

type Quarter = [string[], string[]];

type Game = {
  id: string;
  teams: [Team, Team];
  quarters: [Quarter, Quarter, Quarter, Quarter];
  offensivePoints: number;
  defensivePoints: number;
};

const games: Game[] = [
  {
    id: "sf-la",
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
    id: "dal-nyg",
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
    id: "kc-bal",
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
];

function TeamBadge({ team }: { team: Team }) {
  return (
    <span className="team-badge" style={{ backgroundColor: team.color }}>
      {team.abbreviation}
    </span>
  );
}

export function Dashboard() {
  const [picks, setPicks] = useState<Record<string, string>>({
    "sf-la": "SF",
    "dal-nyg": "DAL",
  });

  return (
    <main className="tracker-shell">
      <section className="week-card">
        <header className="week-header">
          <button className="week-arrow" type="button" disabled aria-label="Previous week">
            ‹
          </button>
          <h1>Week 1</h1>
          <button className="week-arrow" type="button" disabled aria-label="Next week">
            ›
          </button>
          <div className="completed-pill">✓ Completed</div>
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

          {games.map((game) => (
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
                  <strong key={team.abbreviation}>{team.score}</strong>
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

              <div className="total-box offense-total">{game.offensivePoints}</div>
              <div className="total-box defense-total">{game.defensivePoints}</div>
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
