"use client";
import { type Driver, type DriverTelemetry, type Lap, type WeatherPoint, type SessionResult } from "@/lib/api";

// ── TrackMap ──────────────────────────────────────────────────────────────────
interface TrackMapProps {
  trackXY: { x: number[]; y: number[] } | null;
  tel: { driver1: DriverTelemetry; driver2: DriverTelemetry } | null;
  d1Info?: Driver; d2Info?: Driver;
  hoveredDist?: number | null;
}

export function TrackMap({ trackXY, tel, d1Info, d2Info }: TrackMapProps) {
  const c1 = d1Info?.team_color ?? "#FF8000";
  const c2 = d2Info?.team_color ?? "#3671C6";

  if (!trackXY) return (
    <div className="bg-[#080808] border border-[#111] rounded-xl flex items-center justify-center h-[440px]">
      <p className="text-[#333] text-[10px] tracking-widest">NO TRACK DATA</p>
    </div>
  );

  const W = 280, H = 380;
  const pad = 20;
  const toSvg = (nx: number, ny: number) => ({
    x: pad + nx * (W - pad * 2),
    y: pad + (1 - ny) * (H - pad * 2),
  });

  // Build color segments from speed dominance
  const segments = trackXY.x.slice(0, -1).map((_, i) => {
    const frac = i / trackXY.x.length;
    const tidx = Math.floor(frac * (tel?.driver1.telemetry.length ?? 1));
    const s1 = tel?.driver1.telemetry[tidx]?.speed ?? 0;
    const s2 = tel?.driver2.telemetry[tidx]?.speed ?? 0;
    const color = s1 > s2 + 3 ? c1 : s2 > s1 + 3 ? c2 : "#444";
    const p1 = toSvg(trackXY.x[i], trackXY.y[i]);
    const p2 = toSvg(trackXY.x[i + 1], trackXY.y[i + 1]);
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, color };
  });

  const pathD = trackXY.x.map((nx, i) => {
    const p = toSvg(nx, trackXY.y[i]);
    return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className="bg-[#080808] border border-[#111] rounded-xl p-4 flex flex-col">
      <p className="text-[#333] text-[9px] tracking-[3px] mb-3">TRACK MAP — SPEED DOMINANCE</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1" style={{ filter: "drop-shadow(0 0 12px rgba(255,128,0,0.1))" }}>
        {/* Track base */}
        <path d={pathD} fill="none" stroke="#222" strokeWidth={12} strokeLinejoin="round"/>
        <path d={pathD} fill="none" stroke="#0a0a0a" strokeWidth={8} strokeLinejoin="round"/>
        {/* Speed dominance overlay */}
        {segments.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.color} strokeWidth={3} strokeLinecap="round" opacity={0.85}/>
        ))}
        {/* Start/Finish */}
        {(() => { const p = toSvg(trackXY.x[0], trackXY.y[0]); return <circle cx={p.x} cy={p.y} r={4} fill="white" opacity={0.6}/>; })()}
      </svg>
      <div className="flex justify-center gap-6 mt-3">
        {[d1Info, d2Info].map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-5 h-[2px]" style={{ background: i === 0 ? c1 : c2 }}/>
            <span className="text-[9px]" style={{ color: i === 0 ? c1 : c2 }}>{d?.abbreviation} faster</span>
          </div>
        ))}
      </div>
    </div>
  );
}
export default TrackMap;

