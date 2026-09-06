import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from backend.main import app
from backend.data.duckdb_engine import duckdb_engine
from backend.data.schema import SemanticClassifier
from backend.data.store import dataset_store

client = TestClient(app)

def test_zero_dataset_startup():
    """Verify system starts clean with zero datasets until user upload."""
    dataset_store.datasets.clear()
    dataset_store.active_dataset_id = None
    res = client.get("/api/datasets")
    assert res.status_code == 200
    data = res.json()
    assert data["datasets"] == []
    assert data["active_id"] is None

def test_enterprise_security_headers():
    """Verify security headers are applied to HTTP responses."""
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert "max-age" in res.headers.get("Strict-Transport-Security", "")
    assert "default-src" in res.headers.get("Content-Security-Policy", "")

def test_sql_injection_sandboxing():
    """Verify DuckDBEngine blocks chained statements and filesystem functions."""
    # Stacked semicolons
    with pytest.raises(ValueError, match="Multiple SQL statements"):
        duckdb_engine.validate_sql("SELECT 1; SELECT 2")

    # Filesystem functions
    with pytest.raises(ValueError, match="Keyword or function not permitted"):
        duckdb_engine.validate_sql("SELECT * FROM read_csv('secret.csv')")

    with pytest.raises(ValueError, match="Keyword or function not permitted"):
        duckdb_engine.validate_sql("SELECT * FROM read_parquet('data.parquet')")

    # DDL / DML
    with pytest.raises(ValueError, match="Keyword or function not permitted"):
        duckdb_engine.validate_sql("DROP TABLE test")

def test_upload_security_validation():
    """Verify file upload rejects dangerous extensions and oversized payloads."""
    # 1. Invalid extension
    bad_file = io.BytesIO(b"print('hack')")
    res = client.post(
        "/api/datasets/upload",
        files={"file": ("malicious.exe", bad_file, "application/octet-stream")}
    )
    assert res.status_code == 400
    assert "Unsupported file format" in res.json()["detail"]

    # 2. Valid CSV upload
    csv_content = (
        "patient_id,diagnosis,treatment_cost,admission_days,doctor\n"
        "P001,Cardiology,4500.50,4,Dr. Smith\n"
        "P002,Neurology,8200.00,7,Dr. House\n"
        "P003,Orthopedics,3100.25,2,Dr. Strange\n"
        "P004,Cardiology,5200.00,5,Dr. Smith\n"
        "P005,Pediatrics,1200.00,1,Dr. Grey\n"
    ).encode("utf-8")
    
    upload_res = client.post(
        "/api/datasets/upload",
        files={"file": ("healthcare_patients.csv", io.BytesIO(csv_content), "text/csv")}
    )
    assert upload_res.status_code == 200
    data = upload_res.json()
    assert data["success"] is True
    dataset_id = data["dataset_id"]
    
    # Check domain detection adapted to Healthcare
    assert "Healthcare" in data["summary"]["domain"]

def test_multi_domain_detection():
    """Verify SemanticClassifier detects diverse domains accurately."""
    # Healthcare
    hc_cols = ["patient_id", "diagnosis", "admission_date", "doctor", "treatment_charge"]
    assert "Healthcare" in SemanticClassifier.detect_domain(hc_cols)["primary_domain"]

    # Human Resources
    hr_cols = ["employee_id", "department", "base_salary", "hire_date", "performance_rating", "attrition"]
    assert "Human Resources" in SemanticClassifier.detect_domain(hr_cols)["primary_domain"]

    # Supply Chain
    sc_cols = ["shipment_id", "supplier", "warehouse", "freight_cost", "transit_time", "carrier"]
    assert "Supply Chain" in SemanticClassifier.detect_domain(sc_cols)["primary_domain"]

    # Education
    edu_cols = ["student_id", "course", "gpa", "exam_score", "enrollment_semester"]
    assert "Education" in SemanticClassifier.detect_domain(edu_cols)["primary_domain"]

    # Financial Services
    fin_cols = ["account_id", "transaction_amount", "balance", "credit_score", "interest_rate"]
    assert "Financial" in SemanticClassifier.detect_domain(fin_cols)["primary_domain"]

