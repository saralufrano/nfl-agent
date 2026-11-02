import type { PickRecord } from "./pick-analytics";

export const PICK_REASONS = ["Defense", "Injuries", "Matchup", "Gut feeling"] as const;
export type PickReason = (typeof PICK_REASONS)[number];
export const MAX_PICK_NOTE_LENGTH = 500;
const MAX_PICKS = 100;

export function sanitizePicks(value: unknown): Record<string, PickRecord> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > MAX_PICKS) return null;
  const clean: Record<string, PickRecord> = {};
  for (const [gameId, value] of entries) {
    if (!gameId || gameId.length > 100 || !value || typeof value !== "object" || Array.isArray(value)) return null;
    const pick = value as PickRecord;
    if (typeof pick.teamAbbreviation !== "string" || pick.teamAbbreviation.length < 2 || pick.teamAbbreviation.length > 4 ||
        typeof pick.lockedSpread !== "number" || !Number.isFinite(pick.lockedSpread) ||
        !Number.isInteger(pick.week) || pick.week < 1 || pick.week > 25 || typeof pick.pickedAt !== "string" ||
        (pick.result != null && !["win", "loss", "push"].includes(pick.result)) ||
        (pick.note !== undefined && (typeof pick.note !== "string" || pick.note.length > MAX_PICK_NOTE_LENGTH)) ||
        (pick.reasons !== undefined && (!Array.isArray(pick.reasons) || pick.reasons.length > PICK_REASONS.length ||
          !pick.reasons.every(reason => PICK_REASONS.includes(reason))))) return null;
    clean[gameId] = pick;
  }
  return clean;
}