// ── LapTable ──────────────────────────────────────────────────────────────────
export function LapTable({ laps, drivers }: { laps: Lap[]; drivers: Driver[] }) {
  const colorMap = Object.fromEntries(drivers.map(d => [d.abbreviation, d.team_color]));
  const COMPOUND_COLOR: Record<string, string> = {
    SOFT: "#FF3333", MEDIUM: "#FFD700", HARD: "#CCCCCC",
    INTERMEDIATE: "#33CC33", WET: "#3399FF",
  };

  return (
    <div className="bg-[#080808] border border-[#111] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="border-b border-[#111]">
              {["DRV","LAP","TIME","S1","S2","S3","TYRE","AGE","STINT","PB"].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[9px] tracking-[2px] text-[#333]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {laps.map((lap, i) => {
              const c = colorMap[lap.driver] ?? "#888";
              return (
                <tr key={i} className="border-b border-[#0a0a0a] hover:bg-[#0f0f0f] transition-colors">
                  <td className="px-3 py-2" style={{ color: c }}>{lap.driver}</td>
                  <td className="px-3 py-2 text-[#555]">{lap.lap_number}</td>
                  <td className="px-3 py-2 text-white font-bold">{lap.lap_time ?? "—"}</td>
                  <td className="px-3 py-2 text-[#888]">{lap.sector1 ?? "—"}</td>
                  <td className="px-3 py-2 text-[#888]">{lap.sector2 ?? "—"}</td>
                  <td className="px-3 py-2 text-[#888]">{lap.sector3 ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ color: COMPOUND_COLOR[lap.compound] ?? "#888", border: `1px solid ${COMPOUND_COLOR[lap.compound] ?? "#333"}44` }}>
                      {lap.compound || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[#555]">{lap.tyre_life ?? "—"}</td>
                  <td className="px-3 py-2 text-[#555]">{lap.stint ?? "—"}</td>
                  <td className="px-3 py-2">{lap.is_personal_best ? <span className="text-[#FF8000] text-[9px]">PB</span> : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── WeatherPanel ──────────────────────────────────────────────────────────────
export function WeatherPanel({ weather }: { weather: WeatherPoint[] }) {
  if (!weather.length) return <div className="text-[#333] text-[10px] tracking-widest p-8">NO WEATHER DATA</div>;
  const last = weather[weather.length - 1];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "AIR TEMP",   val: `${last.air_temp ?? "—"}°C` },
          { label: "TRACK TEMP", val: `${last.track_temp ?? "—"}°C` },
          { label: "HUMIDITY",   val: `${last.humidity ?? "—"}%` },
          { label: "RAINFALL",   val: last.rainfall ? "YES" : "NO" },
        ].map(s => (
          <div key={s.label} className="bg-[#080808] border border-[#111] rounded-xl p-4">
            <p className="text-[#333] text-[9px] tracking-[2px] mb-2">{s.label}</p>
            <p className="font-['Orbitron'] font-bold text-xl text-white">{s.val}</p>
          </div>
        ))}
      </div>
      <div className="bg-[#080808] border border-[#111] rounded-xl overflow-hidden">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="border-b border-[#111]">
              {["TIME","AIR °C","TRACK °C","HUMIDITY","WIND km/h","RAIN"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[9px] tracking-[2px] text-[#333]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weather.filter((_, i) => i % 5 === 0).map((w, i) => (
              <tr key={i} className="border-b border-[#0a0a0a] hover:bg-[#0f0f0f]">
                <td className="px-4 py-2 text-[#555]">{w.time.slice(0, 8)}</td>
                <td className="px-4 py-2 text-white">{w.air_temp ?? "—"}</td>
                <td className="px-4 py-2 text-[#FF8000]">{w.track_temp ?? "—"}</td>
                <td className="px-4 py-2 text-[#888]">{w.humidity ?? "—"}%</td>
                <td className="px-4 py-2 text-[#888]">{w.wind_speed ?? "—"}</td>
                <td className="px-4 py-2">{w.rainfall ? <span className="text-blue-400">🌧</span> : <span className="text-[#333]">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ResultsTable ──────────────────────────────────────────────────────────────
export function ResultsTable({ results }: { results: SessionResult[] }) {
  return (
    <div className="bg-[#080808] border border-[#111] rounded-xl overflow-hidden">
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="border-b border-[#111]">
            {["POS","NUM","DRIVER","TEAM","TIME","GAP","PTS","GRID","STATUS"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[9px] tracking-[2px] text-[#333]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i} className="border-b border-[#0a0a0a] hover:bg-[#0f0f0f] transition-colors">
              <td className="px-4 py-2 font-['Orbitron'] font-bold text-[#FF8000]">{r.position ?? "—"}</td>
              <td className="px-4 py-2 text-[#555]">{r.driver_number}</td>
              <td className="px-4 py-2 font-bold text-white">{r.abbreviation}</td>
              <td className="px-4 py-2">
                <span className="px-2 py-0.5 rounded text-[9px]" style={{ color: r.team_color, border: `1px solid ${r.team_color}33` }}>
                  {r.team}
                </span>
              </td>
              <td className="px-4 py-2 text-white">{r.time ?? "—"}</td>
              <td className="px-4 py-2 text-[#888]">{r.gap_to_leader ? `+${r.gap_to_leader}` : "—"}</td>
              <td className="px-4 py-2 text-[#FF8000] font-bold">{r.points ?? 0}</td>
              <td className="px-4 py-2 text-[#555]">{r.grid_position ?? "—"}</td>
              <td className="px-4 py-2 text-[#555] text-[9px]">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