def test_descriptive_statistics_lab_and_no_shortforms():
    """Verify the statistics API returns all measures and formulas without shortforms."""
    # Upload test dataset
    df = pd.DataFrame({
        "patient_id": [f"P{i:03d}" for i in range(1, 21)],
        "department": ["Emergency", "Surgery", "ICU", "Cardiology"] * 5,
        "charge": [100.0, 150.0, 200.0, 250.0, 300.0, 350.0, 400.0, 450.0, 500.0, 550.0,
                   600.0, 650.0, 700.0, 750.0, 800.0, 850.0, 900.0, 950.0, 1000.0, 5000.0], # 5000 is an outlier
        "length_of_stay": [1, 2, 2, 3, 3, 3, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8, 9, 10, 12, 25]
    })
    mapping = {c: c for c in df.columns}
    d_id = dataset_store.add_dataset("Clinical Hospital Admissions.csv", df, mapping, dataset_id="test_clinical_01")

    # Call statistics endpoint
    res = client.get(f"/api/statistics/{d_id}")
    assert res.status_code == 200
    stat_data = res.json()

    assert stat_data["overview"]["total_rows"] == 20
    assert len(stat_data["measures"]) == 2  # charge, length_of_stay
    assert len(stat_data["dimensions"]) == 1 # department

    # Verify statistical metrics computed
    charge_stat = next(m for m in stat_data["measures"] if m["column"] == "charge")
    assert charge_stat["mean"] > 0
    assert charge_stat["median"] > 0
    assert charge_stat["mode"] > 0
    assert charge_stat["standard_deviation"] > 0
    assert charge_stat["variance"] > 0
    assert charge_stat["skewness"] > 0  # right skewed by 5000 outlier
    assert charge_stat["kurtosis"] > 0
    assert charge_stat["interquartile_range"] > 0
    assert charge_stat["outliers_count"] >= 1 # 5000 detected as Tukey fence outlier
    assert len(charge_stat["histogram"]) > 0

    # Verify metadata formulas & explanations attached
    assert "mean" in stat_data["metadata"]
    assert "formula" in stat_data["metadata"]["mean"]
    assert "example" in stat_data["metadata"]["mean"]
    assert "definition" in stat_data["metadata"]["mean"]

    # Verify Dashboard KPIs have no shortforms and have tooltip metadata
    dash_res = client.get(f"/api/dashboard/{d_id}")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    kpis = dash_data["kpis"]
    assert len(kpis) >= 6

    for kpi in kpis:
        # Must have definition, formula, example
        assert "definition" in kpi and len(kpi["definition"]) > 0
        assert "formula" in kpi and len(kpi["formula"]) > 0
        assert "example" in kpi and len(kpi["example"]) > 0
        # No shortforms in label
        label = kpi["label"]
        assert "Avg" not in label
        assert "KPI" not in label
        assert "Est." not in label
        assert "pts" not in label

def test_pearson_correlation_matrix():
    """Verify Pearson correlation matrix computes accurate linear dependencies and classification."""
    df = pd.DataFrame({
        "marketing_spend": [10.0, 20.0, 30.0, 40.0, 50.0],
        "sales_revenue": [105.0, 202.0, 310.0, 395.0, 510.0],  # Strongly positive correlated with spend
        "customer_churn": [50.0, 40.0, 31.0, 20.0, 10.0]        # Strongly negative correlated with spend
    })
    mapping = {c: c for c in df.columns}
    d_id = dataset_store.add_dataset("Correlation Test.csv", df, mapping, dataset_id="test_corr_01")

    res = client.get(f"/api/statistics/{d_id}")
    assert res.status_code == 200
    data = res.json()
    corr = data["correlation"]

    assert len(corr["columns"]) == 3
    assert len(corr["matrix"]) == 3
    # Check diagonal is 1.0
    for i in range(3):
        assert abs(corr["matrix"][i][i] - 1.0) < 1e-4

    # Check pairs
    assert len(corr["pairs"]) == 3
    spend_sales = next(p for p in corr["pairs"] if "marketing_spend" in [p["measure_x"], p["measure_y"]] and "sales_revenue" in [p["measure_x"], p["measure_y"]])
    assert spend_sales["coefficient"] > 0.99
    assert spend_sales["strength"] == "Strong Positive"

    spend_churn = next(p for p in corr["pairs"] if "marketing_spend" in [p["measure_x"], p["measure_y"]] and "customer_churn" in [p["measure_x"], p["measure_y"]])
    assert spend_churn["coefficient"] < -0.99
    assert spend_churn["strength"] == "Strong Negative"

    # Verify correlation metadata is attached
    assert "correlation_coefficient" in data["metadata"]
    assert "formula" in data["metadata"]["correlation_coefficient"]
    assert "example" in data["metadata"]["correlation_coefficient"]

