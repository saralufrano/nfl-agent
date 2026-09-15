"use client";

import { Fragment, useEffect, useState } from "react";
import type { Game, Team, WeekData } from "@/lib/nfl-types";

const PICKS_STORAGE_KEY = "nfl-game-tracker-picks-v1";

type PickRecord = {
  teamAbbreviation: string;
  lockedSpread: number;
  week: number;
  pickedAt: string;
};

type PickGrade = "win" | "loss" | "push" | null;

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

function formatSpread(value: number | null) {
  if (value === null) return "—";
  if (value === 0) return "PK";
  return value > 0 ? `+${value}` : `${value}`;
}

function periodLabel(periodIndex: number) {
  return periodIndex === 4 ? "OT" : `Q${periodIndex + 1}`;
}

function gradePick(game: Game, pick: PickRecord | undefined): PickGrade {
  if (!pick || !game.completed) return null;

  const pickedIndex = game.teams.findIndex((team) => team.abbreviation === pick.teamAbbreviation);
  if (pickedIndex === -1) return null;

  const opponentIndex = pickedIndex === 0 ? 1 : 0;
  const pickedScore = game.teams[pickedIndex].score;
  const opponentScore = game.teams[opponentIndex].score;
  if (pickedScore === null || opponentScore === null) return null;

  const adjustedScore = pickedScore + pick.lockedSpread;
  if (adjustedScore > opponentScore) return "win";
  if (adjustedScore < opponentScore) return "loss";
  return "push";
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
        <div>OT</div>
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

        {game.quarters.map((teamPlays, periodIndex) => (
          <div className="quarter-box" key={`${game.id}-${abbreviation}-${periodLabel(periodIndex)}`}>
            {teamPlays.map((plays, teamIndex) => (
              <div className="quarter-team-block" key={`${game.id}-${abbreviation}-${periodLabel(periodIndex)}-team${teamIndex}`}>
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

function InjuryReport({ game }: { game: Game }) {
  return (
    <section className="injury-panel">
      <div className="injury-panel-title">Current injury report</div>
      <div className="injury-grid">
        {game.teams.map((team, teamIndex) => {
          const injuries = game.injuries[teamIndex];
          const visibleInjuries = injuries.slice(0, 8);

          return (
            <div className="injury-team-card" key={`${game.id}-${team.abbreviation}-injuries`}>
              <div className="injury-team-heading">
                <TeamBadge team={team} />
                <strong>{team.name}</strong>
                <span>{injuries.length} listed</span>
              </div>

              {visibleInjuries.length ? (
                <div className="injury-list">
                  {visibleInjuries.map((injury, injuryIndex) => (
                    <div className="injury-line" key={`${injury.player}-${injuryIndex}`}>
                      <div>
                        <strong>{injury.player}</strong>
                        <span className="injury-position">{injury.position}</span>
                      </div>
                      <div className="injury-meta">
                        <span className="injury-status">{injury.status}</span>
                        {injury.detail && <span>{injury.detail}</span>}
                      </div>
                    </div>
                  ))}
                  {injuries.length > visibleInjuries.length && (
                    <div className="injury-more">+{injuries.length - visibleInjuries.length} more on report</div>
                  )}
                </div>
              ) : (
                <div className="injury-empty">No injuries currently listed by ESPN.</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Dashboard({ weeks }: { weeks: WeekData[] }) {
  const [weekIndex, setWeekIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, PickRecord>>({});
  const [expandedComparisons, setExpandedComparisons] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PICKS_STORAGE_KEY);
      if (saved) setPicks(JSON.parse(saved) as Record<string, PickRecord>);
    } catch {
      // A broken browser-storage entry should never block the tracker from loading.
    }
  }, []);

  const week = weeks[weekIndex];
  const previousWeek = weekIndex > 0 ? weeks[weekIndex - 1] : undefined;
  const hasPreviousWeek = weekIndex > 0;
  const hasNextWeek = weekIndex < weeks.length - 1;

  function togglePick(game: Game, team: Team) {
    if (game.completed || team.spread === null) return;

    setPicks((current) => {
      const next = { ...current };
      const existing = current[game.id];

      if (existing?.teamAbbreviation === team.abbreviation) {
        delete next[game.id];
      } else {
        next[game.id] = {
          teamAbbreviation: team.abbreviation,
          lockedSpread: team.spread,
          week: week.number,
          pickedAt: new Date().toISOString(),
        };
      }

      try {
        window.localStorage.setItem(PICKS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Keep the in-memory pick even if browser storage is unavailable.
      }
      return next;
    });
  }

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
            <div>OT</div>
            <div>Total Offensive Points</div>
            <div>Total Defensive Points</div>
          </div>

          {week.games.map((game) => {
            const canCompare = week.status === "Upcoming" && Boolean(previousWeek);
            const comparisonOpen = Boolean(expandedComparisons[game.id]);
            const savedPick = picks[game.id];
            const pickGrade = gradePick(game, savedPick);

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

                  <div className="value-stack spread-stack">
                    {game.teams.map((team) => (
                      <span
                        key={team.abbreviation}
                        title={game.oddsProvider ? `Source: ${game.oddsProvider}` : undefined}
                      >
                        {formatSpread(team.spread)}
                      </span>
                    ))}
                  </div>

                  <div className="value-stack pick-stack">
                    {game.teams.map((team) => {
                      const selected = savedPick?.teamAbbreviation === team.abbreviation;
                      return (
                        <label className="pick-control" key={team.abbreviation}>
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={game.completed || team.spread === null}
                            onChange={() => togglePick(game, team)}
                            aria-label={`${selected ? "Remove pick" : "Pick"} ${team.name} ${formatSpread(team.spread)}`}
                          />
                          {selected && (
                            <span className="pick-detail">
                              Locked {formatSpread(savedPick.lockedSpread)}
                              {pickGrade === "win" && <strong className="pick-result pick-win"> ✓ Win</strong>}
                              {pickGrade === "loss" && <strong className="pick-result pick-loss"> ✕ Loss</strong>}
                              {pickGrade === "push" && <strong className="pick-result pick-push"> • Push</strong>}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {game.quarters.map((teamPlays, periodIndex) => (
                    <div className="quarter-box" key={`${game.id}-${periodLabel(periodIndex)}`}>
                      {teamPlays.map((plays, teamIndex) => (
                        <div className="quarter-team-block" key={`${game.id}-${periodLabel(periodIndex)}-team${teamIndex}`}>
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
                        <InjuryReport game={game} />
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
        <span className="footer-note">Live NFL data + ESPN odds/injuries. Picks are saved in this browser.</span>
      </footer>
    </main>
  );
}
