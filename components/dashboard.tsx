"use client";

import { useState } from "react";
import type { Team, WeekData } from "@/lib/nfl-types";

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

export function Dashboard({ weeks }: { weeks: WeekData[] }) {
  const [weekIndex, setWeekIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});

  const week = weeks[weekIndex];
  const hasPreviousWeek = weekIndex > 0;
  const hasNextWeek = weekIndex < weeks.length - 1;

  if (!week) {
    return <main className="tracker-shell">No NFL data available.</main>;
  }

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
        <span className="footer-note">Scores and quarter totals from ESPN. Scoring classification next.</span>
      </footer>
    </main>
  );
}
