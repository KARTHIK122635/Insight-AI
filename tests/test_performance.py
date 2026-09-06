import pytest
import time
import pandas as pd
from backend.data.duckdb_engine import duckdb_engine
from backend.ai.fast_parser import FastAnalyticalParser
from backend.ai.orchestrator import ai_orchestrator

@pytest.fixture
def perf_df():
    df = pd.DataFrame({
        "region": ["East", "West", "Central", "South"],
        "category": ["Tech", "Furniture", "Tech", "Office"],
        "sales": [678000.0, 725000.0, 501000.0, 391000.0],
        "profit": [91000.0, 108000.0, 40000.0, 28000.0],
        "order_date": ["2023-01-01", "2023-02-01", "2023-03-01", "2023-04-01"]
    })
    duckdb_engine.register_dataframe("perf_test_table", df)
    summary = {
        "domain": "Retail E-Commerce",
        "measures": ["sales", "profit"],
        "dimensions": ["region", "category"],
        "temporal_columns": ["order_date"],
        "total_rows": 4
    }
    col_profiles = {
        "region": {"name": "region", "physical_type": "VARCHAR", "semantic_type": "categorical", "unique_count": 4},
        "category": {"name": "category", "physical_type": "VARCHAR", "semantic_type": "categorical", "unique_count": 3},
        "sales": {"name": "sales", "physical_type": "DOUBLE", "semantic_type": "measure", "unique_count": 4},
        "profit": {"name": "profit", "physical_type": "DOUBLE", "semantic_type": "measure", "unique_count": 4}
    }
    return summary, col_profiles

def test_fast_parser_patterns():
    dims = ["region", "category"]
    meas = ["sales", "profit"]
    temporal = ["order_date"]

    p1 = FastAnalyticalParser.match_query("top 3 regions by profit", dims, meas, temporal, "t")
    assert p1 is not None
    assert p1["intent"] == "ranking"
    assert "LIMIT 3" in p1["sql"]

    p2 = FastAnalyticalParser.match_query("monthly trend of sales", dims, meas, temporal, "t")
    assert p2 is not None
    assert p2["intent"] == "trend"
    assert "STRFTIME" in p2["sql"]

    p3 = FastAnalyticalParser.match_query("what is total sales", dims, meas, temporal, "t")
    assert p3 is not None
    assert p3["intent"] == "aggregation"
    assert "SUM(sales)" in p3["sql"]

    p4 = FastAnalyticalParser.match_query("sales by category", dims, meas, temporal, "t")
    assert p4 is not None
    assert p4["intent"] == "comparison"
    assert "category" in p4["sql"]

def test_orchestrator_sub_second_latency(perf_df):
    summary, col_profiles = perf_df
    
    t0 = time.time()
    res = ai_orchestrator.process_user_query(
        "sales by region",
        dataset_summary=summary,
        col_profiles=col_profiles,
        table_name="perf_test_table"
    )
    lat_ms = (time.time() - t0) * 1000
    
    # Must be sub-100ms for fast-path queries
    assert lat_ms < 100.0, f"Query took {lat_ms:.1f}ms, expected < 100ms"
    assert res["intent"] == "comparison"
    assert res["row_count"] == 4
    assert "West" in res["answer"]
    assert res["chart_spec"]["echarts_options"] is not None

def test_orchestrator_cache_hit(perf_df):
    summary, col_profiles = perf_df
    
    # Pre-warm
    ai_orchestrator.process_user_query("top 2 regions by profit", summary, col_profiles, table_name="perf_test_table")
    
    # Second call should be instant cache hit (< 10ms)
    t0 = time.time()
    res = ai_orchestrator.process_user_query("top 2 regions by profit", summary, col_profiles, table_name="perf_test_table")
    cache_lat_ms = (time.time() - t0) * 1000
    
    assert cache_lat_ms < 10.0, f"Cache lookup took {cache_lat_ms:.1f}ms, expected < 10ms"
    assert res["row_count"] == 2
