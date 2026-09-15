"use client";

import { Fragment, useState } from "react";
import type { Game, Team, WeekData } from "@/lib/nfl-types";

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

function findPreviousGame(week: WeekData | undefined, abbreviation: string): Game | undefined {
  return week?.games.find((game) => game.teams.some((team) => team.abbreviation === abbreviation));
}

function PreviousWeekCard({
  previousWeek,
  abbreviation,
}: {
  previousWeek: WeekData;
  abbreviation: string;
}) {
  const game = findPreviousGame(previousWeek, abbreviation);
  if (!game) {
    return <div className="previous-card empty-previous-card">No Week {previousWeek.number} game found.</div>;
  }

  const teamIndex = game.teams.findIndex((team) => team.abbreviation === abbreviation);
  const opponentIndex = teamIndex === 0 ? 1 : 0;
  const team = game.teams[teamIndex];
  const opponent = game.teams[opponentIndex];

  return (
    <article className="previous-card">
      <div className="previous-card-header">
        <div className="previous-team-title">
          <TeamBadge team={team} />
          <div>
            <strong>{team.name}</strong>
            <span>
              vs {opponent.name} · {displayValue(team.score)}–{displayValue(opponent.score)}
            </span>
          </div>
        </div>
        <span className="previous-week-label">Week {previousWeek.number}</span>
      </div>

      <div className="previous-quarter-grid">
        {game.quarters.map((quarter, quarterIndex) => (
          <div className="previous-quarter" key={`${game.id}-${abbreviation}-q${quarterIndex + 1}`}>
            <strong>Q{quarterIndex + 1}</strong>
            <div>
              {quarter[teamIndex].length
                ? quarter[teamIndex].map((play, playIndex) => (
                    <span key={`${play}-${playIndex}`}>{play}</span>
                  ))
                : <span>—</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="previous-totals">
        <div>
          <span>Offense</span>
          <strong>{displayValue(game.offensivePoints[teamIndex])}</strong>
        </div>
        <div>
          <span>Defense</span>
          <strong>{displayValue(game.defensivePoints[teamIndex])}</strong>
        </div>
      </div>
    </article>
  );
}

export function Dashboard({ weeks }: { weeks: WeekData[] }) {
  const [weekIndex, setWeekIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [expandedComparisons, setExpandedComparisons] = useState<Record<string, boolean>>({});

  const week = weeks[weekIndex];
  const previousWeek = weekIndex > 0 ? weeks[weekIndex - 1] : undefined;
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

          {week.games.map((game) => {
            const canCompare = week.status === "Upcoming" && Boolean(previousWeek);
            const comparisonOpen = Boolean(expandedComparisons[game.id]);

            return (
              <Fragment key={game.id}>
                <div className="tracker-grid game-row">
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

                  <div className="total-box offense-total">
                    {game.offensivePoints.map((points, teamIndex) => (
                      <div className="total-team-block" key={`${game.id}-offense-${teamIndex}`}>
                        {displayValue(points)}
                      </div>
                    ))}
                  </div>
                  <div className="total-box defense-total">
                    {game.defensivePoints.map((points, teamIndex) => (
                      <div className="total-team-block" key={`${game.id}-defense-${teamIndex}`}>
                        {displayValue(points)}
                      </div>
                    ))}
                  </div>
                </div>

                {canCompare && previousWeek && (
                  <div className="comparison-section">
                    <button
                      className="comparison-toggle"
                      type="button"
                      aria-expanded={comparisonOpen}
                      onClick={() =>
                        setExpandedComparisons((current) => ({
                          ...current,
                          [game.id]: !current[game.id],
                        }))
                      }
                    >
                      {comparisonOpen ? "Hide" : "Compare"} Week {previousWeek.number}
                      <span aria-hidden="true">{comparisonOpen ? "▴" : "▾"}</span>
                    </button>

                    {comparisonOpen && (
                      <div className="comparison-panel">
                        {game.teams.map((team) => (
                          <PreviousWeekCard
                            key={`${game.id}-${team.abbreviation}-previous`}
                            previousWeek={previousWeek}
                            abbreviation={team.abbreviation}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </section>

      <footer className="tracker-footer">
        <span>NFL Game Tracker</span>
        <span>Work in progress</span>
        <span>Go Niners ❤️</span>
        <span className="footer-note">Live scores and scoring plays from ESPN.</span>
      </footer>
    </main>
  );
}
