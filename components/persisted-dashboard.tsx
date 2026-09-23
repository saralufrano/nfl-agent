"use client";

import { useEffect, useRef, useState } from "react";
import { Dashboard } from "@/components/dashboard";
import type { Game, WeekData } from "@/lib/nfl-types";

const PICKS_STORAGE_KEY = "nfl-game-tracker-picks-v1";
const SYNC_INTERVAL_MS = 750;

type PickResult = "win" | "loss" | "push";

type PickRecord = {
  teamAbbreviation: string;
  lockedSpread: number;
  week: number;
  pickedAt: string;
  result?: PickResult | null;
};

type PickMap = Record<string, PickRecord>;

type PicksApiResponse = {
  configured?: boolean;
  picks?: PickMap;
};

function readBrowserPicks(): PickMap {
  try {
    const saved = window.localStorage.getItem(PICKS_STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as PickMap) : {};
  } catch {
    return {};
  }
}

function writeBrowserPicks(picks: PickMap) {
  try {
    window.localStorage.setItem(PICKS_STORAGE_KEY, JSON.stringify(picks));
  } catch {
    // The dashboard can still run in memory if browser storage is unavailable.
  }
}

function gradePick(game: Game, pick: PickRecord): PickResult | null {
  if (!game.completed) return null;

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

function addFinalResults(weeks: WeekData[], picks: PickMap) {
  let changed = false;
  const next: PickMap = { ...picks };

  for (const week of weeks) {
    for (const game of week.games) {
      const pick = next[game.id];
      if (!pick || pick.result) continue;

      const result = gradePick(game, pick);
      if (!result) continue;

      next[game.id] = { ...pick, result };
      changed = true;
    }
  }

  return changed ? next : picks;
}

async function loadDatabasePicks(): Promise<PicksApiResponse> {
  const response = await fetch("/api/picks", { cache: "no-store" });
  if (!response.ok) throw new Error(`Pick database read failed: ${response.status}`);
  return (await response.json()) as PicksApiResponse;
}

async function saveDatabasePicks(picks: PickMap) {
  const response = await fetch("/api/picks", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ picks }),
  });

  if (!response.ok && response.status !== 503) {
    throw new Error(`Pick database write failed: ${response.status}`);
  }

  return response.ok;
}

export function PersistedDashboard({ weeks }: { weeks: WeekData[] }) {
  const [ready, setReady] = useState(false);
  const [databaseConfigured, setDatabaseConfigured] = useState(false);
  const lastSeenBrowserSnapshot = useRef<string>("");
  const syncInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      const browserPicks = addFinalResults(weeks, readBrowserPicks());
      let startingPicks = browserPicks;

      try {
        const database = await loadDatabasePicks();
        if (cancelled) return;

        const configured = Boolean(database.configured);
        setDatabaseConfigured(configured);

        if (configured) {
          const databasePicks = addFinalResults(weeks, database.picks || {});

          // Once the database contains picks, it is the source of truth. If it
          // is empty, seed it from the browser so existing test picks migrate
          // automatically the first time Baby DB is connected.
          if (Object.keys(databasePicks).length > 0) {
            startingPicks = databasePicks;
          } else if (Object.keys(browserPicks).length > 0) {
            startingPicks = browserPicks;
            await saveDatabasePicks(browserPicks);
          }
        }
      } catch {
        // Database trouble should never stop the tracker. Browser storage
        // remains the offline/fallback copy.
      }

      if (cancelled) return;
      writeBrowserPicks(startingPicks);
      lastSeenBrowserSnapshot.current = JSON.stringify(startingPicks);
      setReady(true);
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [weeks]);

  useEffect(() => {
    if (!ready || !databaseConfigured) return;

    const interval = window.setInterval(() => {
      if (syncInFlight.current) return;

      const browserPicks = addFinalResults(weeks, readBrowserPicks());
      const snapshot = JSON.stringify(browserPicks);
      if (snapshot === lastSeenBrowserSnapshot.current) return;

      // Keep the final grade in the browser copy too, so the existing
      // dashboard can display it without knowing anything about the database.
      writeBrowserPicks(browserPicks);
      syncInFlight.current = true;

      void saveDatabasePicks(browserPicks)
        .then((saved) => {
          if (saved) lastSeenBrowserSnapshot.current = snapshot;
        })
        .catch(() => {
          // Retry naturally on the next interval.
        })
        .finally(() => {
          syncInFlight.current = false;
        });
    }, SYNC_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [databaseConfigured, ready, weeks]);

  if (!ready) {
    return <main className="tracker-shell">Loading tracker…</main>;
  }

  return <Dashboard weeks={weeks} />;
}