def test_data_cleaning_and_wrangling_lab():
    """Verify Data Cleaning preview, imputation, outlier winsorization, deduplication, and export."""
    df = pd.DataFrame({
        "order_id": ["ORD-1", "ORD-2", "ORD-3", "ORD-3", "ORD-4", "ORD-5"], # ORD-3 is duplicate
        "order_value": [50.0, None, 150.0, 150.0, 200.0, 9999.0],           # null value + 9999 outlier
        "region": ["North", "North", "South", "South", "West", None]         # null value
    })
    mapping = {c: c for c in df.columns}
    d_id = dataset_store.add_dataset("Retail Orders.csv", df, mapping, dataset_id="test_cleaning_01")

    # 1. Preview
    prev_res = client.get(f"/api/clean/{d_id}/preview")
    assert prev_res.status_code == 200
    prev_data = prev_res.json()
    assert prev_data["duplicate_count"] == 1
    assert len(prev_data["missing_summary"]) == 2
    assert "metadata" in prev_data

    # 2. Transform: Deduplicate + Impute + Winsorize
    trans_res = client.post(f"/api/clean/{d_id}/transform", json={
        "remove_duplicates": True,
        "imputations": {
            "order_value": "median",
            "region": "mode"
        },
        "handle_outliers": {
            "order_value": "winsorize"
        }
    })
    assert trans_res.status_code == 200
    trans_data = trans_res.json()
    assert trans_data["success"] is True
    assert trans_data["metrics"]["duplicates_removed"] == 1
    assert trans_data["metrics"]["missing_cells_resolved"] == 2
    assert len(trans_data["audit_log"]) >= 3

    # Verify updated dataset in store has no nulls and no duplicates
    updated_ds = dataset_store.get_dataset(d_id)
    updated_df = updated_ds["df"]
    assert len(updated_df) == 5
    assert updated_df.isna().sum().sum() == 0
    assert updated_df["order_value"].max() < 9000.0 # Outlier winsorized!

    # 3. Export
    exp_res = client.get(f"/api/clean/{d_id}/export")
    assert exp_res.status_code == 200
    assert "cleaned_" in exp_res.headers.get("content-disposition", "")
    assert len(exp_res.text.strip().split("\n")) == 6 # header + 5 rows

def test_hardened_duckdb_security():
    """Verify DuckDB blocks CALL, SET, and RESET commands."""
    with pytest.raises(ValueError, match="Keyword or function not permitted"):
        duckdb_engine.validate_sql("CALL some_extension()")

    with pytest.raises(ValueError, match="Keyword or function not permitted"):
        duckdb_engine.validate_sql("SET threads = 4")

    with pytest.raises(ValueError, match="Keyword or function not permitted"):
        duckdb_engine.validate_sql("RESET threads")

