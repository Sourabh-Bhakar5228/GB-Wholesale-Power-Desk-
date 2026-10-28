"""
Application Configuration and UK Market Constants
"""
import os
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, "cache")
DEFAULT_CACHE_FILE = os.path.join(CACHE_DIR, "elexon_jan_2026.json")

# UK Day-Ahead Market Gate Closures (GMT)
# EPEX SPOT UK Day-Ahead Auction: 11:00 GMT (Cutoff for traders typically 10:30-11:00)
# Nord Pool GB Day-Ahead: 11:00 GMT
# ESO Day-Ahead Schedule freeze: 17:00 GMT
DEFAULT_GATE_CLOSURE_TIME = "11:00"

# Elexon Insights Solution Endpoints
ELEXON_FUELHH_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream"
ELEXON_WINDFOR_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream"

# Typical GB National Power Characteristics (for procurement simulation)
GB_TYPICAL_PEAK_DEMAND_MW = 38000.0
GB_TYPICAL_OFFPEAK_DEMAND_MW = 22000.0
DEFAULT_IMBALANCE_CASH_OUT_PENALTY_GBP_PER_MWH = 95.0
DEFAULT_THERMAL_SRMC_GBP_PER_MWH = 75.0  # CCGT Short Run Marginal Cost
