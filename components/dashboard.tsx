"use client";

import { useEffect, useState } from "react";
import type { Game, Team, WeekData } from "@/lib/nfl-types";
import { formatRecord, gradePick, hitRate, summarizePicks, type PickRecord } from "@/lib/pick-analytics";
import { MAX_PICK_NOTE_LENGTH, PICK_REASONS, sanitizePicks, type PickReason } from "@/lib/pick-storage";
import { displayValue, MatchupDetails, ScoringDetails } from "@/components/matchup-details";

const PICKS_STORAGE_KEY = "nfl-game-tracker-picks-v1";

function formatSpread(value: number | null) {
  if (value === null) return "—";
  return value === 0 ? "PK" : value > 0 ? `+${value}` : `${value}`;
}

function formatKickoff(kickoff?: string | null) {
  if (!kickoff) return "Time TBD";
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(kickoff));
  } catch { return "Time TBD"; }
}

function PickNotes({ game, pick, onChange }: { game: Game; pick: PickRecord | undefined; onChange: (changes: Partial<PickRecord>) => void }) {
  function toggleReason(reason: PickReason) {
    if (!pick || game.completed) return;
    const current = pick.reasons || [];
    onChange({ reasons: current.includes(reason) ? current.filter(item => item !== reason) : [...current, reason] });
  }
  return (
    <details className="pick-notes">
      <summary>Why this pick? <span className="summary-hint">{pick?.note || pick?.reasons?.length ? "Note added" : "Optional"}</span><span aria-hidden="true">⌄</span></summary>
      <div className="notes-content">
        <div>
          <div className="reason-tags" role="group" aria-label="Pick reasons">
            {PICK_REASONS.map(reason => <button type="button" key={reason} disabled={!pick || game.completed} aria-pressed={pick?.reasons?.includes(reason) || false} onClick={() => toggleReason(reason)}>{reason}</button>)}
          </div>
          <p className="muted note-help">{!pick ? "Pick a team to add your reason." : game.completed ? "Your thinking when you made this pick." : "Keep your thinking with your pick, before the result."}</p>
        </div>
        <label className="note-label">Your note
          <textarea value={pick?.note || ""} disabled={!pick || game.completed} maxLength={MAX_PICK_NOTE_LENGTH} onChange={event => onChange({ note: event.target.value })} placeholder="What’s making you lean this way?" aria-label={`Reason for ${game.teams[0].abbreviation} at ${game.teams[1].abbreviation} pick`} />
          <span className="muted note-count">{pick?.note?.length || 0}/{MAX_PICK_NOTE_LENGTH} · Saved with your pick</span>
        </label>
      </div>
    </details>
  );
}

