# Technical Architecture & Engineering Documentation

## GB Wholesale Power Desk - Day-Ahead Renewable Procurement & Forecast Evaluation Portal

### 1. System Overview
The platform is designed for energy utility wholesale power desks operating in the UK electricity market (Great Britain). Its purpose is to guide procurement decisions in the Day-Ahead Market (such as the EPEX SPOT UK Day-Ahead Auction and Nord Pool GB Auction) by:
1. Providing deterministic, zero-lookahead Day-Ahead wind generation forecasts available at gate closure (default 11:00 GMT on Day D-1).
2. Quantifying the forecast errors empirically across January 2026 to calibrate thermal generation hedges and avoid cash-out imbalance penalties.

---

### 2. Architecture Diagram

```
                 +---------------------------------------------------------+
                 |            Elexon BMRS Insights Solution                |
                 |  FUELHH (Wind Actuals)  |  WINDFOR (Wind Forecasts)     |
                 +---------------------------------------------------------+
                                              |
                                  REST Stream Ingestion
                                              v
                 +---------------------------------------------------------+
                 |               Data Ingestion & Caching Layer            |
                 |   - scripts/fetch_data.py                               |
                 |   - backend/app/cache/elexon_jan_2026.json              |
                 +---------------------------------------------------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------+
|                               FastAPI Backend Service                                 |
|                                                                                       |
|  +--------------------+  +----------------------+  +-------------------------------+  |
|  |    ElexonClient    |  |     DataPipeline     |  |      ErrorMetricsEngine       |  |
|  | - Ingestion Cache  |  | - Day-Ahead Cutoff   |  | - MAE, RMSE, WMAPE, Bias      |  |
|  | - Live Sync Stream |  | - Lead-Time Horizon  |  | - P10-P95 Error Margins       |  |
|  | - Stream Validator |  | - SP 1-48 Resolution |  | - Diurnal & Regime Profiling  |  |
|  +--------------------+  +----------------------+  +-------------------------------+  |
|                                     |                                                 |
|                                     v                                                 |
|                      +------------------------------+                                 |
|                      |     ProcurementSimulator     |                                 |
|                      | - Demand Netting Balance     |                                 |
|                      | - Risk-Adjusted Thermal Hedge|                                 |
|                      | - Imbalance Cost Avoidance   |                                 |
|                      +------------------------------+                                 |
+---------------------------------------------------------------------------------------+
                                              |
                                     REST JSON Endpoints
                                              v
+---------------------------------------------------------------------------------------+
|                                React 18 Web Client                                    |
|                                                                                       |
|  +--------------------+  +----------------------+  +-------------------------------+  |
|  |  DayAheadCockpit   |  |  AccuracyEvaluation |  |      ThermalProcurement       |  |
|  | - Goal 1 Cockpit   |  | - Goal 2 Metrics     |  | - Utility Demand Simulation   |  |
|  | - Interactive SVG  |  | - Error Histogram    |  | - 24-Hour Stack Chart         |  |
|  | - Gate Cutoff Pick |  | - Diurnal 24h Profile|  | - Financial Savings (£)       |  |
|  +--------------------+  +----------------------+  +-------------------------------+  |
|  +--------------------+  +----------------------+  +-------------------------------+  |
|  | ForecastEvolution  |  |    RawDataViewer     |  |          PitchModal           |  |
|  | - Lead-Time Curves |  | - Elexon Audit Trail |  | - Part 1 Client Pitch (5m)    |  |
|  | - NWP Horizon Walk |  | - CSV Export         |  | - Part 2 Tech Review (5m)     |  |
|  +--------------------+  +----------------------+  +-------------------------------+  |
+---------------------------------------------------------------------------------------+
```

---

### 3. Core Domain Logic & Math Formulations

#### 3.1 Deterministic Day-Ahead Cutoff Matching
In wholesale power auctions, decisions for delivery on Day $D$ are locked on Day $D-1$ at Gate Closure Time $T_{gate}$ (typically 11:00 GMT).
For any target settlement period $t \in \text{Day } D$:
$$\text{Cutoff Timestamp } T_{cutoff} = (D - 1) \text{ at } T_{gate}$$
$$\text{Day-Ahead Forecast } F_t = \arg\max_{\text{publishTime} \le T_{cutoff}} \{ \text{WINDFOR}(\text{startTime} = t) \}$$
This mathematical guarantee ensures that no future forecast revisions contaminate the decision state.

#### 3.2 Error Metrics Formulation
Given forecast $F_i$ and actual realized wind generation $A_i$ across $N$ hourly settlement intervals:
- **Mean Absolute Error (MAE)**:
  $$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |F_i - A_i| \quad (\text{MW})$$
- **Root Mean Squared Error (RMSE)**:
  $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (F_i - A_i)^2} \quad (\text{MW})$$
