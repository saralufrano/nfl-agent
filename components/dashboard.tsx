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

function PreviousWeekGame({
  previousWeek,
  abbreviation,
}: {
  previousWeek: WeekData;
  abbreviation: string;
}) {
  const game = findPreviousGame(previousWeek, abbreviation);

  if (!game) {
    return <div className="comparison-missing">No Week {previousWeek.number} game found for {abbreviation}.</div>;
  }

  return (
    <article className="comparison-game">
      <div className="comparison-caption">
        <strong>{abbreviation}&apos;s Week {previousWeek.number} game</strong>
      </div>

      <div className="comparison-grid comparison-header">
        <div>Teams</div>
        <div>Score</div>
        <div>Q1</div>
        <div>Q2</div>
        <div>Q3</div>
        <div>Q4</div>
        <div>Offensive Points</div>
        <div>Defensive Points</div>
      </div>

      <div className="comparison-grid comparison-row">
        <div className="team-stack">
          {game.teams.map((team) => (
            <div
              className={`team-line ${team.abbreviation === abbreviation ? "comparison-team-focus" : ""}`}
              key={team.abbreviation}
            >
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

        {game.quarters.map((teamPlays, quarterIndex) => (
          <div className="quarter-box" key={`${game.id}-${abbreviation}-q${quarterIndex + 1}`}>
            {teamPlays.map((plays, teamIndex) => (
              <div className="quarter-team-block" key={`${game.id}-${abbreviation}-q${quarterIndex + 1}-team${teamIndex}`}>
                {plays.length ? (
                  plays.map((play, playIndex) => (
                    <div className="play-line" key={`${play}-${playIndex}`}>
                      {play}
                    </div>
                  ))
                ) : (
                  <div className="play-line">—</div>
                )}
              </div>
            ))}
          </div>
        ))}

        <div className="total-box offense-total">
          {game.offensivePoints.map((points, teamIndex) => (
            <div className="total-team-block" key={`${game.id}-${abbreviation}-offense-${teamIndex}`}>
              {displayValue(points)}
            </div>
          ))}
        </div>

        <div className="total-box defense-total">
          {game.defensivePoints.map((points, teamIndex) => (
            <div className="total-team-block" key={`${game.id}-${abbreviation}-defense-${teamIndex}`}>
              {displayValue(points)}
            </div>
          ))}
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
                  <div className="comparison-drawer">
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
                      <div>
                        <div className="comparison-drawer-title">
                          How each team did against its Week {previousWeek.number} opponent
                        </div>
                        {game.teams.map((team) => (
                          <PreviousWeekGame
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
