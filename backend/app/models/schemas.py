"""
Pydantic Schemas for API Requests and Responses
"""
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class DayAheadPoint(BaseModel):
    startTime: str = Field(..., description="Target delivery start time in ISO 8601 UTC")
    settlementPeriod: Optional[int] = Field(None, description="UK Settlement Period 1 to 48")
    actualGenerationMW: Optional[float] = Field(None, description="Actual wind generation from FUELHH (MW)")
    forecastGenerationMW: Optional[float] = Field(None, description="Day-ahead forecasted wind generation (MW)")
    forecastPublishTime: Optional[str] = Field(None, description="Publication timestamp of the selected forecast")
    errorMW: Optional[float] = Field(None, description="Forecast Error = Forecast - Actual (MW)")
    absoluteErrorMW: Optional[float] = Field(None, description="Absolute Error |Forecast - Actual| (MW)")
    percentageError: Optional[float] = Field(None, description="Percentage Error (Forecast - Actual) / Actual * 100")
    leadTimeHours: Optional[float] = Field(None, description="Lead time between forecast publish and delivery (hours)")
    isOverForecast: Optional[bool] = Field(None, description="True if Forecast > Actual (risk of under-procuring thermal)")

class DayAheadSummary(BaseModel):
    decisionDate: str
    deliveryDate: str
    gateClosureTime: str
    decisionCutoffTimestamp: str
    totalPeriods: int
    meanForecastMW: float
    meanActualMW: float
    maeMW: float
    rmseMW: float
    wmapePercent: float
    meanBiasMW: float
    maxOverForecastMW: float
    maxUnderForecastMW: float
    points: List[DayAheadPoint]

class MonthlyAccuracyMetrics(BaseModel):
    scope: str
    totalEvaluatedHours: int
    overallMAE: float = Field(..., description="Mean Absolute Error in MW")
    overallRMSE: float = Field(..., description="Root Mean Squared Error in MW")
    overallMAPE: float = Field(..., description="Mean Absolute Percentage Error (%)")
    overallWMAPE: float = Field(..., description="Weighted Mean Absolute Percentage Error (%)")
    overallBiasMW: float = Field(..., description="Mean Forecast Error (MW), positive indicates over-forecasting")
    correlationR2: float = Field(..., description="Coefficient of determination R^2")
    overForecastPercentage: float = Field(..., description="% of time forecast exceeded actual")
    underForecastPercentage: float = Field(..., description="% of time forecast fell below actual")
    
    # Error percentiles (MW)
    p5ErrorMW: float
    p10ErrorMW: float
    p25ErrorMW: float
    p50ErrorMW: float
    p75ErrorMW: float
    p90ErrorMW: float
    p95ErrorMW: float
    
    # Absolute error percentiles
    p50AbsoluteErrorMW: float
    p90AbsoluteErrorMW: float
    p95AbsoluteErrorMW: float

class DiurnalPoint(BaseModel):
    hour: int
    settlementPeriods: List[int]
    maeMW: float
    rmseMW: float
    biasMW: float
    meanActualMW: float
    meanForecastMW: float
    sampleCount: int

class RegimeAccuracy(BaseModel):
    regimeName: str
    generationRangeMW: str
    sampleCount: int
    maeMW: float
    rmseMW: float
    wmapePercent: float
    biasMW: float

class ForecastEvolutionRun(BaseModel):
    publishTime: str
    leadTimeHours: float
    points: List[Dict[str, Any]]

class ForecastEvolutionResponse(BaseModel):
    deliveryDate: str
    runs: List[ForecastEvolutionRun]
    actuals: List[Dict[str, Any]]

class ThermalProcurementSimulationRequest(BaseModel):
    deliveryDate: str
    customerDemandMW: float = Field(default=25000.0, description="Total utility consumer demand to cover (MW)")
    riskTolerancePercentile: int = Field(default=90, description="Risk tolerance percentile (e.g. 90 = P90 downside protection)")
    imbalanceCashOutGBP: float = Field(default=95.0, description="Estimated system cash-out imbalance price (£/MWh)")
    thermalSRMCGBP: float = Field(default=75.0, description="Day-ahead thermal generation cost (£/MWh)")

class ThermalProcurementHourly(BaseModel):
    hour: int
    demandMW: float
    windForecastMW: float
    nominalThermalMW: float
    riskBufferMW: float
    recommendedThermalProcurementMW: float
    actualWindMW: Optional[float]
    netImbalanceMW: Optional[float]
    imbalanceCostImpactGBP: Optional[float]

class ThermalProcurementResponse(BaseModel):
    deliveryDate: str
    customerDemandMW: float
    riskTolerancePercentile: int
    recommendedDailyThermalMWh: float
    unhedgedImbalanceExposureRiskMWh: float
    estimatedFinancialSavingGBP: float
    hourlySchedule: List[ThermalProcurementHourly]

class SystemHealthResponse(BaseModel):
    status: str
    cachedRecordsActuals: int
    cachedRecordsForecasts: int
    lastSyncedAt: str
    dataScope: str