- **Systemic Forecast Bias (Mean Error)**:
  $$\text{Bias} = \frac{1}{N} \sum_{i=1}^N (F_i - A_i) \quad (\text{MW})$$
  *A positive bias indicates persistent over-forecasting, placing utilities at risk of unexpected short imbalances.*
- **Weighted Mean Absolute Percentage Error (WMAPE)**:
  $$\text{WMAPE} = \frac{\sum_{i=1}^N |F_i - A_i|}{\sum_{i=1}^N A_i} \times 100\%$$
  *In wind power forecasting, WMAPE is preferred over standard MAPE because during calm periods ($A_i \approx 0$), standard MAPE divides by near-zero and explodes artificially.*
- **Quantile Risk Bands ($P_k$)**:
  $$P_k = \text{Quantile}_k(F_i - A_i) \quad \text{for } k \in \{5, 10, 25, 50, 75, 90, 95\}$$
  *Provides the trading desk with empirical confidence bounds for sizing thermal capacity hedges.*

#### 3.3 Thermal Procurement Optimization Formulation
Let $D_t$ be customer demand at hour $t$, $F_t$ be the day-ahead wind forecast, and $\Delta_k$ be the empirical $P_k$ wind error buffer:
$$\text{Wind Credit}_t = \max(0, F_t - \Delta_k)$$
$$\text{Recommended Thermal Procurement } T_t = \max(0, D_t - \text{Wind Credit}_t)$$
If actual wind is $A_t$, the realized utility position without hedge is $\text{Net}_{unhedged} = (D_t - F_t) + A_t - D_t = A_t - F_t$.
When $A_t < F_t$, the utility is short by $F_t - A_t$ and incurs System Buy Cashout penalties. With the risk buffer $\Delta_k$, the deficit is eliminated or minimized.

---

### 4. Codebase Directory Structure
```
uk/
├── Dockerfile                         # Production multi-stage Docker build
├── docker-compose.yml                 # Local container orchestration
├── Procfile                           # Heroku / Render process runner
├── vercel.json                        # Vercel serverless deployment specification
├── ARCHITECTURE.md                    # Technical documentation & math specifications
├── README.md                          # Full project overview, pitch guides & quickstart
├── scripts/
│   └── fetch_data.py                  # Standalone ingestion & validation script
├── backend/
│   ├── requirements.txt               # Backend Python dependencies
│   ├── run.py                         # FastAPI Uvicorn launcher
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # API router, CORS middleware, static mount
│   │   ├── config.py                  # UK market constants & paths
│   │   ├── cache/
│   │   │   └── elexon_jan_2026.json   # Validated Elexon January 2026 data cache
│   │   ├── models/
│   │   │   └── schemas.py             # Pydantic request & response models
│   │   └── services/
│   │       ├── elexon_client.py       # Elexon API streaming client & live sync
│   │       ├── data_pipeline.py       # Gate closure alignment & lead-time engine
│   │       ├── error_metrics.py       # Statistical error calculation engine
│   │       └── procurement.py         # Utility thermal procurement simulation
│   └── tests/
│       ├── test_api.py                # FastAPI endpoint integration tests
│       └── test_services.py           # Core algorithmic & statistical unit tests
└── frontend/
    ├── package.json                   # React + Vite dependencies
    ├── vite.config.js                 # Vite build & API proxy setup
    ├── index.html                     # HTML root with Outfit & Inter fonts
    └── src/
        ├── main.jsx                   # React mounting script
        ├── App.jsx                    # Root app state & navigation
        ├── index.css                  # Institutional trading desk design system
        ├── services/
        │   └── api.js                 # Asynchronous backend API client
        └── components/
            ├── Navbar.jsx             # Navigation bar with status & modal buttons
            ├── StatCard.jsx           # Glassmorphic KPI card component
            ├── DayAheadCockpit.jsx    # Goal 1: Day-ahead schedule & visualizer
            ├── AccuracyEvaluation.jsx # Goal 2: Statistical evaluation engine
            ├── ThermalProcurement.jsx # Commercial thermal decision simulator
            ├── ForecastEvolution.jsx  # Multi-horizon lead-time decay
            ├── RawDataViewer.jsx      # Audit trail & CSV export
            └── PitchModal.jsx         # Built-in 2-part presentation slide deck
```

---

### 5. Key Engineering Practices
1. **Zero Lookahead Guarantee**: Day-ahead forecasts strictly enforce `publishTime <= decisionCutoff`.
2. **Sub-Second Caching**: Complete January 2026 stream is pre-processed and cached, avoiding external API latency during high-stakes trading reviews.
3. **Pure SVG Visualizations**: Interactive dual curves and histograms rendered in lightweight SVG with zero bulky chart dependencies.
4. **Comprehensive Automated Testing**: 100% test pass rate across 12 automated unit and integration tests (`pytest`).
5. **Containerized Portability**: Single multi-stage Docker build packaging both Python backend and compiled React bundle into an optimized lightweight container.
