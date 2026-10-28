"""
Data Pipeline for UK Wholesale Day-Ahead Market Matching
Handles alignment between WINDFOR forecasts and FUELHH actuals based on
gate closure cut-offs, lead time calculation, and resolution aggregation.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple

import pandas as pd
import numpy as np

from app.config import DEFAULT_GATE_CLOSURE_TIME
from app.services.elexon_client import elexon_client

logger = logging.getLogger(__name__)

def parse_iso(dt_str: str) -> datetime:
    """Safely parse ISO datetime string with Z to UTC datetime."""
    dt_str = dt_str.replace("Z", "+00:00")
    return datetime.fromisoformat(dt_str)

class DataPipeline:
    def __init__(self):
        pass

    def get_available_dates(self) -> Dict[str, List[str]]:
        """Returns sorted list of available decision dates and delivery dates in January 2026."""
        actuals = elexon_client.get_actuals()
        forecasts = elexon_client.get_forecasts()
        
        act_dates = sorted(set(x["startTime"][:10] for x in actuals if "startTime" in x and x["startTime"].startswith("2026-01")))
        fc_dates = sorted(set(x["publishTime"][:10] for x in forecasts if "publishTime" in x and x["publishTime"].startswith("2026-01")))
        
        return {
            "deliveryDates": act_dates,
            "decisionDates": fc_dates
        }

    def get_day_ahead_schedule(
        self,
        decision_date: Optional[str] = None,
        delivery_date: Optional[str] = None,
        gate_closure_time: str = DEFAULT_GATE_CLOSURE_TIME,
        resolution: str = "hourly"  # 'hourly' or 'half-hourly'
    ) -> Dict[str, Any]:
        """
        Calculates the exact Day-Ahead Wind Forecast available to the trading desk
        prior to Gate Closure, matched with real-time actual generation.
        
        If decision_date is provided (e.g. '2026-01-05'), delivery_date is decision_date + 1 day ('2026-01-06').
        If delivery_date is provided (e.g. '2026-01-06'), decision_date is delivery_date - 1 day ('2026-01-05').
        Cut-off timestamp = {decision_date}T{gate_closure_time}:00Z.
        """
        if delivery_date and not decision_date:
            del_dt = datetime.strptime(delivery_date, "%Y-%m-%d")
            dec_dt = del_dt - timedelta(days=1)
            decision_date = dec_dt.strftime("%Y-%m-%d")
        elif decision_date and not delivery_date:
            dec_dt = datetime.strptime(decision_date, "%Y-%m-%d")
            del_dt = dec_dt + timedelta(days=1)
            delivery_date = del_dt.strftime("%Y-%m-%d")
        elif not decision_date and not delivery_date:
            # Default to Jan 5, 2026 decision -> Jan 6, 2026 delivery
            decision_date = "2026-01-05"
            delivery_date = "2026-01-06"

        cutoff_str = f"{decision_date}T{gate_closure_time}:00Z"
        cutoff_dt = parse_iso(cutoff_str)

        all_actuals = elexon_client.get_actuals()
        all_forecasts = elexon_client.get_forecasts()

        # 1. Filter actuals for the delivery date
        day_actuals = [x for x in all_actuals if x["startTime"].startswith(delivery_date)]
        actuals_by_time = {x["startTime"]: x for x in day_actuals}

        # 2. Filter forecasts for the delivery date published AT OR BEFORE the cutoff
        valid_forecasts = []
        for f in all_forecasts:
            if f["startTime"].startswith(delivery_date):
                f_pub = parse_iso(f["publishTime"])
                if f_pub <= cutoff_dt:
                    valid_forecasts.append(f)

        # For each target startTime, select the latest published forecast before cutoff
        latest_fc_by_target: Dict[str, Dict[str, Any]] = {}
        for f in valid_forecasts:
            st = f["startTime"]
            if st not in latest_fc_by_target or f["publishTime"] > latest_fc_by_target[st]["publishTime"]:
                latest_fc_by_target[st] = f

        points = []
        # Target start times for delivery day (hourly or half-hourly)
        if resolution == "hourly":
            # 24 hours: 00:00 to 23:00
            for h in range(24):
                st_hourly = f"{delivery_date}T{h:02d}:00:00Z"
                target_dt = parse_iso(st_hourly)
                
                # Wind forecast for this hour
                fc_record = latest_fc_by_target.get(st_hourly)
                fc_val = float(fc_record["generation"]) if fc_record else None
                pub_time = fc_record["publishTime"] if fc_record else None
                
                # Actual generation for this hour: average of SP(2h+1) and SP(2h+2)
                st_sp1 = f"{delivery_date}T{h:02d}:00:00Z"
                st_sp2 = f"{delivery_date}T{h:02d}:30:00Z"
                act1 = actuals_by_time.get(st_sp1)
                act2 = actuals_by_time.get(st_sp2)
                
                act_vals = []
                if act1 and act1.get("generation") is not None:
                    act_vals.append(float(act1["generation"]))
                if act2 and act2.get("generation") is not None:
                    act_vals.append(float(act2["generation"]))
                
                act_val = float(np.mean(act_vals)) if act_vals else None

                err_mw = (fc_val - act_val) if (fc_val is not None and act_val is not None) else None
                abs_err = abs(err_mw) if err_mw is not None else None
                pct_err = ((err_mw / act_val) * 100) if (err_mw is not None and act_val and act_val > 0) else None

                lead_hrs = None
                if pub_time:
                    lead_hrs = round((target_dt - parse_iso(pub_time)).total_seconds() / 3600.0, 1)

                points.append({
                    "startTime": st_hourly,
                    "hour": h,
                    "settlementPeriod": h * 2 + 1,  # Representative SP
                    "forecastGenerationMW": round(fc_val, 1) if fc_val is not None else None,
                    "actualGenerationMW": round(act_val, 1) if act_val is not None else None,
                    "forecastPublishTime": pub_time,
                    "errorMW": round(err_mw, 1) if err_mw is not None else None,
                    "absoluteErrorMW": round(abs_err, 1) if abs_err is not None else None,
                    "percentageError": round(pct_err, 1) if pct_err is not None else None,
                    "leadTimeHours": lead_hrs,
                    "isOverForecast": (err_mw > 0) if err_mw is not None else None
                })
        else:
            # Half-hourly resolution (48 settlement periods)
            sorted_actual_keys = sorted(actuals_by_time.keys())
            for idx, st in enumerate(sorted_actual_keys):
                sp_num = actuals_by_time[st].get("settlementPeriod", idx + 1)
                act_val = float(actuals_by_time[st].get("generation", 0))
                target_dt = parse_iso(st)
                
                # Check direct forecast or interpolate
                fc_record = latest_fc_by_target.get(st)
                if not fc_record:
                    # If hourly WINDFOR only, interpolate between hour start and next hour
                    base_h_st = st[:14] + "00:00Z"
                    fc_record = latest_fc_by_target.get(base_h_st)
                
                fc_val = float(fc_record["generation"]) if fc_record else None
                pub_time = fc_record["publishTime"] if fc_record else None

                err_mw = (fc_val - act_val) if (fc_val is not None and act_val is not None) else None
                abs_err = abs(err_mw) if err_mw is not None else None
                pct_err = ((err_mw / act_val) * 100) if (err_mw is not None and act_val and act_val > 0) else None

                lead_hrs = None
                if pub_time:
                    lead_hrs = round((target_dt - parse_iso(pub_time)).total_seconds() / 3600.0, 1)

                points.append({
                    "startTime": st,
                    "settlementPeriod": sp_num,
                    "forecastGenerationMW": round(fc_val, 1) if fc_val is not None else None,
                    "actualGenerationMW": round(act_val, 1) if act_val is not None else None,
                    "forecastPublishTime": pub_time,
                    "errorMW": round(err_mw, 1) if err_mw is not None else None,
                    "absoluteErrorMW": round(abs_err, 1) if abs_err is not None else None,
                    "percentageError": round(pct_err, 1) if pct_err is not None else None,
                    "leadTimeHours": lead_hrs,
                    "isOverForecast": (err_mw > 0) if err_mw is not None else None
                })

        # Summary statistics for this day
        valid_errs = [p["errorMW"] for p in points if p["errorMW"] is not None]
        valid_abs_errs = [p["absoluteErrorMW"] for p in points if p["absoluteErrorMW"] is not None]
        valid_fc = [p["forecastGenerationMW"] for p in points if p["forecastGenerationMW"] is not None]
        valid_act = [p["actualGenerationMW"] for p in points if p["actualGenerationMW"] is not None]

        mae = float(np.mean(valid_abs_errs)) if valid_abs_errs else 0.0
        rmse = float(np.sqrt(np.mean(np.square(valid_errs)))) if valid_errs else 0.0
        bias = float(np.mean(valid_errs)) if valid_errs else 0.0
        sum_act = sum(valid_act) if valid_act else 1.0
        wmape = (sum(valid_abs_errs) / sum_act * 100) if sum_act > 0 else 0.0

        max_over = max([e for e in valid_errs if e > 0], default=0.0)
        max_under = abs(min([e for e in valid_errs if e < 0], default=0.0))

        return {
            "decisionDate": decision_date,
            "deliveryDate": delivery_date,
            "gateClosureTime": gate_closure_time,
            "decisionCutoffTimestamp": cutoff_str,
            "totalPeriods": len(points),
            "meanForecastMW": round(float(np.mean(valid_fc)), 1) if valid_fc else 0.0,
            "meanActualMW": round(float(np.mean(valid_act)), 1) if valid_act else 0.0,
            "maeMW": round(mae, 1),
            "rmseMW": round(rmse, 1),
            "wmapePercent": round(wmape, 2),
            "meanBiasMW": round(bias, 1),
            "maxOverForecastMW": round(max_over, 1),
            "maxUnderForecastMW": round(max_under, 1),
            "points": points
        }

    def get_forecast_evolution(self, delivery_date: str) -> Dict[str, Any]:
        """
        Extracts multiple forecast runs for the same delivery date across different publication times
        (e.g., 48h, 36h, 24h, 12h, 4h ahead), showing how forecast accuracy evolved.
        """
        all_forecasts = elexon_client.get_forecasts()
        all_actuals = elexon_client.get_actuals()

        # Actuals for delivery date
        day_actuals = [x for x in all_actuals if x["startTime"].startswith(delivery_date)]
        # Map hourly actuals
        hourly_actuals = {}
        for h in range(24):
            st_sp1 = f"{delivery_date}T{h:02d}:00:00Z"
            st_sp2 = f"{delivery_date}T{h:02d}:30:00Z"
            a1 = next((x["generation"] for x in day_actuals if x["startTime"] == st_sp1), None)
            a2 = next((x["generation"] for x in day_actuals if x["startTime"] == st_sp2), None)
            vals = [v for v in [a1, a2] if v is not None]
            hourly_actuals[h] = round(float(np.mean(vals)), 1) if vals else None

        # Filter forecasts for this delivery date
        matched_fc = [f for f in all_forecasts if f["startTime"].startswith(delivery_date)]
        
        # Group by publishTime
        grouped_by_pub: Dict[str, List[Dict[str, Any]]] = {}
        for f in matched_fc:
            grouped_by_pub.setdefault(f["publishTime"], []).append(f)

        delivery_start_dt = parse_iso(f"{delivery_date}T00:00:00Z")
        
        runs = []
        for pub_time in sorted(grouped_by_pub.keys()):
            pub_dt = parse_iso(pub_time)
            # Lead time to start of delivery day
            lead_hrs = round((delivery_start_dt - pub_dt).total_seconds() / 3600.0, 1)
            
            # Map by hour
            hour_map = {}
            for item in grouped_by_pub[pub_time]:
                h = int(item["startTime"][11:13])
                hour_map[h] = item["generation"]
            
            # Build 24 points
            pts = []
            for h in range(24):
                fc_val = hour_map.get(h)
                pts.append({
                    "hour": h,
                    "startTime": f"{delivery_date}T{h:02d}:00:00Z",
                    "forecastMW": fc_val,
                    "actualMW": hourly_actuals.get(h)
                })
                
            runs.append({
                "publishTime": pub_time,
                "leadTimeHours": lead_hrs,
                "points": pts
            })

        # Pick a representative set of runs across different lead times (e.g. up to 5-6 distinct runs)
        if len(runs) > 6:
            # Sample evenly
            step = max(1, len(runs) // 5)
            selected_runs = runs[::step]
            if runs[-1] not in selected_runs:
                selected_runs.append(runs[-1])
        else:
            selected_runs = runs

        return {
            "deliveryDate": delivery_date,
            "runs": selected_runs,
            "actuals": [{"hour": h, "actualMW": hourly_actuals[h]} for h in range(24)]
        }

# Global singleton pipeline
data_pipeline = DataPipeline()