export function Dashboard({ weeks }: { weeks: WeekData[] }) {
  const [weekIndex, setWeekIndex] = useState(Math.max(0, weeks.length - 1));
  const [picks, setPicks] = useState<Record<string, PickRecord>>({});
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PICKS_STORAGE_KEY);
      if (saved) setPicks(sanitizePicks(JSON.parse(saved)) || {});
    } catch { /* Browser storage may be unavailable. */ }
  }, []);

  function updatePicks(update: (current: Record<string, PickRecord>) => Record<string, PickRecord>) {
    setPicks(current => {
      const next = update(current);
      try { window.localStorage.setItem(PICKS_STORAGE_KEY, JSON.stringify(next)); } catch { /* Keep the in-memory copy. */ }
      return next;
    });
  }

  const week = weeks[weekIndex];
  if (!week) return <main className="tracker-shell">No NFL data available.</main>;
  const analytics = summarizePicks(weeks, picks);
  const gradedCount = analytics.season.wins + analytics.season.losses + analytics.season.pushes;
  const games = [...week.games].sort((a, b) => Number(a.completed) - Number(b.completed));
  const upcomingCount = week.games.filter(game => !game.completed).length;

  function togglePick(game: Game, team: Team) {
    if (game.completed || team.spread === null) return;
    const lockedSpread = team.spread;
    updatePicks(current => {
      const next = { ...current };
      const existing = current[game.id];
      if (existing?.teamAbbreviation === team.abbreviation) delete next[game.id];
      else next[game.id] = { teamAbbreviation: team.abbreviation, lockedSpread, week: week.number, pickedAt: new Date().toISOString(), note: existing?.note, reasons: existing?.reasons };
      return next;
    });
  }

  function updateNote(game: Game, changes: Partial<PickRecord>) {
    if (game.completed) return;
    updatePicks(current => current[game.id] ? { ...current, [game.id]: { ...current[game.id], ...changes } } : current);
  }

  return (
    <main className="tracker-shell">
      <header className="app-header">
        <div className="brand"><span className="brand-mark" aria-hidden="true">🏈</span><div><p className="brand-title">NFL Game Tracker</p><p className="brand-subtitle">Your picks. Your playbook.</p></div></div>
        <nav className="week-nav" aria-label="Choose a week">
          <button className="week-arrow" type="button" disabled={weekIndex === 0} onClick={() => setWeekIndex(index => index - 1)} aria-label="Previous week">‹</button>
          <div><h1>Week {week.number}</h1><p>{upcomingCount ? `${upcomingCount} ${upcomingCount === 1 ? "game" : "games"} left` : "All games final"} · Pacific time</p></div>
          <button className="week-arrow" type="button" disabled={weekIndex === weeks.length - 1} onClick={() => setWeekIndex(index => index + 1)} aria-label="Next week">›</button>
        </nav>
      </header>
      <details className="season-summary">
        <summary>
          <span><span className="eyebrow">Your season</span><strong>{formatRecord(analytics.season)}</strong></span>
          <span className="season-rate"><strong>{hitRate(analytics.season)}</strong><span>Against the spread <span aria-hidden="true">⌄</span></span></span>
        </summary>
        <div className="analytics-content">
          <h2>Your season · Analytics</h2>
          <dl className="analytics-grid">
            {([["favorites", "Favorites"], ["underdogs", "Underdogs"], ["home", "Home"], ["away", "Away"]] as const).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{formatRecord(analytics[key])}</dd><span>{hitRate(analytics[key])} ATS</span></div>)}
          </dl>
          <p className="muted">{gradedCount} graded picks · Records are wins–losses–pushes. All loaded season weeks, using final scores and your locked spreads. Pushes excluded from hit rates. Pick’em selections count in season and home/away records only.</p>
        </div>
      </details>
      <section className="game-list" aria-label={`Week ${week.number} games`}>
        {games.map((game, gameIndex) => {
          const pick = picks[game.id];
          const grade = gradePick(game, pick);
          const showGroup = gameIndex === 0 || game.completed !== games[gameIndex - 1].completed;
          return (
            <div key={game.id}>
              {showGroup && <h2 className="game-group-heading">{game.completed ? "Final scores" : "Up next"}<span>Week {week.number}</span></h2>}
              <article className={`game-card ${game.completed ? "game-final" : ""}`} aria-label={`${game.teams[0].name} at ${game.teams[1].name}`}>
                <div className="game-overview">
                  <div className="game-meta"><span>{formatKickoff(game.kickoff)}</span><span className={`status-pill ${game.completed ? "final-pill" : ""}`}>{game.completed ? "Final" : "Upcoming"}</span></div>
                  {weekIndex === weeks.length - 1 && <p className="weather">{game.weather?.summary || (game.venue?.indoor ? "Indoor" : "Weather pending")}</p>}
                  <div className="team-column-labels"><span>Matchup</span><span>Score</span><span>Spread</span></div>
                  {game.teams.map((team, index) => <div className="team-row" key={team.abbreviation}>
                    <span className="team-badge" style={{ backgroundColor: team.color }}>{team.abbreviation}</span>
                    <div className="team-identity"><strong>{team.name}</strong><span>{team.record || "—"} · {index === 0 ? "Away" : "Home"}</span><span>Off {team.offenseRank ? `#${team.offenseRank}` : "—"} · Def {team.defenseRank ? `#${team.defenseRank}` : "—"}</span></div>
                    <strong className="team-score">{displayValue(team.score)}</strong><span className="team-spread">{formatSpread(team.spread)}</span>
                  </div>)}
                  {!game.completed && <div className="pick-buttons" role="group" aria-label="Choose your pick">
                    {game.teams.map(team => {
                      const selected = pick?.teamAbbreviation === team.abbreviation;
                      return <button key={team.abbreviation} type="button" disabled={game.completed || team.spread === null} aria-pressed={selected} onClick={() => togglePick(game, team)}>{selected ? "✓ " : ""}{selected ? "Picked" : "Pick"} {team.abbreviation} {formatSpread(selected ? pick.lockedSpread : team.spread)}</button>;
                    })}
                  </div>}
                  <p className="pick-status" aria-live="polite">
                    {pick ? <>Your pick: <strong>{pick.teamAbbreviation} · Locked {formatSpread(pick.lockedSpread)}</strong>{grade && <span className={`pick-result pick-${grade}`}>{grade === "win" ? "✓ Win" : grade === "loss" ? "✕ Loss" : "• Push"}</span>}</> : game.completed ? "No pick recorded." : "Choose a team to lock your spread."}
                  </p>
                  {game.oddsProvider && <p className="odds-source">Current line: {game.oddsProvider}</p>}
                </div>
                <MatchupDetails game={game} earlierWeeks={weeks.slice(0, weekIndex)} showAvailability={weekIndex === weeks.length - 1} />
                <PickNotes game={game} pick={pick} onChange={changes => updateNote(game, changes)} />
                <ScoringDetails game={game} />
              </article>
            </div>
          );
        })}
      </section>
      <footer className="tracker-footer"><span>Go Niners ❤️</span><span>ESPN game data & odds · Sleeper availability · Open-Meteo weather</span><span>Picks and notes stay together, with a browser backup.</span></footer>
    </main>
  );
}
