"""
Elexon Data Access Service
Handles reading cached FUELHH (wind actuals) and WINDFOR (forecasts) data,
as well as on-demand live fetching and synchronization.
"""
import os
import json
import logging
import urllib.request
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

from app.config import (
    DEFAULT_CACHE_FILE,
    ELEXON_FUELHH_URL,
    ELEXON_WINDFOR_URL
)

logger = logging.getLogger(__name__)

class ElexonClient:
    def __init__(self, cache_file: str = DEFAULT_CACHE_FILE):
        self.cache_file = cache_file
        self._data: Optional[Dict[str, Any]] = None
        self._load_cache()

    def _load_cache(self) -> None:
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
                logger.info(f"Loaded {len(self._data.get('actuals', []))} actuals and {len(self._data.get('forecasts', []))} forecasts from cache.")
            except Exception as e:
                logger.error(f"Error loading cache file {self.cache_file}: {e}")
                self._data = {"metadata": {}, "actuals": [], "forecasts": []}
        else:
            logger.warning(f"Cache file {self.cache_file} does not exist.")
            self._data = {"metadata": {}, "actuals": [], "forecasts": []}

    def get_metadata(self) -> Dict[str, Any]:
        return self._data.get("metadata", {}) if self._data else {}

    def get_actuals(self) -> List[Dict[str, Any]]:
        return self._data.get("actuals", []) if self._data else []

    def get_forecasts(self) -> List[Dict[str, Any]]:
        return self._data.get("forecasts", []) if self._data else []

    def sync_live(self, date_from: str, date_to: str) -> Dict[str, Any]:
        """
        Sync live data from Elexon BMRS for a custom date range and update cache.
        date_from, date_to: ISO strings, e.g. '2026-01-01T00:00:00Z'
        """
        logger.info(f"Live fetching Elexon data from {date_from} to {date_to}...")
        
        # 1. Fetch FUELHH
        url_fuel = f"{ELEXON_FUELHH_URL}?publishDateTimeFrom={date_from}&publishDateTimeTo={date_to}"
        req_fuel = urllib.request.Request(url_fuel, headers={"User-Agent": "UK-Energy-Procurement-Desk/1.0"})
        with urllib.request.urlopen(req_fuel, timeout=30) as r:
            raw_fuel = json.loads(r.read().decode("utf-8"))
        new_actuals = [
            {
                "publishTime": x.get("publishTime"),
                "startTime": x.get("startTime"),
                "settlementDate": x.get("settlementDate"),
                "settlementPeriod": x.get("settlementPeriod"),
                "generation": x.get("generation", 0)
            }
            for x in raw_fuel if x.get("fuelType") == "WIND"
        ]

        # 2. Fetch WINDFOR
        url_wind = f"{ELEXON_WINDFOR_URL}?publishDateTimeFrom={date_from}&publishDateTimeTo={date_to}"
        req_wind = urllib.request.Request(url_wind, headers={"User-Agent": "UK-Energy-Procurement-Desk/1.0"})
        with urllib.request.urlopen(req_wind, timeout=30) as r:
            raw_wind = json.loads(r.read().decode("utf-8"))
        new_forecasts = [
            {
                "publishTime": x.get("publishTime"),
                "startTime": x.get("startTime"),
                "generation": x.get("generation", 0)
            }
            for x in raw_wind
        ]

        # Merge with existing
        existing_actuals = {x["startTime"]: x for x in self.get_actuals()}
        for a in new_actuals:
            existing_actuals[a["startTime"]] = a
            
        existing_forecasts = {(x["publishTime"], x["startTime"]): x for x in self.get_forecasts()}
        for f in new_forecasts:
            existing_forecasts[(f["publishTime"], f["startTime"])] = f

        updated_data = {
            "metadata": {
                **self.get_metadata(),
                "lastSyncedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "fuelCount": len(existing_actuals),
                "windForecastCount": len(existing_forecasts)
            },
            "actuals": sorted(existing_actuals.values(), key=lambda x: x["startTime"]),
            "forecasts": sorted(existing_forecasts.values(), key=lambda x: (x["publishTime"], x["startTime"]))
        }

        self._data = updated_data
        with open(self.cache_file, "w", encoding="utf-8") as f:
            json.dump(updated_data, f, indent=2)

        return {
            "syncedActualsCount": len(new_actuals),
            "syncedForecastsCount": len(new_forecasts),
            "totalActuals": len(updated_data["actuals"]),
            "totalForecasts": len(updated_data["forecasts"])
        }

# Global singleton client
elexon_client = ElexonClient()
