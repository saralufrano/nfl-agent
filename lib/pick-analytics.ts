import type { Game, WeekData } from "./nfl-types";

export type PickRecord = {
  teamAbbreviation: string;
  lockedSpread: number;
  week: number;
  pickedAt: string;
  result?: "win" | "loss" | "push" | null;
  note?: string;
  reasons?: import("./pick-storage").PickReason[];
};

export type PickGrade = "win" | "loss" | "push" | null;
export type PickSummary = { wins: number; losses: number; pushes: number };

export function gradePick(game: Game, pick: PickRecord | undefined): PickGrade {
  if (!pick || !game.completed || !Number.isFinite(pick.lockedSpread)) return null;
  const pickedIndex = game.teams.findIndex((team) => team.abbreviation === pick.teamAbbreviation);
  if (pickedIndex === -1) return null;
  const pickedScore = game.teams[pickedIndex].score;
  const opponentScore = game.teams[pickedIndex === 0 ? 1 : 0].score;
  if (typeof pickedScore !== "number" || !Number.isFinite(pickedScore) ||
      typeof opponentScore !== "number" || !Number.isFinite(opponentScore)) return null;
  const margin = pickedScore + pick.lockedSpread - opponentScore;
  return margin > 0 ? "win" : margin < 0 ? "loss" : "push";
}

export function summarizePicks(weeks: WeekData[], picks: Record<string, PickRecord>) {
  const empty = (): PickSummary => ({ wins: 0, losses: 0, pushes: 0 });
  const summary = { season: empty(), favorites: empty(), underdogs: empty(), home: empty(), away: empty() };
  const seen = new Set<string>();
  for (const week of weeks) {
    for (const game of week.games) {
      if (seen.has(game.id)) continue;
      seen.add(game.id);
      const pick = picks[game.id];
      const grade = gradePick(game, pick);
      if (!grade) continue;
      const key = grade === "win" ? "wins" : grade === "loss" ? "losses" : "pushes";
      summary.season[key] += 1;
      // ESPN normalization stores away first and home second.
      const side = game.teams[0].abbreviation === pick.teamAbbreviation ? "away" : "home";
      summary[side][key] += 1;
      if (pick.lockedSpread < 0) summary.favorites[key] += 1;
      if (pick.lockedSpread > 0) summary.underdogs[key] += 1;
    }
  }
  return summary;
}

export function hitRate(summary: PickSummary) {
  const decisions = summary.wins + summary.losses;
  return decisions ? `${((summary.wins / decisions) * 100).toFixed(1)}%` : "—";
}

export function formatRecord(summary: PickSummary) {
  return `${summary.wins}–${summary.losses}–${summary.pushes}`;
}
