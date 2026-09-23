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

function formatKickoff(kickoff: string | null | undefined) {
  if (!kickoff) return "Time TBD";

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(kickoff));
  } catch {
    return "Time TBD";
  }
}

function rankLabel(rank: number | null | undefined) {
  return rank ? `#${rank}` : "—";
}

function TeamIdentity({ team }: { team: Team }) {
  return (
    <>
      <TeamBadge team={team} />
      <span style={{ display: "flex", minWidth: 0, flexDirection: "column", gap: 2 }}>
        <strong>{team.name}</strong>
        <span style={{ color: "#66738a", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
          {team.record || "0-0"} · Off {rankLabel(team.offenseRank)} · Def {rankLabel(team.defenseRank)}
        </span>
      </span>
    </>
  );
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

function AvailabilityWatch({ game }: { game: Game }) {
  return (
    <section className="injury-panel">
      <div className="injury-panel-title">Availability Watch</div>
      <div className="injury-grid">
        {game.teams.map((team, teamIndex) => {
          const availability = game.injuries[teamIndex];
          const impactAvailability = availability.filter((item) => item.availabilityRole !== "Depth");
          const visibleAvailability = (impactAvailability.length ? impactAvailability : availability).slice(0, 8);
          const hiddenImpactCount = Math.max(0, impactAvailability.length - visibleAvailability.length);
          const hiddenDepthCount = availability.filter((item) => item.availabilityRole === "Depth").length;
          const hiddenCount = availability.length - visibleAvailability.length;

          return (
            <div className="injury-team-card" key={`${game.id}-${team.abbreviation}-availability`}>
              <div className="injury-team-heading">
                <TeamBadge team={team} />
                <strong>{team.name}</strong>
                <span>{impactAvailability.length} impact / {availability.length} flagged</span>
              </div>

              {visibleAvailability.length ? (
                <div className="injury-list">
                  {visibleAvailability.map((item, itemIndex) => {
                    const roleClass = item.availabilityRole?.toLowerCase() || "roster";
                    return (
                      <div className="injury-line" key={`${item.player}-${itemIndex}`}>
                        <div>
                          <strong>{item.player}</strong>
                          <span className="injury-position">{item.position}</span>
                          <span className={`availability-role availability-role-${roleClass}`}>
                            {item.availabilityRole || "Roster"}
                          </span>
                        </div>
                        <div className="injury-meta">
                          <span className="injury-status">{item.status}</span>
                          {item.detail && <span>{item.detail}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {hiddenCount > 0 && (
                    <div className="injury-more">
                      {hiddenImpactCount > 0 && `+${hiddenImpactCount} more impact player${hiddenImpactCount === 1 ? "" : "s"}`}
                      {hiddenImpactCount > 0 && hiddenDepthCount > 0 && " · "}
                      {hiddenDepthCount > 0 && `+${hiddenDepthCount} depth player${hiddenDepthCount === 1 ? "" : "s"} flagged`}
                    </div>
                  )}
                </div>
              ) : (
                <div className="injury-empty">No current availability concerns listed by Sleeper.</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Dashboard({ weeks }: { weeks: WeekData[] }) {
  const [weekIndex, setWeekIndex] = useState(Math.max(0, weeks.length - 1));
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
    const lockedSpread = team.spread;
    if (game.completed || lockedSpread === null) return;

    setPicks((current) => {
      const next = { ...current };
      const existing = current[game.id];

      if (existing?.teamAbbreviation === team.abbreviation) {
        delete next[game.id];
      } else {
        next[game.id] = {
          teamAbbreviation: team.abbreviation,
          lockedSpread,
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

  const latestWeek = weekIndex === weeks.length - 1;

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
            const weatherText = game.weather?.summary || (game.venue?.indoor ? "Indoor" : "Weather pending");

            return (
              <Fragment key={game.id}>
                <div
                  style={{
                    display: "flex",
                    minWidth: 1645,
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 36px 0",
                    color: "#516078",
                    background: "#fff",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  <span>{formatKickoff(game.kickoff)}</span>
                  {latestWeek && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{weatherText}</span>
                    </>
                  )}
                </div>

                <div className="tracker-grid game-row">
                  <div className="team-stack">
                    {game.teams.map((team) => (
                      <div className="team-line" key={team.abbreviation}>
                        <TeamIdentity team={team} />
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
                        <AvailabilityWatch game={game} />
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
        <span className="footer-note">Live NFL data + ESPN odds + Sleeper availability + Open-Meteo weather. Picks are saved in this browser.</span>
      </footer>
    </main>
  );
}
