# GB Wholesale Power Desk | UK Day-Ahead Renewable Procurement & Forecast Evaluation Portal

[![Tests](https://img.shields.io/badge/tests-12%20passed-10b981.svg)](#testing)
[![Python](https://img.shields.io/badge/python-3.11%20%7C%203.13%20%7C%203.14-06b6d4.svg)](https://python.org)
[![React](https://img.shields.io/badge/frontend-React%2018%20%2B%20Vite-6366f1.svg)](https://reactjs.org)
[![Docker](https://img.shields.io/badge/docker-ready-38bdf8.svg)](Dockerfile)
[![License](https://img.shields.io/badge/license-MIT-slate.svg)](LICENSE)

An institutional-grade decision support and forecast risk analytics platform developed for **UK electricity utilities** procuring power in the **Day-Ahead Wholesale Electricity Market** (EPEX SPOT UK & Nord Pool GB).

Built using national actuals and forecast streams from **Elexon BMRS** (`FUELHH` wind actuals and `WINDFOR` wind forecasts) for purchase decisions made throughout **January 2026**.

---

## 1. Executive Summary & Problem Setting

### The Utility Desk's Challenge
An energy utility in the UK needs to purchase wholesale power one day before the delivery day to serve consumer demand. To avoid over-relying on costly thermal generation (CCGT, peakers) while protecting against volatile cash-out imbalance penalties, the trading desk needs to answer two fundamental questions:
1. **Goal 1 (Decision Visibility)**: *What is the latest renewable (wind) generation forecast available when we submit our Day-Ahead auction orders at 11:00 GMT on Day D-1?*
2. **Goal 2 (Quantified Error)**: *What is the quantitative accuracy of this forecast across historical decisions, and how should we size our thermal procurement buffer to hedge against quantified shortfall risk?*

### The Delivered Solution
The **GB Wholesale Power Desk** provides:
- **Day-Ahead Market Cockpit (Goal 1)**: Deterministic, zero-lookahead alignment of WINDFOR forecasts against 11:00 GMT Day D-1 gate closure, comparing against realized FUELHH wind generation at both Wholesale Hourly Contract and Half-Hourly Settlement Period resolution.
- **Forecast Accuracy Evaluation Engine (Goal 2)**: Comprehensive empirical evaluation of January 2026 decisions, computing MAE, RMSE, WMAPE, systemic forecast bias, quantile error risk bands ($P_{10}$ to $P_{95}$), diurnal profiles, and wind regime breakdowns.
- **Thermal Procurement Simulator**: An interactive decision tool calculating recommended day-ahead thermal hedge volumes to meet consumer demand and quantifying avoided cash-out imbalance penalties.
- **Lead-Time Evolution**: Visualizes numerical weather prediction (NWP) convergence from 48h to 2h before delivery.
- **Elexon Audit Trail**: Transparent raw record inspector and CSV exporter.
- **Built-in Presentation & Tech Review Decks**: Embedded 5-minute Client Pitch and 5-minute Tech Lead Review slide presentations accessible directly in the top navigation.

---

## 2. Repository Structure

```
.
├── Dockerfile                         # Production multi-stage Docker build
├── docker-compose.yml                 # One-click Docker container orchestration
├── Procfile                           # Heroku and Render deployment runner
├── vercel.json                        # Vercel serverless deployment specification
├── ARCHITECTURE.md                    # Technical documentation, pipelines & math formulas
├── README.md                          # Comprehensive project documentation
├── scripts/
│   └── fetch_data.py                  # Standalone Elexon stream ingestion script
├── backend/
│   ├── requirements.txt               # Backend Python dependencies
│   ├── run.py                         # FastAPI Uvicorn server launcher
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI application, CORS & static asset mount
│   │   ├── config.py                  # UK market gate closure constants & paths
│   │   ├── cache/
│   │   │   └── elexon_jan_2026.json   # Pre-cached January 2026 Elexon dataset (1.6k actuals, 20.4k forecasts)
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py             # Pydantic schemas for API endpoints
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── elexon_client.py       # Elexon BMRS client with live sync capabilities
│   │       ├── data_pipeline.py       # Gate closure cutoff matching & resolution alignment
│   │       ├── error_metrics.py       # MAE, RMSE, WMAPE, Bias & Quantile engine
│   │       └── procurement.py         # Utility thermal procurement decision simulation
│   └── tests/
│       ├── test_api.py                # FastAPI endpoint integration tests
│       └── test_services.py           # Algorithmic & statistical unit tests
└── frontend/
    ├── package.json                   # React 18, Lucide icons, Vite
    ├── vite.config.js                 # Vite development server and backend proxy
    ├── index.html                     # HTML5 template with Google Fonts (Outfit, Inter)
    └── src/
        ├── main.jsx                   # React application bootstrap
        ├── App.jsx                    # Root component with state management & tab routing
        ├── index.css                  # Institutional trading desk design system
        ├── services/
        │   └── api.js                 # Asynchronous backend API communication service
        └── components/
            ├── Navbar.jsx             # Top navigation bar with live status & pitch triggers
            ├── StatCard.jsx           # Glassmorphic KPI card component
            ├── DayAheadCockpit.jsx    # Goal 1: Day-Ahead forecast vs actual visualizer
            ├── AccuracyEvaluation.jsx # Goal 2: Statistical error evaluation engine
            ├── ThermalProcurement.jsx # Utility thermal procurement simulator
            ├── ForecastEvolution.jsx  # Multi-horizon lead-time decay curve
            ├── RawDataViewer.jsx      # Raw Elexon records table and CSV exporter
            └── PitchModal.jsx         # Built-in 2-part presentation slide deck
```

---

## 3. How to Start the Application

### Option A: Running with Docker (Recommended)
Prerequisites: Docker & Docker Compose.
```bash
# Build and run container
docker-compose up --build
```
Open **`http://localhost:8000`** in your browser. The single container runs the FastAPI backend and serves the compiled React application.

---

### Option B: Running Locally (Development Mode)

#### 1. Start the Python Backend:
```bash
# In project root
pip install -r backend/requirements.txt
python backend/run.py
```
Backend will start on **`http://localhost:8000`**. You can verify API health at `http://localhost:8000/api/health` or view Swagger docs at `http://localhost:8000/docs`.

#### 2. Start the React Frontend:
```bash
cd frontend
npm install
npm run dev
```
Frontend development server will start on **`http://localhost:5173`** (proxied to `localhost:8000`).

---

### Option C: Running Full Production Build Locally
```bash
# Build frontend
cd frontend
npm run build
cd ..

# Run backend (serves API and compiled frontend dist)
python backend/run.py
```
Access the application at **`http://localhost:8000`**.

---

## 4. Running Automated Tests

A comprehensive test suite of 12 unit and integration tests verifies the data pipeline, deterministic cutoff filtering, error formulas, and REST endpoints:
```bash
python -m pytest backend/tests -v
```
Output:
```
backend/tests/test_api.py::test_health_endpoint PASSED
backend/tests/test_api.py::test_dates_endpoint PASSED
backend/tests/test_api.py::test_day_ahead_endpoint PASSED
backend/tests/test_api.py::test_accuracy_metrics_endpoint PASSED
backend/tests/test_api.py::test_forecast_evolution_endpoint PASSED
backend/tests/test_api.py::test_procurement_simulation_endpoint PASSED
backend/tests/test_api.py::test_raw_data_endpoint PASSED
backend/tests/test_services.py::test_cache_loaded PASSED
backend/tests/test_services.py::test_available_dates PASSED
backend/tests/test_services.py::test_day_ahead_schedule_matching PASSED
backend/tests/test_services.py::test_monthly_accuracy_metrics PASSED
backend/tests/test_services.py::test_procurement_simulation PASSED
============================= 12 passed in 2.57s ==============================
```

---

## 5. Cloud Deployment Guide

### Deploying to Heroku
1. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```
2. Set buildpacks:
   ```bash
   heroku buildpacks:add heroku/nodejs
   heroku buildpacks:add heroku/python
   ```
3. Deploy:
   ```bash
   git push heroku main
   ```
4. The included [`Procfile`](Procfile) starts the unified web process.

### Deploying to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel deploy` in the root directory.
3. The included [`vercel.json`](vercel.json) configures FastAPI Python serverless functions for `/api/*` and static asset hosting for the frontend.

---

## 6. Video Demo Script & Presentation Guide (Max 10 Minutes)

The video presentation is structured into two 5-minute halves as required:

### Part 1: Client Pitch (5 Minutes) - Output of Pilot Project
**Target Audience**: Head of Wholesale Power Procurement & Day-Ahead Trading Desk.

* **Minute 0:00 - 1:00: Problem & Pilot Scope**
  - "Good morning. We are presenting the pilot delivery of the UK Day-Ahead Renewable Procurement Portal, designed specifically for your wholesale power desk. In the UK day-ahead market, your team makes binding power purchase commitments at 11:00 GMT on Day D-1 to meet consumer demand. Because wind is weather-dependent, unadjusted forecasts expose your desk to severe cashout imbalance risk. Our portal equips your traders with two core capabilities: real-time visibility into day-ahead forecast versions and empirical error quantification."
* **Minute 1:00 - 2:30: Goal 1 - Day-Ahead Market Decision Cockpit Walkthrough**
  - Demonstrate the **Day-Ahead Cockpit**:
    * Show how selecting a Decision Date (e.g. 2026-01-05) and Gate Closure (11:00 GMT) automatically isolates the latest forecast published before cutoff without lookahead bias.
    * Switch between Hourly Auction contracts and 48 Settlement Periods.
    * Walk through the Jan 1 scenario: highlight the +4.6 GW over-forecasting gap where actual wind collapsed compared to forecast, explaining how the desk was short on thermal.
    * Point out the commercial guidance recommendations for evening peak hours (17:00-20:00 GMT).
* **Minute 2:30 - 3:45: Goal 2 - Forecast Accuracy Evaluation Engine Walkthrough**
  - Switch to **Forecast Accuracy (Goal 2)** tab:
    * Present the January 2026 scorecard: Overall MAE, RMSE, and WMAPE.
    * Highlight why WMAPE (Weighted MAPE) is used rather than standard MAPE to avoid zero-wind distortions.
    * Point out the systemic over-forecast bias in January 2026 and review the Quantile Risk Bands ($P_{10}$ to $P_{95}$). Explain how $P_{90}$ is used by the desk to set empirical thermal capacity safety buffers.
    * Show the Diurnal Error Profile and Wind Generation Regime breakdown.
* **Minute 3:45 - 5:00: Commercial Value - Thermal Procurement Simulator & ROI**
  - Switch to **Thermal Procurement Simulator**:
    * Input the utility's base customer demand (e.g. 25,000 MW).
    * Toggle risk tolerance from P50 (unhedged) to P90 (prudent).
    * Show the resulting 24-hour portfolio stack: Risk-Adjusted Wind Credit + Recommended Thermal Purchase meeting Demand.
    * Highlight the estimated financial savings (£) from eliminating costly cashout imbalance penalties.
    * Conclude Part 1: "This tool turns weather uncertainty into quantified, dollar-saving procurement actions."

---

### Part 2: Technical Walkthrough (5 Minutes) - Internal Tech Lead Review
**Target Audience**: Internal Technical Lead reviewing architecture, code, and practices.

* **Minute 5:00 - 6:00: Architecture Overview & Clean Design**
  - "Welcome to Part 2. I'll walk you through the software design, data pipelines, codebase, and engineering practices."
  - Highlight the decoupled architecture: FastAPI backend in Python and React 18 frontend with Vite.
  - Review the service layer separation:
    * `elexon_client.py`: Ingestion, stream caching, and live sync.
    * `data_pipeline.py`: Gate closure cutoff filtering and Settlement Period aggregation.
    * `error_metrics.py`: Statistical calculation engine.
    * `procurement.py`: Utility dispatch and imbalance risk simulation.
* **Minute 6:00 - 7:15: Data Pipeline & Algorithmic Alignment**
  - Walk through the Elexon Insights Solution integration:
    * `FUELHH` (stream filtered for `fuelType == 'WIND'`) provides 48 half-hour actuals.
    * `WINDFOR` provides multi-run forecasts published at varying times with 72h horizons.
    * Explain the deterministic gate closure cutoff filter: for target time $t$ on delivery day $D$, we select $\max(\text{publishTime} \le T_{\text{cutoff}})$.
    * Explain how hourly contracts are aligned with half-hourly settlement periods using mean actualization.
    * Explain the lead-time evolution algorithm that groups forecasts by publication run to evaluate predictive decay.
* **Minute 7:15 - 8:30: Frontend Engineering & Pure SVG Charting**
  - Show the frontend architecture:
    * Institutional dark trading desk design system in `index.css` using CSS custom properties.
    * Explain the decision to use custom interactive SVG charting instead of heavy charting libraries: ensures sub-second rendering, zero package peer-dependency conflicts, 60fps animations, and precise crosshair tooltips.
    * Component structure: modular components for Cockpit, Accuracy Engine, Procurement Simulator, Lead-Time Evolution, and Raw Data Explorer.
* **Minute 8:30 - 9:30: Testing, Quality Assurance & DevOps**
  - Demonstrate the automated test suite (`python -m pytest backend/tests -v`):
    * 12 passing tests verifying all API endpoints, cutoff math, and simulation algorithms.
  - Review containerization:
    * Multi-stage `Dockerfile` (Node 20 build stage + Python 3.11 slim runtime stage).
    * `docker-compose.yml` for single-command deployment.
    * Production-ready for Vercel, Heroku, and Docker environments.
* **Minute 9:30 - 10:00: Conclusion & Knowledge Transfer**
  - Summarize key files, README documentation, and built-in interactive presentation decks.

---

## 7. AI Tools Disclosure

As explicitly permitted and requested in the challenge instructions:
> *"You are free to use AI tools to assist with building this application (please mention it explicitly in the README if you’ve used AI tools)."*

**Disclosure**: This application, including codebase architecture, data pipeline implementation, statistical error formulation, React UI design system, automated tests, and documentation was developed with the assistance of **Google Antigravity (Advanced Agentic AI)**. All Elexon BMRS API data, math models, and business logic were rigorously verified against official Elexon market documentation.

---

## 8. Challenge Submission Summary

| Requirement | Implementation Details |
| :--- | :--- |
| **Frontend Framework** | React 18 + Vite with Institutional Dark Theme UI |
| **Backend Framework** | Python FastAPI + Pandas + NumPy + Pydantic |
| **Data Scope** | Elexon BMRS `FUELHH` (fuelType=WIND) & `WINDFOR` streams for January 2026 |
| **Goal 1** | Day-Ahead Market Cockpit with gate closure cutoff selector (11:00 GMT) |
| **Goal 2** | Quantitative Forecast Accuracy Engine (MAE, RMSE, WMAPE, Bias, P10-P95) |
| **Commercial Feature** | Utility Thermal Procurement & Imbalance Risk Simulator |
| **Containerization** | Multi-stage `Dockerfile` and `docker-compose.yml` |
| **Automated Testing** | 12 automated unit and integration tests (`pytest`) |
| **Deployment Targets** | Vercel (`vercel.json`), Heroku (`Procfile`), Docker (`localhost:8000`) |
| **Video Walkthrough** | Integrated interactive pitch deck (Part 1 Client Pitch & Part 2 Tech Review) |
