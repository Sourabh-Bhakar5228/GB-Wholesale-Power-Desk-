"""
FastAPI Backend Application
UK Wholesale Electricity Day-Ahead Wind Power Procurement & Forecast Evaluation API
"""
import os
import io
import csv
import logging
from typing import Optional
from fastapi import FastAPI, Query, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import DEFAULT_GATE_CLOSURE_TIME
from app.services.elexon_client import elexon_client
from app.services.data_pipeline import data_pipeline
from app.services.error_metrics import error_metrics_engine
from app.services.procurement import procurement_simulator
from app.models.schemas import ThermalProcurementSimulationRequest

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("app.main")

app = FastAPI(
    title="UK Energy Utility Day-Ahead Wind & Thermal Procurement Desk",
    description="Wholesale electricity procurement decision support & quantitative wind forecast evaluation API based on Elexon BMRS FUELHH & WINDFOR datasets.",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    meta = elexon_client.get_metadata()
    actuals = elexon_client.get_actuals()
    forecasts = elexon_client.get_forecasts()
    return {
        "status": "online",
        "service": "UK Day-Ahead Energy Procurement Desk",
        "datasets": meta.get("datasets", ["FUELHH", "WINDFOR"]),
        "cachedActualsCount": len(actuals),
        "cachedForecastsCount": len(forecasts),
        "lastSyncedAt": meta.get("fetchedAt") or meta.get("lastSyncedAt")
    }

@app.get("/api/dates")
def get_dates():
    """Returns all available decision and delivery dates in January 2026."""
    return data_pipeline.get_available_dates()

@app.get("/api/day-ahead")
def get_day_ahead_schedule(
    decision_date: Optional[str] = Query(None, description="Decision Date YYYY-MM-DD (e.g. 2026-01-05)"),
    delivery_date: Optional[str] = Query(None, description="Delivery Date YYYY-MM-DD (e.g. 2026-01-06)"),
    gate_closure_time: str = Query(DEFAULT_GATE_CLOSURE_TIME, description="Gate closure cutoff GMT (e.g. 11:00)"),
    resolution: str = Query("hourly", description="Resolution: 'hourly' (24 points) or 'half-hourly' (48 settlement periods)")
):
    """
    Goal 1: Retrieve the latest wind forecast available at day-ahead gate closure,
    aligned with actual generation delivered to the grid.
    """
    try:
        return data_pipeline.get_day_ahead_schedule(
            decision_date=decision_date,
            delivery_date=delivery_date,
            gate_closure_time=gate_closure_time,
            resolution=resolution
        )
    except Exception as e:
        logger.error(f"Error computing day-ahead schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/accuracy-metrics")
def get_accuracy_metrics(
    gate_closure_time: str = Query(DEFAULT_GATE_CLOSURE_TIME, description="Gate closure time cutoff (e.g. 11:00)")
):
    """
    Goal 2: Retrieve comprehensive quantitative forecast evaluation across January 2026,
    including MAE, RMSE, WMAPE, Bias, Error percentiles (P10-P95), and regime breakdowns.
    """
    try:
        return error_metrics_engine.evaluate_month(gate_closure_time=gate_closure_time)
    except Exception as e:
        logger.error(f"Error evaluating monthly accuracy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/forecast-evolution")
def get_forecast_evolution(
    delivery_date: str = Query(..., description="Delivery Date YYYY-MM-DD (e.g. 2026-01-15)")
):
    """
    Analyzes how wind forecasts evolved across successive publication runs as lead time diminished.
    """
    try:
        return data_pipeline.get_forecast_evolution(delivery_date=delivery_date)
    except Exception as e:
        logger.error(f"Error getting forecast evolution: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/procurement-simulation")
def simulate_procurement(req: ThermalProcurementSimulationRequest):
    """
    Client Pitch Decision Tool: Simulates optimal thermal procurement for a utility desk
    meeting consumer demand by factoring in quantified wind forecast uncertainty margins.
    """
    try:
        return procurement_simulator.simulate(
            delivery_date=req.deliveryDate,
            customer_demand_mw=req.customerDemandMW,
            risk_tolerance_percentile=req.riskTolerancePercentile,
            imbalance_cashout_gbp=req.imbalanceCashOutGBP,
            thermal_srmc_gbp=req.thermalSRMCGBP
        )
    except Exception as e:
        logger.error(f"Error in procurement simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/raw-data")
def get_raw_data(
    dataset: str = Query("actuals", description="'actuals' (FUELHH) or 'forecasts' (WINDFOR)"),
    search_date: Optional[str] = Query(None, description="Date filter YYYY-MM-DD"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    export_csv: bool = Query(False, description="Whether to download as CSV")
):
    """
    Inspect or export raw Elexon records for auditability and transparency.
    """
    records = elexon_client.get_actuals() if dataset == "actuals" else elexon_client.get_forecasts()
    
    if search_date:
        if dataset == "actuals":
            records = [r for r in records if r.get("startTime", "").startswith(search_date)]
        else:
            records = [r for r in records if r.get("publishTime", "").startswith(search_date) or r.get("startTime", "").startswith(search_date)]

    total_count = len(records)
    
    if export_csv:
        output = io.StringIO()
        if records:
            writer = csv.DictWriter(output, fieldnames=list(records[0].keys()))
            writer.writeheader()
            writer.writerows(records)
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=elexon_{dataset}_{search_date or 'jan2026'}.csv"}
        )

    paginated = records[offset : offset + limit]
    return {
        "dataset": dataset,
        "totalRecords": total_count,
        "offset": offset,
        "limit": limit,
        "records": paginated
    }

@app.post("/api/sync")
def sync_live_data(
    date_from: str = Query(..., description="Start UTC (e.g. 2026-01-01T00:00:00Z)"),
    date_to: str = Query(..., description="End UTC (e.g. 2026-01-02T00:00:00Z)")
):
    """Triggers live ingestion from Elexon BMRS API and updates cache."""
    try:
        return elexon_client.sync_live(date_from=date_from, date_to=date_to)
    except Exception as e:
        logger.error(f"Live sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount frontend build static files if present (for unified Docker production build)
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
