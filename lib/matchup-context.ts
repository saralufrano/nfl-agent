import type { Game, GameWeather, Team, Venue, WeekData } from "@/lib/nfl-types";

const ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const OPEN_METEO_GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";
const OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast";
const SEASON = 2026;

type EspnVenue = {
  fullName?: string;
  city?: string;
  state?: string;
  indoor?: boolean;
  address?: {
    city?: string;
    state?: string;
  };
};

type EspnScheduleCompetition = {
  venue?: EspnVenue;
};

type EspnScheduleEvent = {
  id?: string;
  date?: string;
  competitions?: EspnScheduleCompetition[];
};

type EspnSchedulePayload = {
  week?: {
    number?: number;
  };
  events?: EspnScheduleEvent[];
};

type ScheduleMetadata = {
  kickoff: string | null;
  venue: Venue | null;
};

type TeamSeasonStats = {
  wins: number;
  losses: number;
  ties: number;
  games: number;
  pointsFor: number;
  pointsAgainst: number;
};

type GeocodePayload = {
  results?: Array<{
    latitude?: number;
    longitude?: number;
  }>;
};

type WeatherPayload = {
  hourly?: {
    time?: number[];
    temperature_2m?: Array<number | null>;
    precipitation_probability?: Array<number | null>;
    weather_code?: Array<number | null>;
    wind_speed_10m?: Array<number | null>;
  };
};

function blankStats(): TeamSeasonStats {
  return { wins: 0, losses: 0, ties: 0, games: 0, pointsFor: 0, pointsAgainst: 0 };
}

function formatRecord(stats: TeamSeasonStats) {
  return stats.ties ? `${stats.wins}-${stats.losses}-${stats.ties}` : `${stats.wins}-${stats.losses}`;
}

function scoringAverage(stats: TeamSeasonStats, kind: "for" | "against") {
  if (!stats.games) return null;
  const points = kind === "for" ? stats.pointsFor : stats.pointsAgainst;
  return points / stats.games;
}

function rankTeams(statsMap: Map<string, TeamSeasonStats>, kind: "offense" | "defense") {
  const entries = [...statsMap.entries()]
    .map(([team, stats]) => ({
      team,
      metric: scoringAverage(stats, kind === "offense" ? "for" : "against"),
    }))
    .filter((entry): entry is { team: string; metric: number } => entry.metric !== null)
    .sort((a, b) =>
      kind === "offense"
        ? b.metric - a.metric || a.team.localeCompare(b.team)
        : a.metric - b.metric || a.team.localeCompare(b.team),
    );

  const ranks = new Map<string, number>();
  let currentRank = 0;
  let previousMetric: number | null = null;

  entries.forEach((entry, index) => {
    if (previousMetric === null || Math.abs(entry.metric - previousMetric) > 0.0001) {
      currentRank = index + 1;
      previousMetric = entry.metric;
    }
    ranks.set(entry.team, currentRank);
  });

  return ranks;
}

function updateStatsFromCompletedGame(statsMap: Map<string, TeamSeasonStats>, game: Game) {
  if (!game.completed) return;
  const awayScore = game.teams[0].score;
  const homeScore = game.teams[1].score;
  if (awayScore === null || homeScore === null) return;

  const awayKey = game.teams[0].abbreviation.toUpperCase();
  const homeKey = game.teams[1].abbreviation.toUpperCase();
  const away = statsMap.get(awayKey) || blankStats();
  const home = statsMap.get(homeKey) || blankStats();

  away.games += 1;
  home.games += 1;
  away.pointsFor += awayScore;
  away.pointsAgainst += homeScore;
  home.pointsFor += homeScore;
  home.pointsAgainst += awayScore;

  if (awayScore > homeScore) {
    away.wins += 1;
    home.losses += 1;
  } else if (homeScore > awayScore) {
    home.wins += 1;
    away.losses += 1;
  } else {
    away.ties += 1;
    home.ties += 1;
  }

  statsMap.set(awayKey, away);
  statsMap.set(homeKey, home);
}

function normalizeVenue(raw: EspnVenue | undefined): Venue | null {
  if (!raw) return null;
  return {
    name: raw.fullName || null,
    city: raw.address?.city || raw.city || null,
    state: raw.address?.state || raw.state || null,
    indoor: Boolean(raw.indoor),
  };
}

async function fetchWeekScheduleMetadata(week: number) {
  const response = await fetch(`${ESPN_SCOREBOARD}?dates=${SEASON}&seasontype=2&week=${week}`, {
    next: { revalidate: 300 },
  });
  if (!response.ok) return new Map<string, ScheduleMetadata>();

  const payload = (await response.json()) as EspnSchedulePayload;
  const map = new Map<string, ScheduleMetadata>();

  for (const event of payload.events || []) {
    if (!event.id) continue;
    map.set(event.id, {
      kickoff: event.date || null,
      venue: normalizeVenue(event.competitions?.[0]?.venue),
    });
  }

  return map;
}

export async function fetchCurrentNflWeekNumber() {
  try {
    const response = await fetch(ESPN_SCOREBOARD, { next: { revalidate: 300 } });
    if (!response.ok) return 1;
    const payload = (await response.json()) as EspnSchedulePayload;
    const week = payload.week?.number;
    return typeof week === "number" && week >= 1 && week <= 18 ? week : 1;
  } catch {
    return 1;
  }
}

