import os
import sys
from pathlib import Path
import pytest
import pandas as pd

# Add insight-ai directory to path
project_dir = str(Path(__file__).parent.parent)
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

from backend.data.loader import DataLoader, sanitize_column_name
from backend.data.schema import SemanticClassifier
from backend.data.duckdb_engine import duckdb_engine
from backend.analytics.profiler import DataProfiler
from backend.analytics.quality import DataQualityEngine
from backend.analytics.insights import InsightEngine
from backend.analytics.root_cause import RootCauseAnalyzer
from backend.visualization.dashboard import DashboardGenerator
from backend.storytelling.narrative import StoryEngine
from backend.storytelling.report import ReportExporter

@pytest.fixture
def sample_df():
    data = {
        "Order ID": ["ORD-1", "ORD-2", "ORD-3", "ORD-4", "ORD-5"],
        "Order Date": ["2024-01-15", "2024-02-10", "2024-03-05", "2024-03-20", "2024-04-12"],
        "Region": ["North", "South", "North", "West", "North"],
        "Category": ["Technology", "Furniture", "Technology", "Office", "Technology"],
        "Sales": [500.0, 150.0, 800.0, 45.0, 1200.0],
        "Profit": [120.0, -30.0, 240.0, 10.0, 360.0],
        "Quantity": [2, 1, 4, 3, 5]
    }
    df = pd.DataFrame(data)
    # Sanitize columns
    col_mapping = {sanitize_column_name(c): c for c in df.columns}
    df.columns = list(col_mapping.keys())
    return df, col_mapping

def test_column_sanitization():
    assert sanitize_column_name("Order ID") == "order_id"
    assert sanitize_column_name("Total Revenue ($)") == "total_revenue"
    assert sanitize_column_name("1st Place") == "col_1st_place"

def test_semantic_classification(sample_df):
    df, _ = sample_df
    sales_info = SemanticClassifier.classify_column("sales", df["sales"])
    assert sales_info["is_measure"] is True
    assert sales_info["semantic_type"] == "monetary_measure"

    region_info = SemanticClassifier.classify_column("region", df["region"])
    assert region_info["is_dimension"] is True
    assert region_info["semantic_type"] == "geographical"

def test_domain_detection(sample_df):
    df, _ = sample_df
    domain = SemanticClassifier.detect_domain(list(df.columns))
    assert "E-Commerce" in domain["primary_domain"] or "Retail" in domain["primary_domain"]

def test_duckdb_engine(sample_df):
    df, _ = sample_df
    duckdb_engine.register_dataframe("test_data", df)
    res = duckdb_engine.query("SELECT region, SUM(sales) AS total_sales FROM test_data GROUP BY region ORDER BY total_sales DESC")
    assert res["row_count"] > 0
    assert "region" in res["columns"]
    assert "total_sales" in res["columns"]

def test_duckdb_security_block():
    with pytest.raises(ValueError):
        duckdb_engine.query("DROP TABLE dataset")

def test_data_profiler(sample_df):
    df, col_mapping = sample_df
    profile = DataProfiler.profile_dataset(df, col_mapping)
    assert profile["summary"]["total_rows"] == 5
    assert "sales" in profile["summary"]["measures"]
    assert "region" in profile["summary"]["dimensions"]
    assert profile["columns"]["sales"]["mean"] == 539.0

def test_data_quality_engine(sample_df):
    df, col_mapping = sample_df
    profile = DataProfiler.profile_dataset(df, col_mapping)
    quality = DataQualityEngine.audit_quality(df, profile["columns"])
    assert quality["score"] >= 80.0
    assert quality["duplicate_count"] == 0

def test_root_cause_analyzer(sample_df):
    df, _ = sample_df
    duckdb_engine.register_dataframe("dataset", df)
    rc = RootCauseAnalyzer.analyze_metric_variance(
        measure="profit",
        dimensions=["region", "category"],
        table_name="dataset"
    )
    assert "measure" in rc
    assert rc["measure"] == "profit"
    assert len(rc["top_drivers"]) > 0

def test_automated_dashboard(sample_df):
    df, col_mapping = sample_df
    duckdb_engine.register_dataframe("dataset", df)
    profile = DataProfiler.profile_dataset(df, col_mapping)
    dashboard = DashboardGenerator.generate_dashboard(profile["summary"], table_name="dataset")
    assert len(dashboard["kpis"]) >= 3
    assert len(dashboard["charts"]) >= 2

def test_executive_story_and_markdown(sample_df):
    df, col_mapping = sample_df
    duckdb_engine.register_dataframe("dataset", df)
    profile = DataProfiler.profile_dataset(df, col_mapping)
    quality = DataQualityEngine.audit_quality(df, profile["columns"])
    insights = InsightEngine.discover_insights(df, profile["summary"], table_name="dataset")
    
    story_data = StoryEngine.generate_executive_story(
        dataset_name="Test Store",
        summary=profile["summary"],
        insights=insights,
        quality_summary=quality
    )
    assert len(story_data["sections"]) == 8
    
    md = ReportExporter.to_markdown(story_data)
    assert "# Executive Intelligence Report" in md
    assert "1. Executive Summary" in md
