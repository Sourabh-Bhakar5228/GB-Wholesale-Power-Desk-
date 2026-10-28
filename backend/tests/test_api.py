"""
Integration Tests for FastAPI Endpoints
"""
import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert data["cachedActualsCount"] > 1000
    assert data["cachedForecastsCount"] > 5000

def test_dates_endpoint():
    res = client.get("/api/dates")
    assert res.status_code == 200
    data = res.json()
    assert len(data["deliveryDates"]) > 0

def test_day_ahead_endpoint():
    res = client.get("/api/day-ahead?decision_date=2026-01-05&gate_closure_time=11:00&resolution=hourly")
    assert res.status_code == 200
    data = res.json()
    assert data["decisionDate"] == "2026-01-05"
    assert data["deliveryDate"] == "2026-01-06"
    assert len(data["points"]) == 24

def test_accuracy_metrics_endpoint():
    res = client.get("/api/accuracy-metrics?gate_closure_time=11:00")
    assert res.status_code == 200
    data = res.json()
    assert data["overallMAE"] > 0
    assert "histogram" in data
    assert "regimes" in data

def test_forecast_evolution_endpoint():
    res = client.get("/api/forecast-evolution?delivery_date=2026-01-10")
    assert res.status_code == 200
    data = res.json()
    assert data["deliveryDate"] == "2026-01-10"
    assert len(data["runs"]) > 0

def test_procurement_simulation_endpoint():
    payload = {
        "deliveryDate": "2026-01-06",
        "customerDemandMW": 24000.0,
        "riskTolerancePercentile": 90
    }
    res = client.post("/api/procurement-simulation", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "recommendedDailyThermalMWh" in data
    assert len(data["hourlySchedule"]) == 24

def test_raw_data_endpoint():
    res = client.get("/api/raw-data?dataset=actuals&limit=10")
    assert res.status_code == 200
    data = res.json()
    assert len(data["records"]) == 10
