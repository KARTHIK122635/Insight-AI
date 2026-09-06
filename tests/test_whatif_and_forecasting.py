import io
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_whatif_and_forecasting_pipeline():
    sample_csv = "Transaction_Date,Store_Location,Product_Category,Revenue_Amount,Units_Sold\n"
    for i in range(1, 25):
        sample_csv += f"2025-{(i%12)+1:02d}-15,Store_{(i%3)+1},Electronics,{1000 + i * 50},{10 + i * 2}\n"

    res = client.post(
        "/api/datasets/upload",
        files={"file": ("transactions.csv", io.BytesIO(sample_csv.encode("utf-8")), "text/csv")}
    )
    assert res.status_code == 200
    ds_id = res.json()["dataset_id"]

    # 1. Test What-If Simulation
    what_if_res = client.post(
        f"/api/analytics/{ds_id}/what_if",
        json={
            "price_change_pct": 10.0,
            "volume_change_pct": 5.0,
            "discount_change_pct": -2.0,
            "cost_change_pct": 0.0
        }
    )
    assert what_if_res.status_code == 200
    wi_data = what_if_res.json()
    assert "simulated" in wi_data
    assert "revenue" in wi_data["simulated"]
    assert "profit" in wi_data["simulated"]
    assert "margin_pct" in wi_data["simulated"]
    assert "impact" in wi_data
    assert "revenue_delta" in wi_data["impact"]

    # 2. Test Time-Series Forecasting (temporal path)
    fc_res = client.post(
        f"/api/analytics/{ds_id}/forecast",
        json={"periods_ahead": 6}
    )
    assert fc_res.status_code == 200
    fc_data = fc_res.json()
    assert "direction" in fc_data
    assert "trend_slope" in fc_data
    assert "options" in fc_data
    assert "future_periods" in fc_data
    assert len(fc_data["future_periods"]) == 6

def test_forecasting_fallback_without_temporal_col():
    # Ingest dataset without any date/time column
    non_temporal_csv = "Product_Name,Unit_Price,Inventory_Stock,Rating_Score\n"
    for i in range(1, 15):
        non_temporal_csv += f"Item_{i},{15.5 * i},{100 - i * 3},{4.2 + (i % 5)*0.1}\n"

    res = client.post(
        "/api/datasets/upload",
        files={"file": ("catalog.csv", io.BytesIO(non_temporal_csv.encode("utf-8")), "text/csv")}
    )
    assert res.status_code == 200
    ds_id = res.json()["dataset_id"]

    # Test Forecasting: should succeed via fallback rather than throwing 400 error
    fc_res = client.post(
        f"/api/analytics/{ds_id}/forecast",
        json={"periods_ahead": 4}
    )
    assert fc_res.status_code == 200
    fc_data = fc_res.json()
    assert "direction" in fc_data
    assert "options" in fc_data
    assert len(fc_data["future_periods"]) == 4
