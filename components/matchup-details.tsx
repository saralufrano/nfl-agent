"use client";

import { useState } from "react";
import type { Game, WeekData } from "@/lib/nfl-types";

export function displayValue(value: number | null | undefined) {
  return value == null ? "—" : value;
}

export function ScoringDetails({ game }: { game: Game }) {
  return (
    <details className="scoring-details">
      <summary>Quarter-by-quarter scoring <span aria-hidden="true">⌄</span></summary>
      <div className="scoring-content">
        <div className="scoring-teams">
          {game.teams.map((team, index) => (
            <section key={team.abbreviation} aria-label={`${team.name} scoring`}>
              <h4>{team.abbreviation}</h4>
              <dl className="point-totals">
                <div><dt>Offensive points</dt><dd>{displayValue(game.offensivePoints[index])}</dd></div>
                <div><dt>Defensive points</dt><dd>{displayValue(game.defensivePoints[index])}</dd></div>
              </dl>
              {game.quarters.map((quarter, period) => (
                <div className="quarter" key={period}>
                  <strong>{period >= 4 ? "OT" : `Q${period + 1}`}</strong>
                  <div>{quarter[index].length ? quarter[index].map((play, playIndex) => <p key={playIndex}>{play}</p>) : "—"}</div>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </details>
  );
}

function PreviousGame({ week, abbreviation }: { week: WeekData; abbreviation: string }) {
  const game = week.games.find(item => item.teams.some(team => team.abbreviation === abbreviation));
  if (!game) return <section className="prior-game"><h4>{abbreviation}</h4><p className="muted">No Week {week.number} game found. This may be a bye.</p></section>;
  const index = game.teams.findIndex(team => team.abbreviation === abbreviation);
  const team = game.teams[index];
  const opponent = game.teams[index === 0 ? 1 : 0];
  const result = game.completed && team.score !== null && opponent.score !== null
    ? team.score > opponent.score ? "Win" : team.score < opponent.score ? "Loss" : "Tie"
    : "Not final";
  return (
    <section className="prior-game" aria-label={`${abbreviation} Week ${week.number} game`}>
      <h4>{abbreviation} {index === 0 ? "at" : "vs."} {opponent.abbreviation}</h4>
      <p className="prior-result">{displayValue(team.score)}–{displayValue(opponent.score)} <span>· {result}</span></p>
      <dl className="point-totals">
        <div><dt>Offensive points</dt><dd>{displayValue(game.offensivePoints[index])}</dd></div>
        <div><dt>Defensive points</dt><dd>{displayValue(game.defensivePoints[index])}</dd></div>
        <div><dt>Opponent offense</dt><dd>{displayValue(game.offensivePoints[index === 0 ? 1 : 0])}</dd></div>
      </dl>
      <ScoringDetails game={game} />
    </section>
  );
}

function AvailabilityWatch({ game }: { game: Game }) {
  return (
    <details className="availability">
      <summary>Availability watch <span aria-hidden="true">⌄</span></summary>
      <div className="availability-grid">
        {game.teams.map((team, index) => {
          const injuries = game.injuries[index];
          const impact = injuries.filter(injury => injury.availabilityRole !== "Depth");
          const visible = (impact.length ? impact : injuries).slice(0, 8);
          const notes = game.availabilityNotes?.[index] || [];
          return (
            <section key={team.abbreviation}>
              <h4>{team.abbreviation} <span className="muted">· {injuries.length} flagged</span></h4>
              {!injuries.length && <p className="muted">No current availability concerns listed.</p>}
              {visible.map((injury, injuryIndex) => (
                <div className="injury-item" key={`${injury.player}-${injuryIndex}`}>
                  <div><strong>{injury.player}</strong> <span className="muted">{injury.position}</span></div>
                  <p>{injury.status} · {injury.availabilityRole || "Roster"}</p>
                  {injury.detail && <p className="muted">{injury.detail}</p>}
                </div>
              ))}
              {injuries.length > visible.length && <details><summary>{injuries.length - visible.length} more flagged players</summary>{injuries.filter(injury => !visible.includes(injury)).map((injury, injuryIndex) => <p key={injuryIndex}>{injury.player} · {injury.position} · {injury.status}</p>)}</details>}
              {notes.map((note, noteIndex) => <p key={noteIndex}>{note.headline}{note.detail ? ` · ${note.detail}` : ""}</p>)}
            </section>
          );
        })}
      </div>
    </details>
  );
}

export function MatchupDetails({ game, earlierWeeks, showAvailability }: { game: Game; earlierWeeks: WeekData[]; showAvailability: boolean }) {
  const [compareNumber, setCompareNumber] = useState(earlierWeeks.at(-1)?.number);
  const comparison = earlierWeeks.find(week => week.number === compareNumber) || earlierWeeks.at(-1);
  return (
    <details className="matchup-details" open={!game.completed}>
      <summary>Compare teams <span aria-hidden="true">⌄</span></summary>
      <div className="matchup-content">
        {comparison ? (
          <>
            <label className="compare-week">Earlier matchup
              <select value={comparison.number} onChange={event => setCompareNumber(Number(event.target.value))} aria-label={`Comparison week for ${game.teams[0].abbreviation} at ${game.teams[1].abbreviation}`}>
                {[...earlierWeeks].reverse().map(week => <option value={week.number} key={week.number}>Week {week.number}</option>)}
              </select>
            </label>
            <div className="prior-grid">{game.teams.map(team => <PreviousGame key={`${comparison.number}-${team.abbreviation}`} week={comparison} abbreviation={team.abbreviation} />)}</div>
          </>
        ) : <p className="muted">No earlier weeks are loaded for this matchup yet.</p>}
        {showAvailability && <AvailabilityWatch game={game} />}
      </div>
    </details>
  );
}
