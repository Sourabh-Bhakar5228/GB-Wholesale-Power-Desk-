"""
Utility Thermal Procurement & Risk-Adjusted Decision Simulator
Models wholesale day-ahead thermal procurement decisions to meet consumer demand
incorporating quantified wind forecast error margins and cash-out imbalance risks.
"""
import logging
from typing import Dict, List, Any, Optional
import numpy as np

from app.config import (
    DEFAULT_GATE_CLOSURE_TIME,
    DEFAULT_IMBALANCE_CASH_OUT_PENALTY_GBP_PER_MWH,
    DEFAULT_THERMAL_SRMC_GBP_PER_MWH
)
from app.services.data_pipeline import data_pipeline
from app.services.error_metrics import error_metrics_engine

logger = logging.getLogger(__name__)

class ProcurementSimulator:
    def simulate(
        self,
        delivery_date: str,
        customer_demand_mw: float = 25000.0,
        risk_tolerance_percentile: int = 90,  # e.g. 90 = P90 downside protection
        gate_closure_time: str = DEFAULT_GATE_CLOSURE_TIME,
        imbalance_cashout_gbp: float = DEFAULT_IMBALANCE_CASH_OUT_PENALTY_GBP_PER_MWH,
        thermal_srmc_gbp: float = DEFAULT_THERMAL_SRMC_GBP_PER_MWH
    ) -> Dict[str, Any]:
        """
        Simulates the day-ahead wholesale procurement decision for a utility.
        """
        # 1. Fetch day-ahead schedule
        schedule = data_pipeline.get_day_ahead_schedule(
            delivery_date=delivery_date,
            gate_closure_time=gate_closure_time,
            resolution="hourly"
        )
        
        # 2. Fetch monthly error metrics to obtain empirical risk buffer percentiles
        monthly_metrics = error_metrics_engine.evaluate_month(gate_closure_time=gate_closure_time)
        
        # In wind forecasting, over-forecasting (Forecast > Actual) creates a generation shortfall
        # requiring expensive cashout. The error is (Forecast - Actual).
        # Positive errors mean forecast exceeded actual.
        # P90 error represents the 90th percentile over-forecast margin.
        if risk_tolerance_percentile >= 95:
            buffer_factor = monthly_metrics.get("p95ErrorMW", 3500.0)
        elif risk_tolerance_percentile >= 90:
            buffer_factor = monthly_metrics.get("p90ErrorMW", 2500.0)
        elif risk_tolerance_percentile >= 75:
            buffer_factor = monthly_metrics.get("p75ErrorMW", 1500.0)
        elif risk_tolerance_percentile >= 50:
            buffer_factor = max(0.0, monthly_metrics.get("overallBiasMW", 500.0))
        else:
            buffer_factor = 0.0

        # Also account for diurnal shaping: demand is higher during day/evening
        # We model a realistic UK diurnal demand profile around the base customer_demand_mw
        # Hours 0-5: 0.85x, 6-9: 1.1x, 10-16: 1.05x, 17-20: 1.2x (peak), 21-23: 0.95x
        diurnal_weights = [
            0.82, 0.80, 0.78, 0.78, 0.82, 0.92,
            1.08, 1.15, 1.18, 1.12, 1.08, 1.06,
            1.05, 1.04, 1.05, 1.08, 1.15, 1.25,
            1.22, 1.16, 1.08, 1.00, 0.92, 0.85
        ]

        hourly_results = []
        total_nominal_thermal_mwh = 0.0
        total_recommended_thermal_mwh = 0.0
        total_unhedged_imbalance_mwh = 0.0
        total_hedged_imbalance_mwh = 0.0

        for pt in schedule["points"]:
            h = pt.get("hour", 0)
            weight = diurnal_weights[h] if h < len(diurnal_weights) else 1.0
            demand_h = round(customer_demand_mw * weight, 1)
            
            wind_fc = pt.get("forecastGenerationMW") or 0.0
            wind_act = pt.get("actualGenerationMW")
            
            # Nominal Thermal Needed without safety margin:
            nominal_thermal = max(0.0, demand_h - wind_fc)
            total_nominal_thermal_mwh += nominal_thermal
            
            # Risk-Adjusted Wind Credit (derated by buffer factor, scaled to wind level)
            # Scaling: if wind_fc is low, buffer shouldn't exceed forecast
            scaled_buffer = min(wind_fc * 0.4, buffer_factor * (wind_fc / max(1.0, monthly_metrics.get("overallMAE", 2000.0))))
            scaled_buffer = round(max(0.0, scaled_buffer), 1)
            
            wind_credit = max(0.0, wind_fc - scaled_buffer)
            rec_thermal = round(max(0.0, demand_h - wind_credit), 1)
            total_recommended_thermal_mwh += rec_thermal

            # Realized net balance under actual wind
            unhedged_imbalance = None
            hedged_imbalance = None
            cost_saving = None

            if wind_act is not None:
                # If unhedged: Procured = nominal_thermal + wind_act vs demand_h
                # Net position = (nominal_thermal + wind_act) - demand_h
                unhedged_net = (nominal_thermal + wind_act) - demand_h
                # If negative, utility was short by |unhedged_net| and had to pay cashout
                if unhedged_net < 0:
                    total_unhedged_imbalance_mwh += abs(unhedged_net)

                # If hedged: Procured = rec_thermal + wind_act vs demand_h
                hedged_net = (rec_thermal + wind_act) - demand_h
                if hedged_net < 0:
                    total_hedged_imbalance_mwh += abs(hedged_net)

                # Cost comparison:
                # Unhedged cost = nominal_thermal * thermal_srmc + max(0, -unhedged_net) * imbalance_cashout
                # Hedged cost = rec_thermal * thermal_srmc + max(0, -hedged_net) * imbalance_cashout
                cost_unhedged = (nominal_thermal * thermal_srmc_gbp) + (max(0.0, -unhedged_net) * imbalance_cashout_gbp)
                cost_hedged = (rec_thermal * thermal_srmc_gbp) + (max(0.0, -hedged_net) * imbalance_cashout_gbp)
                cost_saving = round(cost_unhedged - cost_hedged, 2)

            hourly_results.append({
                "hour": h,
                "startTime": pt["startTime"],
                "demandMW": demand_h,
                "windForecastMW": wind_fc,
                "actualWindMW": wind_act,
                "nominalThermalMW": round(nominal_thermal, 1),
                "riskBufferMW": scaled_buffer,
                "recommendedThermalProcurementMW": rec_thermal,
                "netImbalanceUnhedgedMW": round(unhedged_net, 1) if wind_act is not None else None,
                "netImbalanceHedgedMW": round(hedged_net, 1) if wind_act is not None else None,
                "hourlyCostSavingGBP": cost_saving
            })

        # Total savings calculation
        total_savings = sum(x["hourlyCostSavingGBP"] for x in hourly_results if x["hourlyCostSavingGBP"] is not None)

        return {
            "deliveryDate": delivery_date,
            "decisionDate": schedule["decisionDate"],
            "gateClosureTime": gate_closure_time,
            "customerDemandBaseMW": customer_demand_mw,
            "riskTolerancePercentile": risk_tolerance_percentile,
            "bufferFactorMW": round(buffer_factor, 1),
            "totalDailyDemandMWh": round(sum(x["demandMW"] for x in hourly_results), 1),
            "nominalDailyThermalMWh": round(total_nominal_thermal_mwh, 1),
            "recommendedDailyThermalMWh": round(total_recommended_thermal_mwh, 1),
            "unhedgedImbalanceExposureRiskMWh": round(total_unhedged_imbalance_mwh, 1),
            "hedgedImbalanceExposureMWh": round(total_hedged_imbalance_mwh, 1),
            "imbalanceReductionMWh": round(max(0.0, total_unhedged_imbalance_mwh - total_hedged_imbalance_mwh), 1),
            "estimatedFinancialSavingGBP": round(total_savings, 2),
            "imbalanceCashoutRateGBP": imbalance_cashout_gbp,
            "thermalSRMCRateGBP": thermal_srmc_gbp,
            "hourlySchedule": hourly_results
        }

# Global singleton
procurement_simulator = ProcurementSimulator()
