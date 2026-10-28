"""
Unit Tests for Data Pipeline, Error Metrics Engine, and Procurement Simulator
"""
import os
import sys
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.elexon_client import elexon_client
from app.services.data_pipeline import data_pipeline
from app.services.error_metrics import error_metrics_engine
from app.services.procurement import procurement_simulator

def test_cache_loaded():
    """Verify that cached actuals and forecasts for January 2026 are present."""
    actuals = elexon_client.get_actuals()
    forecasts = elexon_client.get_forecasts()
    assert len(actuals) > 1000, f"Expected >1000 actuals, got {len(actuals)}"
    assert len(forecasts) > 5000, f"Expected >5000 forecasts, got {len(forecasts)}"

def test_available_dates():
    """Verify available decision and delivery dates in January 2026."""
    dates = data_pipeline.get_available_dates()
    assert "deliveryDates" in dates
    assert "decisionDates" in dates
    assert "2026-01-05" in dates["deliveryDates"]
    assert "2026-01-31" in dates["deliveryDates"]

def test_day_ahead_schedule_matching():
    """Verify that day-ahead gate closure matching produces valid hourly points."""
    res = data_pipeline.get_day_ahead_schedule(
        decision_date="2026-01-05",
        gate_closure_time="11:00",
        resolution="hourly"
    )
    assert res["decisionDate"] == "2026-01-05"
    assert res["deliveryDate"] == "2026-01-06"
    assert res["totalPeriods"] == 24
    assert len(res["points"]) == 24
    
    # Check that points have forecast and actual values
    matched_pts = [p for p in res["points"] if p["forecastGenerationMW"] is not None and p["actualGenerationMW"] is not None]
    assert len(matched_pts) > 0, "Expected matched hourly points"
    
    # Check that lead time is positive (forecast published prior to delivery)
    for p in matched_pts:
        if p["leadTimeHours"] is not None:
            assert p["leadTimeHours"] > 0, f"Lead time must be positive, got {p['leadTimeHours']}"

def test_monthly_accuracy_metrics():
    """Verify quantitative error evaluation across January 2026."""
    metrics = error_metrics_engine.evaluate_month(gate_closure_time="11:00")
    
    assert metrics["totalEvaluatedHours"] > 600, f"Expected >600 evaluated hours, got {metrics['totalEvaluatedHours']}"
    assert metrics["overallMAE"] > 0, "MAE must be positive"
    assert metrics["overallRMSE"] >= metrics["overallMAE"], "RMSE must be >= MAE"
    assert 0 <= metrics["overallWMAPE"] <= 100, "WMAPE must be a reasonable percentage"
    assert "p10ErrorMW" in metrics
    assert "p90ErrorMW" in metrics
    assert metrics["p90ErrorMW"] > metrics["p10ErrorMW"], "P90 error must be greater than P10 error"
    assert len(metrics["diurnalProfile"]) == 24, "Diurnal profile must cover 24 hours"
    assert len(metrics["regimes"]) >= 3, "Regimes must cover Low, Medium, and High wind"

def test_procurement_simulation():
    """Verify utility thermal procurement simulation with risk margin."""
    sim = procurement_simulator.simulate(
        delivery_date="2026-01-06",
        customer_demand_mw=25000.0,
        risk_tolerance_percentile=90,
        gate_closure_time="11:00"
    )
    assert sim["deliveryDate"] == "2026-01-06"
    assert sim["totalDailyDemandMWh"] > 0
    assert sim["recommendedDailyThermalMWh"] >= sim["nominalDailyThermalMWh"], "Risk-adjusted procurement must provide safety buffer"
    assert len(sim["hourlySchedule"]) == 24
