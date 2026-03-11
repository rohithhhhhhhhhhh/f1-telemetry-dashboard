"""
F1 Telemetry API — FastF1 Backend
Endpoints serve lap telemetry, session results, standings, and track maps.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import fastf1
import fastf1.plotting
import pandas as pd
import numpy as np
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Cache setup ───────────────────────────────────────────────────────────────
CACHE_DIR = os.getenv("FASTF1_CACHE", "./cache")
os.makedirs(CACHE_DIR, exist_ok=True)
fastf1.Cache.enable_cache(CACHE_DIR)

app = FastAPI(title="F1 Telemetry API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────
def safe_float(val):
    if pd.isna(val) or val is None:
        return None
    try:
        return round(float(val), 4)
    except Exception:
        return None


def timedelta_to_str(td):
    if pd.isna(td) or td is None:
        return None
    total = td.total_seconds()
    minutes = int(total // 60)
    seconds = total % 60
    return f"{minutes}:{seconds:06.3f}"


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "message": "F1 Telemetry API running"}


@app.get("/api/seasons")
def get_seasons():
    """Available seasons (2018–current)."""
    return {"seasons": list(range(2018, 2026))}


@app.get("/api/schedule/{year}")
def get_schedule(year: int):
    """Full race calendar for a given year."""
    try:
        schedule = fastf1.get_event_schedule(year, include_testing=False)
        events = []
        for _, row in schedule.iterrows():
            events.append({
                "round": int(row["RoundNumber"]),
                "name": row["EventName"],
                "country": row["Country"],
                "location": row["Location"],
                "date": str(row["EventDate"].date()) if pd.notna(row["EventDate"]) else None,
                "format": row.get("EventFormat", "conventional"),
            })
        return {"year": year, "events": events}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/session/{year}/{round_number}/{session_type}")
def get_session_results(year: int, round_number: int, session_type: str = "R"):
    """
    Load a session and return finishing order / lap times.
    session_type: R=Race, Q=Qualifying, FP1/FP2/FP3=Practice
    """
    try:
        session = fastf1.get_session(year, round_number, session_type)
        session.load(laps=True, telemetry=False, weather=False, messages=False)

        results = []
        for _, row in session.results.iterrows():
            results.append({
                "position": safe_float(row.get("Position")),
                "driver_number": str(row.get("DriverNumber", "")),
                "abbreviation": row.get("Abbreviation", ""),
                "full_name": row.get("FullName", ""),
                "team": row.get("TeamName", ""),
                "team_color": "#" + str(row.get("TeamColor", "FFFFFF")),
                "time": timedelta_to_str(row.get("Time")),
                "gap_to_leader": timedelta_to_str(row.get("GapToLeader")),
                "points": safe_float(row.get("Points")),
                "grid_position": safe_float(row.get("GridPosition")),
                "status": row.get("Status", ""),
            })

        return {
            "year": year,
            "round": round_number,
            "session": session_type,
            "event": session.event["EventName"],
            "results": results,
        }
    except Exception as e:
        logger.error(f"Session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/laps/{year}/{round_number}/{session_type}")
def get_all_laps(year: int, round_number: int, session_type: str = "R",
                 driver: str = Query(None)):
    """All lap times for a session, optionally filtered by driver abbreviation."""
    try:
        session = fastf1.get_session(year, round_number, session_type)
        session.load(laps=True, telemetry=False, weather=False, messages=False)

        laps = session.laps
        if driver:
            laps = laps[laps["Driver"] == driver.upper()]

        lap_list = []
        for _, row in laps.iterrows():
            lap_list.append({
                "driver": row["Driver"],
                "team": row.get("Team", ""),
                "lap_number": safe_float(row["LapNumber"]),
                "lap_time": timedelta_to_str(row["LapTime"]),
                "lap_time_seconds": safe_float(row["LapTime"].total_seconds() if pd.notna(row["LapTime"]) else None),
                "sector1": timedelta_to_str(row.get("Sector1Time")),
                "sector2": timedelta_to_str(row.get("Sector2Time")),
                "sector3": timedelta_to_str(row.get("Sector3Time")),
                "compound": row.get("Compound", ""),
                "tyre_life": safe_float(row.get("TyreLife")),
                "stint": safe_float(row.get("Stint")),
                "is_personal_best": bool(row.get("IsPersonalBest", False)),
                "pit_in_time": timedelta_to_str(row.get("PitInTime")),
                "pit_out_time": timedelta_to_str(row.get("PitOutTime")),
            })

        return {"laps": lap_list}
    except Exception as e:
        logger.error(f"Laps error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/telemetry/{year}/{round_number}/{session_type}")
def get_telemetry(
    year: int,
    round_number: int,
    session_type: str = "R",
    driver1: str = Query(...),
    driver2: str = Query(...),
    lap1: int = Query(None, description="Lap number for driver1 (fastest if omitted)"),
    lap2: int = Query(None, description="Lap number for driver2 (fastest if omitted)"),
):
    """
    Full lap telemetry for two drivers: speed, throttle, brake, RPM, gear, DRS.
    Resampled to 10 Hz for consistent distance axis.
    """
    try:
        session = fastf1.get_session(year, round_number, session_type)
        session.load(laps=True, telemetry=True, weather=False, messages=False)

        def get_lap_tel(drv, lap_num):
            drv_laps = session.laps.pick_driver(drv)
            if lap_num:
                lap = drv_laps[drv_laps["LapNumber"] == lap_num].iloc[0]
            else:
                lap = drv_laps.pick_fastest()
            tel = lap.get_car_data().add_distance()
            return lap, tel

        lap_obj1, tel1 = get_lap_tel(driver1.upper(), lap1)
        lap_obj2, tel2 = get_lap_tel(driver2.upper(), lap2)

        def tel_to_list(tel):
            return [
                {
                    "dist": safe_float(r["Distance"]),
                    "speed": safe_float(r["Speed"]),
                    "throttle": safe_float(r["Throttle"]),
                    "brake": int(r["Brake"]) if pd.notna(r.get("Brake")) else 0,
                    "rpm": safe_float(r.get("RPM")),
                    "gear": int(r["nGear"]) if pd.notna(r.get("nGear")) else None,
                    "drs": int(r.get("DRS", 0)) if pd.notna(r.get("DRS")) else 0,
                }
                for _, r in tel.iterrows()
            ]

        def lap_info(lap_obj, drv):
            return {
                "driver": drv,
                "lap_number": safe_float(lap_obj["LapNumber"]),
                "lap_time": timedelta_to_str(lap_obj["LapTime"]),
                "compound": lap_obj.get("Compound", ""),
                "tyre_life": safe_float(lap_obj.get("TyreLife")),
                "sector1": timedelta_to_str(lap_obj.get("Sector1Time")),
                "sector2": timedelta_to_str(lap_obj.get("Sector2Time")),
                "sector3": timedelta_to_str(lap_obj.get("Sector3Time")),
            }

        return {
            "driver1": {**lap_info(lap_obj1, driver1.upper()), "telemetry": tel_to_list(tel1)},
            "driver2": {**lap_info(lap_obj2, driver2.upper()), "telemetry": tel_to_list(tel2)},
        }

    except IndexError:
        raise HTTPException(status_code=404, detail="Driver or lap not found in session")
    except Exception as e:
        logger.error(f"Telemetry error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/track/{year}/{round_number}")
def get_track_map(year: int, round_number: int):
    """
    Track layout coordinates for the circuit (from fastest lap telemetry).
    Returns X/Y normalised to [0,1] for SVG rendering.
    """
    try:
        session = fastf1.get_session(year, round_number, "R")
        session.load(laps=True, telemetry=True, weather=False, messages=False)

        fastest = session.laps.pick_fastest()
        pos = fastest.get_pos_data()

        x = pos["X"].values.astype(float)
        y = pos["Y"].values.astype(float)

        # Normalize to [0, 1]
        xn = ((x - x.min()) / (x.max() - x.min())).tolist()
        yn = ((y - y.min()) / (y.max() - y.min())).tolist()

        return {"x": xn, "y": yn, "count": len(xn)}
    except Exception as e:
        logger.error(f"Track map error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/weather/{year}/{round_number}/{session_type}")
def get_weather(year: int, round_number: int, session_type: str = "R"):
    """Race weather data."""
    try:
        session = fastf1.get_session(year, round_number, session_type)
        session.load(laps=False, telemetry=False, weather=True, messages=False)

        weather = session.weather_data
        rows = []
        for _, r in weather.iterrows():
            rows.append({
                "time": str(r.get("Time")),
                "air_temp": safe_float(r.get("AirTemp")),
                "track_temp": safe_float(r.get("TrackTemp")),
                "humidity": safe_float(r.get("Humidity")),
                "pressure": safe_float(r.get("Pressure")),
                "wind_speed": safe_float(r.get("WindSpeed")),
                "wind_direction": safe_float(r.get("WindDirection")),
                "rainfall": bool(r.get("Rainfall", False)),
            })
        return {"weather": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/drivers/{year}/{round_number}/{session_type}")
def get_drivers(year: int, round_number: int, session_type: str = "R"):
    """List of drivers in a session with team colours."""
    try:
        session = fastf1.get_session(year, round_number, session_type)
        session.load(laps=False, telemetry=False, weather=False, messages=False)

        drivers = []
        for _, row in session.results.iterrows():
            drivers.append({
                "abbreviation": row.get("Abbreviation", ""),
                "full_name": row.get("FullName", ""),
                "number": str(row.get("DriverNumber", "")),
                "team": row.get("TeamName", ""),
                "team_color": "#" + str(row.get("TeamColor", "888888")),
            })
        return {"drivers": drivers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