def test_storytelling_chart_generation():
    """Verify all 8 sections of the executive storytelling narrative contain tailored visual charts."""
    df = pd.DataFrame({
        "order_date": pd.date_range("2026-01-01", periods=60, freq="D"),
        "department": ["Engineering", "Sales", "Operations", "Marketing"] * 15,
        "operating_cost": [4500.0, 7200.0, 3100.0, 2900.0] * 15,
        "efficiency_index": [92.5, 84.1, 79.4, 88.0] * 15
    })
    mapping = {c: c for c in df.columns}
    d_id = dataset_store.add_dataset("Corporate Operations.csv", df, mapping, dataset_id="test_story_suite_01")

    # 1. Generate story
    res = client.post(f"/api/stories/{d_id}")
    assert res.status_code == 200
    data = res.json()
    sections = data.get("sections", [])
    assert len(sections) == 8

    expected_ids = [
        "exec_summary", "overall_perf", "growth_drivers", "underperformers",
        "anomalies", "risks", "opportunities", "recommendations"
    ]
    for sec, exp_id in zip(sections, expected_ids):
        assert sec["id"] == exp_id
        assert "chart" in sec and sec["chart"] is not None
        assert "chart_type" in sec["chart"]
        assert "options" in sec["chart"]
        assert "title" in sec["chart"]["options"]

    # 2. Save customized narrative while omitting chart in request payload
    modified_sections = [
        {"id": sec["id"], "title": sec["title"], "content": sec["content"] + " [Reviewed by Executive]"}
        for sec in sections
    ]
    save_res = client.post(f"/api/stories/{d_id}/save", json={"sections": modified_sections})
    assert save_res.status_code == 200

    # 3. Export markdown
    exp_res = client.get(f"/api/stories/{d_id}/export")
    assert exp_res.status_code == 200
    assert "Executive Intelligence Report" in exp_res.text

def test_filter_dashboard_sync():
    """Verify filter_dashboard returns synchronized KPIs and re-aggregated charts."""
    df = pd.DataFrame({
        "order_date": ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"] * 25,
        "region": ["North", "South", "East", "West"] * 25,
        "category": ["Electronics", "Supplies", "Tech", "Furniture"] * 25,
        "sales": [100.0, 200.0, 300.0, 400.0] * 25,
        "profit": [20.0, 50.0, 80.0, 110.0] * 25
    })
    mapping = {c: c for c in df.columns}
    d_id = dataset_store.add_dataset("Sync Test.csv", df, mapping, dataset_id="test_sync_dash_01")

    # Filter by region = 'North'
    res = client.post(f"/api/dashboard/{d_id}/filter", json={"filters": {"region": "North"}})
    assert res.status_code == 200
    data = res.json()
    assert data["matched_records"] == 25
    assert len(data["kpis"]) == 7
    assert len(data["charts"]) > 0
    # Verify baseline comparison in change_pct
    vol_kpi = next(k for k in data["kpis"] if k["id"] == "kpi_volume")
    assert "25.0% of records" in vol_kpi["change_pct"]
    assert "25 of 100 matching rows" in vol_kpi["subtext"]

def test_dataset_deletion():
    """Verify DELETE /api/datasets/{dataset_id} successfully removes dataset."""
    df = pd.DataFrame({"col_a": [1, 2, 3], "col_b": [4, 5, 6]})
    d_id = dataset_store.add_dataset("Delete Test.csv", df, {c: c for c in df.columns}, dataset_id="test_del_ds_01")
    assert dataset_store.get_dataset(d_id) is not None

    del_res = client.delete(f"/api/datasets/{d_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True
    assert dataset_store.get_dataset(d_id) is None

def test_multiformat_ingestion():
    """Verify JSON and SQLite database multi-format upload support."""
    import sqlite3
    import tempfile
    import io

    # 1. Test JSON upload
    json_bytes = b'[{"country": "USA", "users": 100}, {"country": "UK", "users": 50}]'
    res_json = client.post(
        "/api/datasets/upload",
        files={"file": ("users_data.json", io.BytesIO(json_bytes), "application/json")}
    )
    assert res_json.status_code == 200
    assert res_json.json()["success"] is True

    # 2. Test SQLite DB upload
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE products (product_id TEXT, price REAL, stock INTEGER)")
    conn.execute("INSERT INTO products VALUES ('P1', 99.9, 10), ('P2', 149.5, 5)")
    conn.commit()
    conn.close()

    with open(db_path, "rb") as f:
        db_bytes = f.read()

    res_db = client.post(
        "/api/datasets/upload",
        files={"file": ("warehouse.sqlite", io.BytesIO(db_bytes), "application/x-sqlite3")}
    )
    assert res_db.status_code == 200
    assert res_db.json()["success"] is True
    assert res_db.json()["name"] == "warehouse.sqlite"


