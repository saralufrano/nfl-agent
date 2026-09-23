import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PICKS_KEY = "nfl-game-tracker:picks:v1";
const MAX_PICKS = 100;

type StoredPick = {
  teamAbbreviation: string;
  lockedSpread: number;
  week: number;
  pickedAt: string;
  result?: "win" | "loss" | "push" | null;
};

type StoredPicks = Record<string, StoredPick>;

type RedisResponse<T> = {
  result?: T;
  error?: string;
};

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function redisCommand<T>(command: unknown[]): Promise<T> {
  const config = redisConfig();
  if (!config) throw new Error("Redis is not configured");

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Redis request failed: ${response.status}`);
  }

  const payload = (await response.json()) as RedisResponse<T>;
  if (payload.error) throw new Error(payload.error);
  return payload.result as T;
}

function isStoredPick(value: unknown): value is StoredPick {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const pick = value as Partial<StoredPick>;

  return (
    typeof pick.teamAbbreviation === "string" &&
    pick.teamAbbreviation.length >= 2 &&
    pick.teamAbbreviation.length <= 4 &&
    typeof pick.lockedSpread === "number" &&
    Number.isFinite(pick.lockedSpread) &&
    typeof pick.week === "number" &&
    Number.isInteger(pick.week) &&
    pick.week >= 1 &&
    pick.week <= 25 &&
    typeof pick.pickedAt === "string" &&
    (!pick.result || ["win", "loss", "push"].includes(pick.result))
  );
}

function sanitizePicks(value: unknown): StoredPicks | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_PICKS) return null;

  const clean: StoredPicks = {};
  for (const [gameId, pick] of entries) {
    if (!gameId || gameId.length > 100 || !isStoredPick(pick)) return null;
    clean[gameId] = pick;
  }

  return clean;
}

export async function GET() {
  if (!redisConfig()) {
    return NextResponse.json({ configured: false, picks: {} });
  }

  try {
    const stored = await redisCommand<string | null>(["GET", PICKS_KEY]);
    if (!stored) return NextResponse.json({ configured: true, picks: {} });

    const picks = sanitizePicks(JSON.parse(stored));
    return NextResponse.json({ configured: true, picks: picks || {} });
  } catch (error) {
    console.error("Could not read persisted picks", error);
    return NextResponse.json({ configured: true, picks: {}, error: "read_failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!redisConfig()) {
    return NextResponse.json({ configured: false, saved: false }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { picks?: unknown };
    const picks = sanitizePicks(body.picks);
    if (!picks) {
      return NextResponse.json({ error: "invalid_picks" }, { status: 400 });
    }

    await redisCommand<string>(["SET", PICKS_KEY, JSON.stringify(picks)]);
    return NextResponse.json({ configured: true, saved: true });
  } catch (error) {
    console.error("Could not persist picks", error);
    return NextResponse.json({ configured: true, saved: false, error: "write_failed" }, { status: 500 });
  }
}
