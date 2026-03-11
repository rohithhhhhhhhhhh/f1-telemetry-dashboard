"use client";

import { useState, useEffect } from "react";
import { getSchedule, getDrivers, getTelemetry, getSessionResults,
         getAllLaps, getTrackMap, getWeather,
         type Event, type Driver, type DriverTelemetry,
         type SessionResult, type Lap, type WeatherPoint } from "@/lib/api";

import SessionSelector from "@/components/SessionSelector";
import DriverCompareHero from "@/components/DriverCompareHero";
import { TelemetryCharts, TrackMap, LapTable, WeatherPanel, ResultsTable } from "@/components/index";

export default function Dashboard() {
  // ── Selection state ────────────────────────────────────────────────────────
  const [year, setYear]             = useState(2024);
  const [round, setRound]           = useState(8);   // Monaco
  const [session, setSession]       = useState("R");
  const [events, setEvents]         = useState<Event[]>([]);
  const [drivers, setDrivers]       = useState<Driver[]>([]);
  const [driver1, setDriver1]       = useState("NOR");
  const [driver2, setDriver2]       = useState("VER");
  const [activeTab, setActiveTab]   = useState<"telemetry"|"results"|"laps"|"weather">("telemetry");

  // ── Data state ─────────────────────────────────────────────────────────────
  const [tel, setTel]               = useState<{ driver1: DriverTelemetry; driver2: DriverTelemetry } | null>(null);
  const [results, setResults]       = useState<SessionResult[]>([]);
  const [laps, setLaps]             = useState<Lap[]>([]);
  const [weather, setWeather]       = useState<WeatherPoint[]>([]);
  const [trackXY, setTrackXY]       = useState<{ x: number[]; y: number[] } | null>(null);
  const [eventName, setEventName]   = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // ── Load schedule on year change ───────────────────────────────────────────
  useEffect(() => {
    getSchedule(year).then(d => setEvents(d.events)).catch(console.error);
  }, [year]);

  // ── Load drivers on session change ─────────────────────────────────────────
  useEffect(() => {
    if (!round) return;
    getDrivers(year, round, session)
      .then(d => {
        setDrivers(d.drivers);
        if (d.drivers.length >= 2) {
          setDriver1(d.drivers[0].abbreviation);
          setDriver2(d.drivers[1].abbreviation);
        }
      })
      .catch(console.error);
  }, [year, round, session]);

  // ── Load everything when session / drivers change ─────────────────────────
  useEffect(() => {
    if (!round || !driver1 || !driver2) return;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      getTelemetry(year, round, session, driver1, driver2).then(setTel),
      getSessionResults(year, round, session).then(d => { setResults(d.results); setEventName(d.event); }),
      getAllLaps(year, round, session).then(d => setLaps(d.laps)),
      getWeather(year, round, session).then(d => setWeather(d.weather)),
      getTrackMap(year, round).then(d => setTrackXY({ x: d.x, y: d.y })),
    ]).then(outcomes => {
      const failed = outcomes.filter(o => o.status === "rejected");
      if (failed.length) setError("Some data failed to load — check backend logs.");
    }).finally(() => setLoading(false));
  }, [year, round, session, driver1, driver2]);

  const d1Info = drivers.find(d => d.abbreviation === driver1);
  const d2Info = drivers.find(d => d.abbreviation === driver2);

  const TABS = [
    { key: "telemetry", label: "TELEMETRY" },
    { key: "results",   label: "RESULTS"   },
    { key: "laps",      label: "LAP TIMES" },
    { key: "weather",   label: "WEATHER"   },
  ] as const;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono">
      {/* BG grid */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "linear-gradient(#0d0d0d 1px,transparent 1px),linear-gradient(90deg,#0d0d0d 1px,transparent 1px)", backgroundSize: "60px 60px", opacity: 0.5 }}/>

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-[#111] bg-[rgba(5,5,5,0.95)] backdrop-blur-xl h-14 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-[#FF8000] rounded-full"/>
            <span className="font-['Orbitron'] font-black text-[#FF8000] tracking-[3px] text-sm">F1</span>
            <span className="font-['Orbitron'] text-[#555] tracking-[4px] text-xs">TELEMETRY</span>
          </div>
          <div className="h-5 w-px bg-[#1a1a1a]"/>
          <span className="text-[#444] text-[10px] tracking-widest">{eventName || "—"}</span>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-[#FF8000] text-[10px] tracking-widest">
            <div className="w-2 h-2 rounded-full bg-[#FF8000] animate-pulse"/>
            LOADING DATA
          </div>
        )}
        {error && <div className="text-red-500 text-[10px] tracking-widest">{error}</div>}
        <div className="text-[#1f1f1f] text-[9px] tracking-[4px]">LIVE · FASTF1</div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* SIDEBAR */}
        <aside className="w-60 border-r border-[#111] overflow-y-auto flex-shrink-0 p-4">
          <SessionSelector
            year={year} setYear={setYear}
            round={round} setRound={setRound}
            session={session} setSession={setSession}
            events={events}
          />
          <div className="mt-6">
            <p className="text-[#333] text-[9px] tracking-[3px] mb-3">DRIVER A</p>
            <div className="flex flex-col gap-1">
              {drivers.map(d => (
                <button key={d.abbreviation} onClick={() => d.abbreviation !== driver2 && setDriver1(d.abbreviation)}
                  className="text-left px-3 py-2 rounded-lg border transition-all"
                  style={{
                    borderColor: driver1 === d.abbreviation ? d.team_color : "#1a1a1a",
                    background: driver1 === d.abbreviation ? d.team_color + "18" : "transparent",
                    color: driver1 === d.abbreviation ? d.team_color : "#555",
                  }}>
                  <span className="font-['Orbitron'] font-bold text-xs">{d.abbreviation}</span>
                  <span className="text-[9px] text-[#444] ml-2">{d.team}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[#333] text-[9px] tracking-[3px] mb-3">DRIVER B</p>
            <div className="flex flex-col gap-1">
              {drivers.map(d => (
                <button key={d.abbreviation} onClick={() => d.abbreviation !== driver1 && setDriver2(d.abbreviation)}
                  className="text-left px-3 py-2 rounded-lg border transition-all"
                  style={{
                    borderColor: driver2 === d.abbreviation ? d.team_color : "#1a1a1a",
                    background: driver2 === d.abbreviation ? d.team_color + "18" : "transparent",
                    color: driver2 === d.abbreviation ? d.team_color : "#555",
                  }}>
                  <span className="font-['Orbitron'] font-bold text-xs">{d.abbreviation}</span>
                  <span className="text-[9px] text-[#444] ml-2">{d.team}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Hero */}
          <DriverCompareHero d1={d1Info} d2={d2Info} tel={tel} />

          {/* Tab bar */}
          <div className="flex border-b border-[#111]">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className="px-5 py-2 text-[10px] tracking-widest transition-all border-b-2"
                style={{
                  color: activeTab === t.key ? "#FF8000" : "#333",
                  borderBottomColor: activeTab === t.key ? "#FF8000" : "transparent",
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "telemetry" && tel && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-[1fr_300px] gap-4">
                <TelemetryCharts tel={tel} d1Info={d1Info} d2Info={d2Info}/>
                <TrackMap trackXY={trackXY} tel={tel} d1Info={d1Info} d2Info={d2Info}/>
              </div>
            </div>
          )}
          {activeTab === "results" && <ResultsTable results={results}/>}
          {activeTab === "laps"    && <LapTable laps={laps} drivers={drivers}/>}
          {activeTab === "weather" && <WeatherPanel weather={weather}/>}

          {!tel && !loading && (
            <div className="flex-1 flex items-center justify-center text-[#222] text-sm tracking-widest">
              SELECT A SESSION TO LOAD DATA
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
