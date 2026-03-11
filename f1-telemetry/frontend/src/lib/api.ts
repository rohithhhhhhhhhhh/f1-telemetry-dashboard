// lib/api.ts  –  typed wrappers around the FastF1 backend

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Event {
  round: number; name: string; country: string;
  location: string; date: string | null; format: string;
}

export interface Driver {
  abbreviation: string; full_name: string; number: string;
  team: string; team_color: string;
}

export interface SessionResult {
  position: number | null; driver_number: string; abbreviation: string;
  full_name: string; team: string; team_color: string;
  time: string | null; gap_to_leader: string | null;
  points: number | null; grid_position: number | null; status: string;
}

export interface Lap {
  driver: string; team: string; lap_number: number | null;
  lap_time: string | null; lap_time_seconds: number | null;
  sector1: string | null; sector2: string | null; sector3: string | null;
  compound: string; tyre_life: number | null; stint: number | null;
  is_personal_best: boolean;
  pit_in_time: string | null; pit_out_time: string | null;
}

export interface TelemetryPoint {
  dist: number; speed: number; throttle: number;
  brake: number; rpm: number | null; gear: number | null; drs: number;
}

export interface DriverTelemetry {
  driver: string; lap_number: number | null; lap_time: string | null;
  compound: string; tyre_life: number | null;
  sector1: string | null; sector2: string | null; sector3: string | null;
  telemetry: TelemetryPoint[];
}

export interface WeatherPoint {
  time: string; air_temp: number | null; track_temp: number | null;
  humidity: number | null; pressure: number | null;
  wind_speed: number | null; wind_direction: number | null; rainfall: boolean;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const getSeasons = () =>
  get<{ seasons: number[] }>("/api/seasons");

export const getSchedule = (year: number) =>
  get<{ year: number; events: Event[] }>(`/api/schedule/${year}`);

export const getDrivers = (year: number, round: number, session = "R") =>
  get<{ drivers: Driver[] }>(`/api/drivers/${year}/${round}/${session}`);

export const getSessionResults = (year: number, round: number, session = "R") =>
  get<{ results: SessionResult[]; event: string }>(
    `/api/session/${year}/${round}/${session}`
  );

export const getAllLaps = (year: number, round: number, session = "R", driver?: string) => {
  const q = driver ? `?driver=${driver}` : "";
  return get<{ laps: Lap[] }>(`/api/laps/${year}/${round}/${session}${q}`);
};

export const getTelemetry = (
  year: number, round: number, session: string,
  driver1: string, driver2: string,
  lap1?: number, lap2?: number,
) => {
  const p = new URLSearchParams({ driver1, driver2 });
  if (lap1) p.set("lap1", String(lap1));
  if (lap2) p.set("lap2", String(lap2));
  return get<{ driver1: DriverTelemetry; driver2: DriverTelemetry }>(
    `/api/telemetry/${year}/${round}/${session}?${p}`
  );
};

export const getTrackMap = (year: number, round: number) =>
  get<{ x: number[]; y: number[]; count: number }>(`/api/track/${year}/${round}`);

export const getWeather = (year: number, round: number, session = "R") =>
  get<{ weather: WeatherPoint[] }>(`/api/weather/${year}/${round}/${session}`);
