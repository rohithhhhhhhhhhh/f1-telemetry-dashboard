"use client";
import { useState, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { type DriverTelemetry, type Driver } from "@/lib/api";

interface Props {
  tel: { driver1: DriverTelemetry; driver2: DriverTelemetry };
  d1Info?: Driver; d2Info?: Driver;
  onHoverDist?: (dist: number | null) => void;
}

const TABS = [
  { key: "speed",    label: "SPEED",    unit: "km/h", domain: [0, 360] as [number,number] },
  { key: "throttle", label: "THROTTLE", unit: "%",    domain: [0, 100] as [number,number] },
  { key: "brake",    label: "BRAKE",    unit: "%",    domain: [0, 100] as [number,number] },
  { key: "rpm",      label: "RPM",      unit: "",     domain: [0, 18000] as [number,number] },
];

export default function TelemetryCharts({ tel, d1Info, d2Info, onHoverDist }: Props) {
  const [tab, setTab] = useState("speed");
  const c1 = d1Info?.team_color ?? "#FF8000";
  const c2 = d2Info?.team_color ?? "#3671C6";

  const combined = tel.driver1.telemetry.map((pt, i) => ({
    dist: Math.round(pt.dist),
    speed1: pt.speed,      speed2: tel.driver2.telemetry[i]?.speed ?? 0,
    throttle1: pt.throttle, throttle2: tel.driver2.telemetry[i]?.throttle ?? 0,
    brake1: pt.brake * 100, brake2: (tel.driver2.telemetry[i]?.brake ?? 0) * 100,
    rpm1: pt.rpm ?? 0,      rpm2: tel.driver2.telemetry[i]?.rpm ?? 0,
    gear1: pt.gear ?? 0,
  }));

  const active = TABS.find(t => t.key === tab)!;
  const handleMove = useCallback((data: any) => {
    onHoverDist?.(data?.activeLabel ?? null);
  }, [onHoverDist]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#080808] border border-[#222] rounded p-2 text-[10px] font-mono">
        <p className="text-[#444] mb-1">{label}m</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name?.includes("1") ? d1Info?.abbreviation : d2Info?.abbreviation}: {p.value} {active.unit}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-[#080808] border border-[#111] rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[#111]">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-3 text-[10px] tracking-widest border-b-2 transition-all"
            style={{ color: tab === t.key ? "#FF8000" : "#333", borderBottomColor: tab === t.key ? "#FF8000" : "transparent" }}>
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-[2px]" style={{ background: c1 }}/>
            <span className="text-[9px]" style={{ color: c1 }}>{d1Info?.abbreviation}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-[2px]" style={{ background: c2 }}/>
            <span className="text-[9px]" style={{ color: c2 }}>{d2Info?.abbreviation}</span>
          </div>
        </div>
      </div>

      {/* Main chart */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={combined} onMouseMove={handleMove} onMouseLeave={() => onHoverDist?.(null)}>
            <defs>
              {[c1, c2].map((c, i) => (
                <linearGradient key={i} id={`grad${i+1}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={c} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#0f0f0f" vertical={false}/>
            <XAxis dataKey="dist" stroke="#222" tick={{ fill: "#444", fontSize: 9 }} tickFormatter={v => `${v}m`} interval={40}/>
            <YAxis stroke="#222" tick={{ fill: "#444", fontSize: 9 }} domain={active.domain}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Area type="monotone" dataKey={`${tab}1`} stroke={c1} fill="url(#grad1)" strokeWidth={1.5} dot={false}/>
            <Area type="monotone" dataKey={`${tab}2`} stroke={c2} fill="url(#grad2)" strokeWidth={1.5} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Gear trace */}
      <div className="px-4 pb-3">
        <p className="text-[#333] text-[8px] tracking-[3px] mb-2">GEAR — {d1Info?.abbreviation}</p>
        <ResponsiveContainer width="100%" height={50}>
          <AreaChart data={combined}>
            <Area type="stepAfter" dataKey="gear1" stroke={c1} fill={c1 + "20"} strokeWidth={1} dot={false}/>
            <YAxis domain={[1, 8]} hide/>
            <XAxis dataKey="dist" hide/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Throttle+Brake overlay */}
      <div className="px-4 pb-4 border-t border-[#0d0d0d] pt-3">
        <p className="text-[#333] text-[8px] tracking-[3px] mb-2">THROTTLE (green) & BRAKE (red) — {d1Info?.abbreviation}</p>
        <ResponsiveContainer width="100%" height={70}>
          <AreaChart data={combined}>
            <defs>
              <linearGradient id="thrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00cc44" stopOpacity={0.35}/><stop offset="100%" stopColor="#00cc44" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="brkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#cc2200" stopOpacity={0.45}/><stop offset="100%" stopColor="#cc2200" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="throttle1" stroke="#00cc44" fill="url(#thrGrad)" strokeWidth={1.5} dot={false}/>
            <Area type="monotone" dataKey="brake1"    stroke="#cc2200" fill="url(#brkGrad)" strokeWidth={1.5} dot={false}/>
            <YAxis domain={[0,100]} hide/><XAxis dataKey="dist" hide/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
