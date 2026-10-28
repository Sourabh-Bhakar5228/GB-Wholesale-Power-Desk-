"""
Quantitative Error Metrics Engine for Renewable Wind Forecasts
Computes MAE, RMSE, MAPE, WMAPE, Bias, Correlation R^2, Percentile Risk Bands,
Diurnal Settlement Profiles, and Wind Generation Regimes across January 2026.
"""
import logging
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd

from app.config import DEFAULT_GATE_CLOSURE_TIME
from app.services.data_pipeline import data_pipeline

logger = logging.getLogger(__name__)

class ErrorMetricsEngine:
    def __init__(self):
        self._cached_monthly_metrics: Optional[Dict[str, Any]] = None

    def evaluate_month(
        self,
        gate_closure_time: str = DEFAULT_GATE_CLOSURE_TIME,
        force_recompute: bool = False
    ) -> Dict[str, Any]:
        """
        Evaluates the entire month of January 2026 day-ahead decisions.
        Iterates over all decision days (2026-01-01 to 2026-01-31),
        collecting all matched forecast vs actual hourly points.
        """
        if self._cached_monthly_metrics and not force_recompute and self._cached_monthly_metrics.get("gateClosureTime") == gate_closure_time:
            return self._cached_monthly_metrics

        logger.info(f"Computing comprehensive accuracy metrics for January 2026 with gate closure {gate_closure_time}...")
        
        # We evaluate decisions made on each day of January 2026
        # Day D decisions for delivery on Day D+1 (delivery 2026-01-02 to 2026-02-01)
        # Plus decision on Dec 31 for delivery on Jan 1
        decision_dates = ["2025-12-31"] + [f"2026-01-{d:02d}" for d in range(1, 31)]
        
        all_points = []
        daily_breakdown = []

        for dec_date in decision_dates:
            try:
                res = data_pipeline.get_day_ahead_schedule(
                    decision_date=dec_date,
                    gate_closure_time=gate_closure_time,
                    resolution="hourly"
                )
                valid_pts = [p for p in res["points"] if p["errorMW"] is not None]
                if valid_pts:
                    all_points.extend(valid_pts)
                    daily_breakdown.append({
                        "decisionDate": res["decisionDate"],
                        "deliveryDate": res["deliveryDate"],
                        "maeMW": res["maeMW"],
                        "rmseMW": res["rmseMW"],
                        "wmapePercent": res["wmapePercent"],
                        "meanBiasMW": res["meanBiasMW"],
                        "meanForecastMW": res["meanForecastMW"],
                        "meanActualMW": res["meanActualMW"],
                        "pointsCount": len(valid_pts)
                    })
            except Exception as e:
                logger.warning(f"Error evaluating day {dec_date}: {e}")

        if not all_points:
            return {}

        df = pd.DataFrame(all_points)
        errors = df["errorMW"].values
        abs_errors = df["absoluteErrorMW"].values
        actuals = df["actualGenerationMW"].values
        forecasts = df["forecastGenerationMW"].values

        # 1. Core Summary Metrics
        mae = float(np.mean(abs_errors))
        rmse = float(np.sqrt(np.mean(np.square(errors))))
        bias = float(np.mean(errors))
        
        # Safe MAPE (filter out zero or tiny actuals < 100 MW to avoid division explosion)
        non_zero_mask = actuals > 100.0
        if np.any(non_zero_mask):
            mape = float(np.mean(np.abs(errors[non_zero_mask] / actuals[non_zero_mask])) * 100.0)
        else:
            mape = 0.0

        sum_actuals = float(np.sum(actuals))
        wmape = float((np.sum(abs_errors) / sum_actuals) * 100.0) if sum_actuals > 0 else 0.0

        # Correlation and R^2
        if len(forecasts) > 1 and np.std(actuals) > 0 and np.std(forecasts) > 0:
            corr_matrix = np.corrcoef(forecasts, actuals)
            corr_r = float(corr_matrix[0, 1])
            # R2 = 1 - SS_res / SS_tot
            ss_res = np.sum(np.square(actuals - forecasts))
            ss_tot = np.sum(np.square(actuals - np.mean(actuals)))
            r2 = float(1.0 - (ss_res / ss_tot)) if ss_tot > 0 else 0.0
        else:
            corr_r = 0.0
            r2 = 0.0

        # Over / Under Forecast Percentages
        over_fc_pct = float(np.mean(errors > 0) * 100.0)
        under_fc_pct = float(np.mean(errors < 0) * 100.0)

        # Error Percentiles (Risk margins)
        p5_err = float(np.percentile(errors, 5))
        p10_err = float(np.percentile(errors, 10))
        p25_err = float(np.percentile(errors, 25))
        p50_err = float(np.percentile(errors, 50))
        p75_err = float(np.percentile(errors, 75))
        p90_err = float(np.percentile(errors, 90))
        p95_err = float(np.percentile(errors, 95))

        p50_abs = float(np.percentile(abs_errors, 50))
        p90_abs = float(np.percentile(abs_errors, 90))
        p95_abs = float(np.percentile(abs_errors, 95))

        # 2. Histogram Distribution (15 bins)
        hist_counts, bin_edges = np.histogram(errors, bins=16)
        histogram = []
        for i in range(len(hist_counts)):
            bin_center = (bin_edges[i] + bin_edges[i+1]) / 2.0
            histogram.append({
                "binStart": round(float(bin_edges[i]), 0),
                "binEnd": round(float(bin_edges[i+1]), 0),
                "binCenter": round(float(bin_center), 0),
                "count": int(hist_counts[i]),
                "frequency": round(float(hist_counts[i]) / len(errors), 4)
            })

        # 3. Diurnal / Hourly Profile (24 hours)
        df["hour"] = pd.to_datetime(df["startTime"]).dt.hour
        hourly_grouped = df.groupby("hour")
        diurnal_profile = []
        for hour, grp in hourly_grouped:
            h_errs = grp["errorMW"].values
            h_abs_errs = grp["absoluteErrorMW"].values
            h_acts = grp["actualGenerationMW"].values
            h_fcs = grp["forecastGenerationMW"].values
            diurnal_profile.append({
                "hour": int(hour),
                "settlementPeriods": [int(hour * 2 + 1), int(hour * 2 + 2)],
                "maeMW": round(float(np.mean(h_abs_errs)), 1),
                "rmseMW": round(float(np.sqrt(np.mean(np.square(h_errs)))), 1),
                "biasMW": round(float(np.mean(h_errs)), 1),
                "meanActualMW": round(float(np.mean(h_acts)), 1),
                "meanForecastMW": round(float(np.mean(h_fcs)), 1),
                "sampleCount": len(grp)
            })
        diurnal_profile = sorted(diurnal_profile, key=lambda x: x["hour"])

        # 4. Wind Generation Regime Breakdown
        # Low: < 5000 MW, Medium: 5000-12000 MW, High: > 12000 MW
        regimes = [
            ("Low Wind", 0, 5000, "< 5,000 MW"),
            ("Medium Wind", 5000, 12000, "5,000 - 12,000 MW"),
            ("High Wind", 12000, 999999, "> 12,000 MW")
        ]
        regime_stats = []
        for name, r_min, r_max, label in regimes:
            sub = df[(df["actualGenerationMW"] >= r_min) & (df["actualGenerationMW"] < r_max)]
            if len(sub) > 0:
                s_errs = sub["errorMW"].values
                s_abs = sub["absoluteErrorMW"].values
                s_acts = sub["actualGenerationMW"].values
                s_sum_act = float(np.sum(s_acts))
                s_wmape = float((np.sum(s_abs) / s_sum_act) * 100.0) if s_sum_act > 0 else 0.0
                regime_stats.append({
                    "regimeName": name,
                    "generationRangeMW": label,
                    "sampleCount": len(sub),
                    "maeMW": round(float(np.mean(s_abs)), 1),
                    "rmseMW": round(float(np.sqrt(np.mean(np.square(s_errs)))), 1),
                    "wmapePercent": round(s_wmape, 2),
                    "biasMW": round(float(np.mean(s_errs)), 1)
                })

        result = {
            "scope": "January 2026 Wholesale Day-Ahead Procurement",
            "gateClosureTime": gate_closure_time,
            "totalEvaluatedHours": len(df),
            "overallMAE": round(mae, 1),
            "overallRMSE": round(rmse, 1),
            "overallMAPE": round(mape, 2),
            "overallWMAPE": round(wmape, 2),
            "overallBiasMW": round(bias, 1),
            "correlationR": round(corr_r, 4),
            "correlationR2": round(r2, 4),
            "overForecastPercentage": round(over_fc_pct, 1),
            "underForecastPercentage": round(under_fc_pct, 1),
            "p5ErrorMW": round(p5_err, 1),
            "p10ErrorMW": round(p10_err, 1),
            "p25ErrorMW": round(p25_err, 1),
            "p50ErrorMW": round(p50_err, 1),
            "p75ErrorMW": round(p75_err, 1),
            "p90ErrorMW": round(p90_err, 1),
            "p95ErrorMW": round(p95_err, 1),
            "p50AbsoluteErrorMW": round(p50_abs, 1),
            "p90AbsoluteErrorMW": round(p90_abs, 1),
            "p95AbsoluteErrorMW": round(p95_abs, 1),
            "histogram": histogram,
            "diurnalProfile": diurnal_profile,
            "regimes": regime_stats,
            "dailyBreakdown": daily_breakdown
        }

        self._cached_monthly_metrics = result
        return result

# Global singleton
error_metrics_engine = ErrorMetricsEngine()