async function geocodeVenue(venue: Venue) {
  if (!venue.city) return null;
  const query = [venue.city, venue.state].filter(Boolean).join(", ");
  const url = `${OPEN_METEO_GEOCODE}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;

  try {
    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (!response.ok) return null;
    const payload = (await response.json()) as GeocodePayload;
    const result = payload.results?.[0];
    if (typeof result?.latitude !== "number" || typeof result.longitude !== "number") return null;
    return { latitude: result.latitude, longitude: result.longitude };
  } catch {
    return null;
  }
}

function weatherCondition(code: number | null | undefined) {
  if (code === null || code === undefined) return null;
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95) return "Thunderstorms";
  return "Weather";
}

function rounded(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

async function fetchGameWeather(game: Game): Promise<GameWeather | null> {
  const venue = game.venue;
  const kickoff = game.kickoff;
  if (!venue || !kickoff) return null;

  if (venue.indoor) {
    return {
      summary: "Indoor",
      condition: "Indoor",
      temperatureF: null,
      precipitationProbability: null,
      windMph: null,
      indoor: true,
    };
  }

  const coordinates = await geocodeVenue(venue);
  if (!coordinates) return null;

  const params = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    hourly: "temperature_2m,precipitation_probability,weather_code,wind_speed_10m",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timeformat: "unixtime",
    past_days: "14",
    forecast_days: "16",
  });

  try {
    const response = await fetch(`${OPEN_METEO_FORECAST}?${params.toString()}`, {
      next: { revalidate: 1800 },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as WeatherPayload;
    const times = payload.hourly?.time || [];
    if (!times.length) return null;

    const kickoffSeconds = Date.parse(kickoff) / 1000;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    times.forEach((time, index) => {
      const distance = Math.abs(time - kickoffSeconds);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestDistance > 3 * 60 * 60) return null;

    const temperatureF = rounded(payload.hourly?.temperature_2m?.[closestIndex]);
    const precipitationProbability = rounded(payload.hourly?.precipitation_probability?.[closestIndex]);
    const windMph = rounded(payload.hourly?.wind_speed_10m?.[closestIndex]);
    const condition = weatherCondition(payload.hourly?.weather_code?.[closestIndex]);
    const summaryParts = [
      temperatureF !== null ? `${temperatureF}°F` : null,
      condition,
      precipitationProbability !== null ? `Rain ${precipitationProbability}%` : null,
      windMph !== null ? `Wind ${windMph} mph` : null,
    ].filter((value): value is string => Boolean(value));

    return {
      summary: summaryParts.join(" · ") || "Forecast unavailable",
      condition,
      temperatureF,
      precipitationProbability,
      windMph,
      indoor: false,
    };
  } catch {
    return null;
  }
}

function enrichTeam(team: Team, statsMap: Map<string, TeamSeasonStats>, offenseRanks: Map<string, number>, defenseRanks: Map<string, number>): Team {
  const key = team.abbreviation.toUpperCase();
  const stats = statsMap.get(key) || blankStats();
  return {
    ...team,
    record: formatRecord(stats),
    offenseRank: offenseRanks.get(key) || null,
    defenseRank: defenseRanks.get(key) || null,
  };
}

export async function enrichWeeksWithMatchupContext(weeks: WeekData[]): Promise<WeekData[]> {
  const orderedWeeks = [...weeks].sort((a, b) => a.number - b.number);
  const scheduleMaps = new Map<number, Map<string, ScheduleMetadata>>();
  const scheduleEntries = await Promise.all(
    orderedWeeks.map(async (week) => [week.number, await fetchWeekScheduleMetadata(week.number)] as const),
  );
  scheduleEntries.forEach(([week, metadata]) => scheduleMaps.set(week, metadata));

  const statsMap = new Map<string, TeamSeasonStats>();
  const enriched: WeekData[] = [];

  for (const week of orderedWeeks) {
    for (const game of week.games) {
      for (const team of game.teams) {
        const key = team.abbreviation.toUpperCase();
        if (!statsMap.has(key)) statsMap.set(key, blankStats());
      }
    }

    const offenseRanks = rankTeams(statsMap, "offense");
    const defenseRanks = rankTeams(statsMap, "defense");
    const metadata = scheduleMaps.get(week.number) || new Map<string, ScheduleMetadata>();

    const games = week.games.map((game) => {
      const schedule = metadata.get(game.id);
      return {
        ...game,
        teams: [
          enrichTeam(game.teams[0], statsMap, offenseRanks, defenseRanks),
          enrichTeam(game.teams[1], statsMap, offenseRanks, defenseRanks),
        ] as [Team, Team],
        kickoff: schedule?.kickoff || null,
        venue: schedule?.venue || null,
      };
    });

    enriched.push({ ...week, games });
    games.forEach((game) => updateStatsFromCompletedGame(statsMap, game));
  }

  const latestWeekNumber = Math.max(...enriched.map((week) => week.number));
  const withWeather = await Promise.all(
    enriched.map(async (week) => {
      if (week.number !== latestWeekNumber) return week;
      const games = await Promise.all(
        week.games.map(async (game) => ({
          ...game,
          weather: await fetchGameWeather(game),
        })),
      );
      return { ...week, games };
    }),
  );

  return withWeather;
}
