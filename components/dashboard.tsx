"use client";

import { useMemo, useState } from "react";
import type { DashboardData, Game, Injury, TeamStats } from "@/lib/types";

const metrics: { key: keyof TeamStats; label: string; hint: string; lower?: boolean }[] = [
  { key: "pointsFor", label: "Points scored", hint: "PPG" },
  { key: "pointsAgainst", label: "Points allowed", hint: "PAPG", lower: true },
  { key: "passingYards", label: "Passing yards", hint: "PER GAME" },
  { key: "rushingYards", label: "Rushing yards", hint: "PER GAME" },
  { key: "turnovers", label: "Turnovers", hint: "PER GAME", lower: true },
  { key: "sacks", label: "Sacks", hint: "PER GAME" },
];

function TeamMark({ abbreviation, color, small = false }: { abbreviation: string; color: string; small?: boolean }) {
  return <span className={`team-mark ${small ? "small" : ""}`} style={{ "--team": color } as React.CSSProperties}>{abbreviation}</span>;
}

function GameCard({ game, active, onClick }: { game: Game; active: boolean; onClick: () => void }) {
  const score = game.status === "FINAL";
  return (
    <button className={`game-card ${active ? "active" : ""}`} onClick={onClick} aria-pressed={active}>
      <div className="game-topline">
        <span className={score ? "final" : "upcoming"}>{game.status}</span>
        <span>{score ? "Completed" : game.kickoff} · {game.network}</span>
        {game.pinned && <span className="pinned">★ YOUR TEAM</span>}
      </div>
      {[game.away, game.home].map((team, index) => (
        <div className="team-row" key={team.id}>
          <TeamMark abbreviation={team.abbreviation} color={team.color} small />
          <span className="team-card-name">{team.city} <strong>{team.name}</strong></span>
          <span className="record">{team.record}</span>
          <strong className="score">{score ? (index === 0 ? game.awayScore : game.homeScore) : "—"}</strong>
        </div>
      ))}
      <div className="card-footer"><span>{game.venue}</span><span>View matchup <b>›</b></span></div>
    </button>
  );
}

function StatValue({ value, winner }: { value: number | null; winner: boolean }) {
  return <div className={`stat-value ${winner ? "winner" : ""}`}>{value === null ? <span className="na">N/A</span> : value.toFixed(1)}</div>;
}

function InjuryRows({ injuries, team }: { injuries: Injury[]; team: Game["home"] }) {
  if (!injuries.length) return <div className="no-injuries">No players currently listed.</div>;
  return <div className="injury-list">{injuries.map((injury) => (
    <div className="injury-row" key={injury.player}>
      <div><strong>{injury.player}</strong><span>{injury.position} · {team.abbreviation}</span></div>
      <span className={`status ${injury.status.toLowerCase()}`}>{injury.status}</span>
      <time>{injury.reportDate}</time>
    </div>
  ))}</div>;
}

export function Dashboard({ initialData }: { initialData: DashboardData }) {
  const [activeId, setActiveId] = useState(initialData.games[0].id);
  const [range, setRange] = useState<"season" | "lastFive">("season");
  const active = useMemo(() => initialData.games.find((game) => game.id === activeId) ?? initialData.games[0], [activeId, initialData.games]);
  const stats = active.stats[range];

  return <main>
    <header className="site-header">
      <div className="brand"><span className="brand-shield">RZ</span><span>RED ZONE<small>PERSONAL NFL DESK</small></span></div>
      <div className="demo-pill"><i /> DEMO DATA <span>·</span> NO LIVE FEED</div>
      <div className="week"><small>2025 REGULAR SEASON</small><strong>{initialData.weekLabel}</strong></div>
    </header>

    <section className="intro">
      <div><p className="eyebrow">MATCHUP CENTER</p><h1>Sunday slate</h1><p>{initialData.dateLabel} <span>·</span> All times PT</p></div>
      <div className="live-note"><span>{initialData.games.length}</span> games on your board</div>
    </section>

    <div className="workspace">
      <aside className="slate">
        <div className="section-title"><div><span>GAMES</span><small>Select a matchup</small></div><span className="count">{initialData.games.length}</span></div>
        <div className="game-list">{initialData.games.map(game => <GameCard key={game.id} game={game} active={active.id === game.id} onClick={() => setActiveId(game.id)} />)}</div>
      </aside>

      <section className="detail" aria-live="polite">
        <div className="matchup-head">
          <div className="matchup-team"><TeamMark abbreviation={active.away.abbreviation} color={active.away.color} /><div><small>{active.away.city}</small><strong>{active.away.name}</strong><span>{active.away.record}</span></div></div>
          <div className="versus"><span>{active.status === "FINAL" ? "FINAL" : active.kickoff}</span><b>VS</b><small>{active.network}</small></div>
          <div className="matchup-team home"><TeamMark abbreviation={active.home.abbreviation} color={active.home.color} /><div><small>{active.home.city}</small><strong>{active.home.name}</strong><span>{active.home.record}</span></div></div>
        </div>

        <div className="comparison-bar">
          <div><p className="eyebrow">TEAM COMPARISON</p><small>Offense & defense at a glance</small></div>
          <div className="toggle" aria-label="Comparison period">
            <button type="button" aria-pressed={range === "season"} className={range === "season" ? "selected" : ""} onClick={() => setRange("season")}>Season avg.</button>
            <button type="button" aria-pressed={range === "lastFive"} className={range === "lastFive" ? "selected" : ""} onClick={() => setRange("lastFive")}>Last 5 games</button>
          </div>
        </div>

        <div className="stats-table">
          <div className="stats-heading"><strong>{active.away.abbreviation}</strong><span>League comparison</span><strong>{active.home.abbreviation}</strong></div>
          {metrics.map(metric => {
            const away = stats.away[metric.key], home = stats.home[metric.key];
            const awayWins = away !== null && home !== null && (metric.lower ? away < home : away > home);
            const homeWins = away !== null && home !== null && (metric.lower ? home < away : home > away);
            return <div className="stat-row" key={metric.key}>
              <StatValue value={away} winner={awayWins} />
              <div className="metric"><strong>{metric.label}</strong><small>{metric.hint}</small></div>
              <StatValue value={home} winner={homeWins} />
            </div>;
          })}
          <p className="unavailable-note">N/A indicates that the stat is unavailable in the current data set.</p>
        </div>

        <section className="injuries">
          <div className="injury-heading"><div><p className="eyebrow">INJURY REPORT</p><small>Latest reported player availability</small></div><span>Updated Dec 5, 4:30 PM</span></div>
          <div className="injury-grid">
            <div><h3><TeamMark abbreviation={active.away.abbreviation} color={active.away.color} small /> {active.away.name}</h3><div className="column-labels"><span>PLAYER</span><span>STATUS</span><span>REPORT</span></div><InjuryRows injuries={active.injuries.away} team={active.away} /></div>
            <div><h3><TeamMark abbreviation={active.home.abbreviation} color={active.home.color} small /> {active.home.name}</h3><div className="column-labels"><span>PLAYER</span><span>STATUS</span><span>REPORT</span></div><InjuryRows injuries={active.injuries.home} team={active.home} /></div>
          </div>
        </section>
      </section>
    </div>
    <footer><span>RED ZONE · PERSONAL NFL DESK</span><span>Demo statistics for interface preview only</span></footer>
  </main>;
}
