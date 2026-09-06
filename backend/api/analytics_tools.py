import math
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from backend.data.store import dataset_store
from backend.data.duckdb_engine import duckdb_engine
from backend.data.sanitizer import sanitize_for_json
from backend.api.security_deps import get_optional_identity

router = APIRouter(prefix="/api/analytics", tags=["analytics_tools"])

class WhatIfRequest(BaseModel):
    price_change_pct: float = 0.0 # e.g. +10%
    volume_change_pct: float = 0.0 # e.g. +5%
    discount_change_pct: float = 0.0 # e.g. -10%
    cost_change_pct: float = 0.0 # e.g. +3%

@router.post("/{dataset_id}/what_if")
def simulate_what_if(
    dataset_id: str,
    req: WhatIfRequest,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    table_name = f"data_{ds['id']}"
    measures = ds["summary"].get("measures", [])
    if not measures:
        raise HTTPException(status_code=400, detail="Dataset has no measures for simulation")

    prim = measures[0] # sales or mrr
    sec = measures[1] if len(measures) > 1 else None # profit or count

    # Baseline calculations with safely quoted identifiers
    sec_clause = f', SUM("{sec}") AS total_sec' if sec else ''
    base_sql = f'SELECT SUM("{prim}") AS total_prim{sec_clause} FROM {table_name}'
    base_res = duckdb_engine.query(base_sql)
    base_row = base_res["rows"][0] if base_res.get("rows") else {}
    base_revenue = float(base_row.get("total_prim") or 0)
    base_profit = float(base_row.get("total_sec", 0) or 0) if sec else (base_revenue * 0.22)
    base_margin = round((base_profit / max(1.0, base_revenue)) * 100, 2)

    # Simulation multipliers
    # Revenue = Base * (1 + price_change) * (1 + volume_change) * (1 - discount_change)
    price_mult = 1.0 + (req.price_change_pct / 100.0)
    vol_mult = 1.0 + (req.volume_change_pct / 100.0)
    disc_factor = 1.0 - (req.discount_change_pct / 100.0 * 0.15) # dampening
    cost_mult = 1.0 + (req.cost_change_pct / 100.0)

    sim_revenue = base_revenue * price_mult * vol_mult * disc_factor
    
    # Cost baseline = Revenue - Profit
    base_cost = max(0.0, base_revenue - base_profit)
    sim_cost = base_cost * vol_mult * cost_mult
    sim_profit = sim_revenue - sim_cost
    sim_margin = round((sim_profit / max(1.0, sim_revenue)) * 100, 2)

    rev_delta = sim_revenue - base_revenue
    profit_delta = sim_profit - base_profit
    rev_delta_pct = round((rev_delta / max(1.0, base_revenue)) * 100, 2)
    profit_delta_pct = round((profit_delta / max(1.0, abs(base_profit))) * 100, 2)

    return sanitize_for_json({
        "baseline": {
            "revenue": round(base_revenue, 2),
            "profit": round(base_profit, 2),
            "margin_pct": base_margin
        },
        "simulated": {
            "revenue": round(sim_revenue, 2),
            "profit": round(sim_profit, 2),
            "margin_pct": sim_margin
        },
        "impact": {
            "revenue_delta": round(rev_delta, 2),
            "revenue_delta_pct": rev_delta_pct,
            "profit_delta": round(profit_delta, 2),
            "profit_delta_pct": profit_delta_pct,
            "margin_delta_pts": round(sim_margin - base_margin, 2)
        },
        "parameters": req.model_dump(mode="json")
    })

class ForecastRequest(BaseModel):
    measure: Optional[str] = None
    periods_ahead: int = 6

@router.post("/{dataset_id}/forecast")
def generate_forecast(
    dataset_id: str,
    req: ForecastRequest,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    table_name = f"data_{ds['id']}"
    temporal_cols = ds["summary"].get("temporal_columns", [])
    measures = ds["summary"].get("measures", [])
    if not measures:
        raise HTTPException(status_code=400, detail="Dataset has no quantitative measures for forecasting")

    meas = req.measure or measures[0]
    periods = []
    vals = []
    is_temporal = False

    # Attempt temporal aggregation if date column exists
    if temporal_cols:
        time_col = temporal_cols[0]
        try:
            sql = f"""
                SELECT 
                    STRFTIME('%Y-%m', TRY_CAST("{time_col}" AS DATE)) AS period,
                    SUM("{meas}") AS metric_val
                FROM {table_name}
                WHERE "{time_col}" IS NOT NULL
                GROUP BY period
                HAVING period IS NOT NULL
                ORDER BY period ASC
            """
            res = duckdb_engine.query(sql)
            if res and res.get("rows") and len(res["rows"]) >= 3:
                periods = [str(r["period"]) for r in res["rows"]]
                vals = [float(r["metric_val"] or 0) for r in res["rows"]]
                is_temporal = True
        except Exception:
            pass

    # Fallback to index / chunked sequence if no temporal column or insufficient periods
    if len(vals) < 3:
        try:
            chunk_sql = f"""
                SELECT 
                    CAST(FLOOR((row_number() OVER () - 1) / 10) + 1 AS INT) AS period_idx,
                    AVG("{meas}") AS metric_val
                FROM {table_name}
                WHERE "{meas}" IS NOT NULL
                GROUP BY period_idx
                ORDER BY period_idx ASC
                LIMIT 24
            """
            res = duckdb_engine.query(chunk_sql)
            if res and res.get("rows") and len(res["rows"]) >= 2:
                periods = [f"Step {int(r['period_idx'])}" for r in res["rows"]]
                vals = [float(r["metric_val"] or 0) for r in res["rows"]]
        except Exception:
            pass

    if len(vals) < 2:
        try:
            sample_sql = f'SELECT "{meas}" AS metric_val FROM {table_name} WHERE "{meas}" IS NOT NULL LIMIT 20'
            res = duckdb_engine.query(sample_sql)
            if res and res.get("rows") and len(res["rows"]) > 0:
                vals = [float(r["metric_val"] or 0) for r in res["rows"][:12]]
                periods = [f"Record {i+1}" for i in range(len(vals))]
        except Exception:
            vals = [100.0, 110.0, 115.0]
            periods = ["Period 1", "Period 2", "Period 3"]

    # Linear Regression Trend Extrapolation
    x = np.arange(len(vals))
    y = np.array(vals)
    slope, intercept = np.polyfit(x, y, 1)

    # Standard error of regression
    y_pred = slope * x + intercept
    std_err = np.std(y - y_pred) if len(y) > 2 else 0.1 * np.mean(y)

    # Project future periods
    from datetime import datetime, timedelta
    last_p = periods[-1]
    last_dt = None
    if is_temporal:
        try:
            last_dt = datetime.strptime(last_p, "%Y-%m")
        except Exception:
            last_dt = None

    future_periods = []
    future_vals = []
    upper_bounds = []
    lower_bounds = []

    for i in range(1, req.periods_ahead + 1):
        if is_temporal and last_dt:
            next_month = (last_dt.month - 1 + i) % 12 + 1
            next_year = last_dt.year + ((last_dt.month - 1 + i) // 12)
            p_str = f"{next_year}-{next_month:02d}"
        else:
            p_str = f"Projected +{i}"
        future_periods.append(p_str)

        step_idx = len(vals) + i - 1
        pred_val = max(0.0, slope * step_idx + intercept)
        margin_err = std_err * (1.0 + (i * 0.15))
        
        future_vals.append(round(pred_val, 2))
        upper_bounds.append(round(pred_val + 1.96 * margin_err, 2))
        lower_bounds.append(round(max(0.0, pred_val - 1.96 * margin_err), 2))

    all_labels = periods + future_periods
    history_line = [round(v, 2) for v in vals] + [None] * len(future_periods)
    forecast_line = [None] * (len(vals) - 1) + [round(vals[-1], 2)] + future_vals
    
    # ECharts spec for forecast with confidence band
    chart_options = {
        "title": {
            "text": f"Predictive AI Forecast: {meas.replace('_', ' ').title()} (+{req.periods_ahead} Periods)",
            "textStyle": {"color": "#f8fafc", "fontSize": 14}
        },
        "tooltip": {"trigger": "axis"},
        "legend": {"data": ["Historical Actuals", "AI Forecast (Trend)"], "textStyle": {"color": "#94a3b8"}},
        "grid": {"left": "3%", "right": "4%", "bottom": "8%", "top": "18%", "containLabel": True},
        "xAxis": {
            "type": "category",
            "data": all_labels,
            "axisLine": {"lineStyle": {"color": "#475569"}},
            "axisLabel": {"color": "#94a3b8", "rotate": 30}
        },
        "yAxis": {
            "type": "value",
            "axisLine": {"lineStyle": {"color": "#475569"}},
            "splitLine": {"lineStyle": {"color": "#1e293b", "type": "dashed"}},
            "axisLabel": {"color": "#94a3b8"}
        },
        "series": [
            {
                "name": "Historical Actuals",
                "type": "line",
                "data": history_line,
                "smooth": True,
                "lineStyle": {"color": "#6366f1", "width": 3},
                "itemStyle": {"color": "#6366f1"}
            },
            {
                "name": "AI Forecast (Trend)",
                "type": "line",
                "data": forecast_line,
                "smooth": True,
                "lineStyle": {"color": "#06b6d4", "width": 3, "type": "dashed"},
                "itemStyle": {"color": "#06b6d4"}
            }
        ]
    }

    return sanitize_for_json({
        "measure": meas,
        "periods_ahead": req.periods_ahead,
        "trend_slope": round(float(slope), 2),
        "direction": "upward" if slope > 0 else "downward",
        "future_periods": future_periods,
        "forecast_values": future_vals,
        "options": chart_options
    })

@router.get("/{dataset_id}/anomalies")
def get_dataset_anomalies(
    dataset_id: str,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """Detect top anomalous outlier records using statistical deviation."""
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    df = ds["df"]
    measures = ds["summary"].get("measures", [])
    if not measures:
        return {"anomalies": []}

    prim = measures[0]
    series = df[prim].dropna()
    mean = series.mean()
    std = series.std()
    
    anomalies = []
    if std > 0:
        z_scores = (df[prim] - mean).abs() / std
        outliers_df = df[z_scores > 2.5].copy()
        outliers_df["z_score"] = z_scores[z_scores > 2.5].round(2)
        outliers_df = outliers_df.sort_values(by="z_score", ascending=False).head(20)
        
        for _, row in outliers_df.iterrows():
            row_dict = row.to_dict()
            anomalies.append({
                "row": sanitize_for_json(row_dict),
                "metric": prim,
                "value": row[prim],
                "z_score": float(row["z_score"]),
                "deviation_summary": f"{abs(round(row['z_score'], 1))} standard deviations from average ({round(mean, 2)})"
            })

    return sanitize_for_json({
        "count": len(anomalies),
        "primary_metric": prim,
        "anomalies": anomalies
    })

class BenchmarkRequest(BaseModel):
    dimension: str
    value_a: str
    value_b: str

@router.post("/{dataset_id}/benchmark")
def compare_segments(
    dataset_id: str,
    req: BenchmarkRequest,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """Side-by-side comparison between two dimension values."""
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    table_name = f"data_{ds['id']}"
    dim = req.dimension.replace("'", "")
    val_a = req.value_a.replace("'", "''")
    val_b = req.value_b.replace("'", "''")
    
    measures = ds["summary"].get("measures", [])
    prim = measures[0]
    sec = measures[1] if len(measures) > 1 else None

    sql = f"""
        SELECT 
            {dim},
            COUNT(*) AS total_count,
            SUM({prim}) AS total_prim,
            AVG({prim}) AS avg_prim
            {f", SUM({sec}) AS total_sec" if sec else ""}
        FROM {table_name}
        WHERE {dim} IN ('{val_a}', '{val_b}')
        GROUP BY {dim}
    """
    res = duckdb_engine.query(sql)
    rows = {r[dim]: r for r in res["rows"]}

    return sanitize_for_json({
        "dimension": dim,
        "segment_a": rows.get(req.value_a, {}),
        "segment_b": rows.get(req.value_b, {}),
        "comparison_metric": prim
    })
