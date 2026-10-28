"""
Elexon Data Fetcher & Ingestion Script
Fetches FUELHH (Actuals) and WINDFOR (Forecasts) for January 2026 wholesale purchase decisions.
Covers publication and delivery windows from 2025-12-30T00:00:00Z through 2026-02-02T23:59:59Z.
"""
import os
import json
import time
import urllib.request
from datetime import datetime, timedelta

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", "app", "cache")
OUTPUT_FILE = os.path.join(CACHE_DIR, "elexon_jan_2026.json")

BASE_URL_FUEL = "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream"
BASE_URL_WIND = "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream"

def fetch_chunk(base_url: str, dt_from: str, dt_to: str, retries: int = 3):
    url = f"{base_url}?publishDateTimeFrom={dt_from}&publishDateTimeTo={dt_to}"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "UK-Energy-Procurement-Desk/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data
        except Exception as e:
            print(f"  Attempt {attempt + 1} failed for {dt_from} to {dt_to}: {e}")
            time.sleep(2)
    return []

def main():
    os.makedirs(CACHE_DIR, exist_ok=True)
    print("=== Starting Elexon Data Ingestion for January 2026 ===")
    
    # We cover from Dec 30 2025 to Feb 2 2026 in 5-day intervals
    start_dt = datetime(2025, 12, 30, 0, 0, 0)
    end_dt = datetime(2026, 2, 2, 23, 59, 59)
    
    fuel_records = []
    wind_records = []
    
    curr = start_dt
    chunk_days = 4
    
    while curr < end_dt:
        next_dt = min(curr + timedelta(days=chunk_days), end_dt)
        f_from = curr.strftime("%Y-%m-%dT%H:%M:%SZ")
        f_to = next_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        print(f"Fetching chunk {f_from} -> {f_to}...")
        
        # 1. Fetch FUELHH
        raw_fuel = fetch_chunk(BASE_URL_FUEL, f_from, f_to)
        wind_actuals = [
            {
                "publishTime": r.get("publishTime"),
                "startTime": r.get("startTime"),
                "settlementDate": r.get("settlementDate"),
                "settlementPeriod": r.get("settlementPeriod"),
                "generation": r.get("generation", 0)
            }
            for r in raw_fuel if r.get("fuelType") == "WIND"
        ]
        fuel_records.extend(wind_actuals)
        print(f"  FUELHH (Wind): {len(wind_actuals)} records (total: {len(fuel_records)})")
        
        # 2. Fetch WINDFOR
        raw_wind = fetch_chunk(BASE_URL_WIND, f_from, f_to)
        wind_forecasts = [
            {
                "publishTime": r.get("publishTime"),
                "startTime": r.get("startTime"),
                "generation": r.get("generation", 0)
            }
            for r in raw_wind
        ]
        wind_records.extend(wind_forecasts)
        print(f"  WINDFOR: {len(wind_forecasts)} records (total: {len(wind_records)})")
        
        curr = next_dt
        time.sleep(0.5)  # respectful delay between chunks
    
    # Deduplicate records by key
    # For actuals: (startTime) is unique
    fuel_dict = {}
    for r in fuel_records:
        st = r["startTime"]
        if st and (st not in fuel_dict or r["publishTime"] > fuel_dict[st]["publishTime"]):
            fuel_dict[st] = r
    
    # For forecasts: (publishTime, startTime) is unique
    wind_dict = {}
    for r in wind_records:
        key = (r["publishTime"], r["startTime"])
        if r["publishTime"] and r["startTime"]:
            wind_dict[key] = r
            
    dedup_fuel = sorted(fuel_dict.values(), key=lambda x: x["startTime"])
    dedup_wind = sorted(wind_dict.values(), key=lambda x: (x["publishTime"], x["startTime"]))
    
    output_data = {
        "metadata": {
            "source": "Elexon BMRS Insights Solution",
            "datasets": ["FUELHH (fuelType=WIND)", "WINDFOR"],
            "fetchedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "scope": "January 2026 Wholesale Day-Ahead Procurement Decisions",
            "fuelCount": len(dedup_fuel),
            "windForecastCount": len(dedup_wind),
            "fuelStartTimeMin": dedup_fuel[0]["startTime"] if dedup_fuel else None,
            "fuelStartTimeMax": dedup_fuel[-1]["startTime"] if dedup_fuel else None,
            "windPublishTimeMin": dedup_wind[0]["publishTime"] if dedup_wind else None,
            "windPublishTimeMax": dedup_wind[-1]["publishTime"] if dedup_wind else None,
        },
        "actuals": dedup_fuel,
        "forecasts": dedup_wind
    }
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)
        
    print(f"\n[SUCCESS] Successfully written {len(dedup_fuel)} actuals and {len(dedup_wind)} forecasts to {OUTPUT_FILE}")
    print(f"File size: {os.path.getsize(OUTPUT_FILE) / 1024:.1f} KB")

if __name__ == "__main__":
    main()
