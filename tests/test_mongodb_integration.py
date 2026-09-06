import pytest
import pandas as pd
from starlette.testclient import TestClient
from backend.main import app
from backend.data.store import dataset_store
from backend.data.mongo_manager import mongo_manager

client = TestClient(app)

def test_mongodb_status_endpoint():
    """Verify GET /api/mongodb/status returns schema, mode, and collections."""
    response = client.get("/api/mongodb/status")
    assert response.status_code == 200
    data = response.json()
    assert "connected" in data
    assert "mode" in data
    assert "database" in data
    assert "collections_count" in data
    assert isinstance(data["collections"], list)

def test_mongodb_connect_validation():
    """Verify POST /api/mongodb/connect validates empty URI."""
    response = client.post("/api/mongodb/connect", json={"uri": "", "database": "test_db"})
    assert response.status_code == 400

    # Test with mock local URI
    response = client.post("/api/mongodb/connect", json={"uri": "mongodb://localhost:27017/insight_ai", "database": "insight_ai"})
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data

def test_mongodb_import_and_duckdb_registration():
    """Verify importing a collection creates an active DuckDB dataset."""
    response = client.post("/api/mongodb/import", json={
        "collection_name": "customer_accounts",
        "dataset_name": "MongoDB Customer Accounts",
        "limit": 100
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "dataset_id" in data
    assert data["rows_imported"] > 0
    assert "account_id" in data["columns"]

    # Verify DuckDB query against newly imported dataset
    ds_id = data["dataset_id"]
    from backend.data.duckdb_engine import duckdb_engine
    result = duckdb_engine.execute(f"SELECT COUNT(*) as cnt FROM data_{ds_id}")
    assert result[0]["cnt"] == data["rows_imported"]

def test_mongodb_export_dataset():
    """Verify exporting an active dataset into a MongoDB collection."""
    # Ensure there is an active dataset
    df = pd.DataFrame({
        "product_sku": ["SKU_1", "SKU_2", "SKU_3"],
        "price": [100.0, 150.5, 200.0],
        "category": ["A", "B", "A"]
    })
    d_id = dataset_store.add_dataset("Export Test Dataset", df, {c: c for c in df.columns})

    response = client.post("/api/mongodb/export", json={
        "dataset_id": d_id,
        "collection_name": "exported_products"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["documents_exported"] == 3
    assert data["collection_name"] == "exported_products"

def test_mongodb_persistence_hooks():
    """Verify chat, chart, and scenario persistence in mongo_manager."""
    d_id = "test_ds_meta"
    # Save chat message
    assert mongo_manager.save_chat_message(d_id, "user", "What is total revenue?") is True
    assert mongo_manager.save_chat_message(d_id, "assistant", "Total is $1.2M", "SELECT SUM(val) FROM dataset") is True
    history = mongo_manager.get_chat_history(d_id)
    assert len(history) == 2
    assert history[0]["text"] == "What is total revenue?"
    assert history[0]["timestamp"].endswith("Z")

    # Save custom chart
    assert mongo_manager.save_custom_chart(d_id, {"title": "Test Chart", "options": {}}) is True
    charts = mongo_manager.get_custom_charts(d_id)
    assert len(charts) >= 1
    assert charts[-1]["title"] == "Test Chart"

    # Save scenario
    assert mongo_manager.save_scenario(d_id, {"price_delta": 10}, {"revenue_delta": 50000}, {"revenue": 550000}) is True
