"use client";
import { type Event } from "@/lib/api";

interface Props {
  year: number; setYear: (y: number) => void;
  round: number; setRound: (r: number) => void;
  session: string; setSession: (s: string) => void;
  events: Event[];
}

const SESSIONS = [
  { key: "FP1", label: "FP1" }, { key: "FP2", label: "FP2" }, { key: "FP3", label: "FP3" },
  { key: "Q",   label: "QUAL" }, { key: "R",   label: "RACE" },
];

export default function SessionSelector({ year, setYear, round, setRound, session, setSession, events }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Year */}
      <div>
        <p className="text-[#333] text-[9px] tracking-[3px] mb-2">SEASON</p>
        <div className="flex flex-wrap gap-1">
          {[2022, 2023, 2024].map(y => (
            <button key={y} onClick={() => setYear(y)}
              className="px-3 py-1 rounded text-[10px] border transition-all"
              style={{ borderColor: year === y ? "#FF8000" : "#1a1a1a", color: year === y ? "#FF8000" : "#444" }}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Event */}
      <div>
        <p className="text-[#333] text-[9px] tracking-[3px] mb-2">GRAND PRIX</p>
        <select value={round} onChange={e => setRound(Number(e.target.value))}
          className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded text-[10px] text-[#888] px-3 py-2 focus:outline-none focus:border-[#FF8000]">
          {events.map(ev => (
            <option key={ev.round} value={ev.round}>{ev.round}. {ev.name}</option>
          ))}
        </select>
      </div>

      {/* Session */}
      <div>
        <p className="text-[#333] text-[9px] tracking-[3px] mb-2">SESSION</p>
        <div className="flex gap-1 flex-wrap">
          {SESSIONS.map(s => (
            <button key={s.key} onClick={() => setSession(s.key)}
              className="px-3 py-1 rounded text-[10px] border transition-all"
              style={{ borderColor: session === s.key ? "#FF8000" : "#1a1a1a", color: session === s.key ? "#FF8000" : "#444" }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
