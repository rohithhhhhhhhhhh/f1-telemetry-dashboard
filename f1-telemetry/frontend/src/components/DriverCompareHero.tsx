"use client";
import { type Driver, type DriverTelemetry } from "@/lib/api";

interface Props {
  d1?: Driver; d2?: Driver;
  tel: { driver1: DriverTelemetry; driver2: DriverTelemetry } | null;
}

function lapToSec(t: string | null) {
  if (!t) return Infinity;
  const [m, s] = t.split(":"); return Number(m) * 60 + Number(s);
}

function StatBox({ label, v1, v2, c1, c2, unit = "" }: {
  label: string; v1: string | number; v2: string | number; c1: string; c2: string; unit?: string;
}) {
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
      <p className="text-[#333] text-[8px] tracking-[2px] mb-2">{label}</p>
      <div className="flex justify-between items-end">
        <span style={{ color: c1 }} className="font-['Orbitron'] font-bold text-lg">
          {v1}<span className="text-[10px] text-[#555]">{unit}</span>
        </span>
        <span className="text-[#222] text-[9px]">vs</span>
        <span style={{ color: c2 }} className="font-['Orbitron'] font-bold text-lg">
          {v2}<span className="text-[10px] text-[#555]">{unit}</span>
        </span>
      </div>
    </div>
  );
}

export default function DriverCompareHero({ d1, d2, tel }: Props) {
  const t1 = tel?.driver1;
  const t2 = tel?.driver2;
  const c1 = d1?.team_color ?? "#FF8000";
  const c2 = d2?.team_color ?? "#3671C6";

  const delta = (() => {
    const s1 = lapToSec(t1?.lap_time ?? null);
    const s2 = lapToSec(t2?.lap_time ?? null);
    if (!isFinite(s1) || !isFinite(s2)) return null;
    const d = (s1 - s2).toFixed(3);
    return { val: Math.abs(Number(d)).toFixed(3), faster: s1 < s2 ? 1 : 2 };
  })();

  const maxSpeed1 = t1 ? Math.max(...t1.telemetry.map(p => p.speed)) : 0;
  const maxSpeed2 = t2 ? Math.max(...t2.telemetry.map(p => p.speed)) : 0;
  const avgThr1   = t1 ? Math.round(t1.telemetry.reduce((a, p) => a + p.throttle, 0) / t1.telemetry.length) : 0;
  const avgThr2   = t2 ? Math.round(t2.telemetry.reduce((a, p) => a + p.throttle, 0) / t2.telemetry.length) : 0;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
      {/* Driver 1 */}
      <div className="rounded-xl border p-4" style={{ borderColor: c1 + "40", background: c1 + "0c" }}>
        <p className="text-[#555] text-[9px] tracking-[3px] mb-1">DRIVER A</p>
        <p className="font-['Orbitron'] font-black text-2xl tracking-widest" style={{ color: c1 }}>
          {d1?.abbreviation ?? "—"}
        </p>
        <p className="text-[#555] text-[10px]">{d1?.full_name ?? ""}</p>
        <div className="flex gap-4 mt-3">
          <div>
            <p className="text-[#333] text-[8px] tracking-widest">LAP</p>
            <p className="font-['Orbitron'] text-sm text-white">{t1?.lap_time ?? "—"}</p>
          </div>
          <div>
            <p className="text-[#333] text-[8px] tracking-widest">TYRE</p>
            <p className="font-['Orbitron'] text-sm text-white">{t1?.compound ?? "—"}</p>
          </div>
          <div>
            <p className="text-[#333] text-[8px] tracking-widest">AGE</p>
            <p className="font-['Orbitron'] text-sm text-white">{t1?.tyre_life ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* VS / Delta */}
      <div className="flex flex-col items-center gap-2 px-4">
        <p className="font-['Orbitron'] font-black text-[#1a1a1a] tracking-[4px] text-sm">VS</p>
        {delta && (
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-center">
            <p className="text-[#333] text-[8px] tracking-[2px]">DELTA</p>
            <p className="font-['Orbitron'] font-bold text-sm"
               style={{ color: delta.faster === 1 ? c1 : c2 }}>
              {delta.faster === 1 ? "-" : "+"}{delta.val}s
            </p>
          </div>
        )}
      </div>

      {/* Driver 2 */}
      <div className="rounded-xl border p-4 text-right" style={{ borderColor: c2 + "40", background: c2 + "0c" }}>
        <p className="text-[#555] text-[9px] tracking-[3px] mb-1">DRIVER B</p>
        <p className="font-['Orbitron'] font-black text-2xl tracking-widest" style={{ color: c2 }}>
          {d2?.abbreviation ?? "—"}
        </p>
        <p className="text-[#555] text-[10px]">{d2?.full_name ?? ""}</p>
        <div className="flex gap-4 mt-3 justify-end">
          <div className="text-right">
            <p className="text-[#333] text-[8px] tracking-widest">TYRE</p>
            <p className="font-['Orbitron'] text-sm text-white">{t2?.compound ?? "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-[#333] text-[8px] tracking-widest">LAP</p>
            <p className="font-['Orbitron'] text-sm text-white">{t2?.lap_time ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Stats row spanning full width */}
      <div className="col-span-3 grid grid-cols-4 gap-3">
        <StatBox label="TOP SPEED" v1={maxSpeed1} v2={maxSpeed2} c1={c1} c2={c2} unit=" km/h"/>
        <StatBox label="AVG THROTTLE" v1={`${avgThr1}%`} v2={`${avgThr2}%`} c1={c1} c2={c2}/>
        <StatBox label="SECTOR 1" v1={t1?.sector1 ?? "—"} v2={t2?.sector1 ?? "—"} c1={c1} c2={c2}/>
        <StatBox label="SECTOR 2" v1={t1?.sector2 ?? "—"} v2={t2?.sector2 ?? "—"} c1={c1} c2={c2}/>
      </div>
    </div>
  );
}
