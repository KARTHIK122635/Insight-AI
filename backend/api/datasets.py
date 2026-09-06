from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Header
from typing import Optional, Dict, Any
from backend.data.loader import DataLoader
from backend.data.store import dataset_store
from backend.api.security_deps import get_optional_identity

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

@router.post("/session/cleanup")
def cleanup_anonymous_session(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    if not x_session_id:
        return {"success": True, "deleted": 0}
    deleted = dataset_store.clear_owner_datasets(f"session_{x_session_id.strip().lower()}")
    return {"success": True, "deleted": deleted}

@router.get("")
def list_datasets(identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)):
    owner_email = identity.get("email") if identity else None
    return {
        "datasets": dataset_store.list_datasets(owner_email=owner_email),
        "active_id": dataset_store.get_active_dataset_id(owner_email=owner_email)
    }

MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024  # 50 Megabytes
ALLOWED_EXTENSIONS = {".csv", ".tsv", ".txt", ".xlsx", ".xls", ".parquet", ".json", ".jsonl", ".sqlite", ".db"}

@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    # 1. Filename sanitization & extension validation
    raw_filename = file.filename or "uploaded_dataset.csv"
    clean_filename = raw_filename.replace("\\", "/").split("/")[-1]  # Strip path traversal
    
    import os
    ext = os.path.splitext(clean_filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    try:
        # 2. File size ceiling validation
        content = await file.read()
        if len(content) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=413, 
                detail=f"File exceeds maximum permissible upload limit of 50 Megabytes (received {len(content) / (1024*1024):.1f} MB)."
            )

        import io
        buffer = io.BytesIO(content)
        df, mapping = DataLoader.load_from_file(buffer, clean_filename)
        owner_email = identity.get("email") if identity else None
        dataset_id = dataset_store.add_dataset(clean_filename, df, mapping, owner_email=owner_email)
        ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
        return {
            "success": True,
            "dataset_id": dataset_id,
            "name": clean_filename,
            "summary": ds["summary"],
            "quality": ds["quality"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse and secure dataset: {str(e)}")

from backend.data.sanitizer import sanitize_for_json

@router.get("/{dataset_id}")
def get_dataset(
    dataset_id: str,
    share_token: Optional[str] = None,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    owner_email = identity.get("email") if identity else None
    token = share_token or (identity.get("share_token") if identity else None)
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email, share_token=token)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")
    
    # Return schema, summary, quality, and preview safely sanitized
    df = ds["df"]
    raw_preview = df.head(15).to_dict(orient="records")
    preview_records = sanitize_for_json(raw_preview)
    
    return sanitize_for_json({
        "id": ds["id"],
        "name": ds["name"],
        "summary": ds["summary"],
        "columns": ds["columns"],
        "quality": ds["quality"],
        "sample_rows": preview_records,
        "user_permission": ds.get("user_permission", "viewer")
    })

@router.get("/{dataset_id}/data")
def get_dataset_grid(
    dataset_id: str,
    page: int = 1,
    page_size: int = 25,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: str = "asc",
    share_token: Optional[str] = None,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """Paginated, searchable data grid endpoint for the Dataset Explorer view."""
    owner_email = identity.get("email") if identity else None
    token = share_token or (identity.get("share_token") if identity else None)
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email, share_token=token)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")
        
    df = ds["df"]
    filtered_df = df
    
    if search and search.strip():
        term = search.strip().lower()
        mask = df.astype("string").apply(
            lambda column: column.str.contains(term, case=False, regex=False, na=False)
        ).any(axis=1)
        filtered_df = df[mask]
        
    if sort_by and sort_by in filtered_df.columns:
        ascending = sort_order.lower() == "asc"
        filtered_df = filtered_df.sort_values(by=sort_by, ascending=ascending)
        
    total_records = len(filtered_df)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_df = filtered_df.iloc[start_idx:end_idx]
    
    records = sanitize_for_json(page_df.to_dict(orient="records"))
    
    return {
        "dataset_id": dataset_id,
        "page": page,
        "page_size": page_size,
        "total_records": total_records,
        "total_pages": max(1, (total_records + page_size - 1) // page_size),
        "columns": list(df.columns),
        "data": records
    }

@router.post("/{dataset_id}/select")
def select_active_dataset(
    dataset_id: str,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")
    
    if owner_email:
        dataset_store.user_active_datasets[owner_email] = dataset_id
    dataset_store.active_dataset_id = dataset_id
    
    # Update default DuckDB view 'dataset'
    from backend.data.duckdb_engine import duckdb_engine
    duckdb_engine.register_dataframe("dataset", ds["df"])
    
    return {"success": True, "active_id": dataset_id}

@router.delete("/{dataset_id}")
def delete_dataset_endpoint(
    dataset_id: str,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    owner_email = identity.get("email") if identity else None
    success = dataset_store.delete_dataset(dataset_id, owner_email=owner_email)
    if not success:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")
    active_id = dataset_store.get_active_dataset_id(owner_email=owner_email)
    return {"success": True, "deleted_id": dataset_id, "active_id": active_id}

@router.post("/sample/{domain_key}")
def load_sample_dataset(
    domain_key: str,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """Instant one-click sample dataset generation across enterprise domains."""
    import pandas as pd
    import numpy as np
    import datetime

    today = datetime.date.today()
    dates = [(today - datetime.timedelta(days=i*3)).strftime("%Y-%m-%d") for i in range(100)]
    
    if domain_key == "healthcare":
        df = pd.DataFrame({
            "patient_id": [f"PAT-{1000+i}" for i in range(120)],
            "admission_date": np.random.choice(dates, 120),
            "department": np.random.choice(["Cardiology", "Neurology", "Orthopedics", "Oncology", "Pediatrics"], 120),
            "gender": np.random.choice(["Male", "Female", "Other"], 120),
            "age": np.random.randint(18, 85, 120),
            "length_of_stay_days": np.random.randint(1, 21, 120),
            "treatment_expenditure": np.round(np.random.uniform(1200.0, 48000.0, 120), 2),
            "insurance_claim_amount": np.round(np.random.uniform(1000.0, 42000.0, 120), 2),
            "readmitted": np.random.choice(["Yes", "No"], 120, p=[0.18, 0.82])
        })
        filename = "Clinical_Healthcare_Encounters_Sample.csv"
    elif domain_key == "finance":
        df = pd.DataFrame({
            "transaction_id": [f"TXN-{50000+i}" for i in range(150)],
            "transaction_date": np.random.choice(dates, 150),
            "asset_class": np.random.choice(["Equities", "Fixed Income", "Commodities", "Currencies", "Real Estate"], 150),
            "region": np.random.choice(["North America", "EMEA", "Asia Pacific", "Latin America"], 150),
            "portfolio_tier": np.random.choice(["Institutional", "High Net Worth", "Retail Prime"], 150),
            "transaction_capital_volume": np.round(np.random.uniform(50000.0, 2500000.0, 150), 2),
            "realized_profit_margin": np.round(np.random.uniform(2500.0, 320000.0, 150), 2),
            "clearing_fee": np.round(np.random.uniform(150.0, 4200.0, 150), 2)
        })
        filename = "Financial_Portfolio_Transactions_Sample.csv"
    elif domain_key == "saas":
        df = pd.DataFrame({
            "subscriber_id": [f"SUB-{2000+i}" for i in range(140)],
            "billing_cycle_date": np.random.choice(dates, 140),
            "subscription_tier": np.random.choice(["Starter", "Professional", "Enterprise Cloud", "Ultimate"], 140),
            "sales_channel": np.random.choice(["Self Service Web", "Inside Sales", "Enterprise Partner"], 140),
            "customer_region": np.random.choice(["Americas", "Europe", "Asia"], 140),
            "monthly_recurring_revenue": np.round(np.random.uniform(199.0, 12500.0, 140), 2),
            "net_expansion_revenue": np.round(np.random.uniform(50.0, 4200.0, 140), 2),
            "active_user_seats": np.random.randint(5, 500, 140),
            "churn_risk": np.random.choice(["Low", "Moderate", "High"], 140, p=[0.75, 0.18, 0.07])
        })
        filename = "SaaS_Recurring_Revenue_Metrics_Sample.csv"
    elif domain_key == "supply_chain":
        df = pd.DataFrame({
            "shipment_id": [f"SHP-{8000+i}" for i in range(130)],
            "dispatch_date": np.random.choice(dates, 130),
            "carrier": np.random.choice(["DHL Express", "FedEx Freight", "Maersk Logistics", "UPS Supply Chain"], 130),
            "origin_hub": np.random.choice(["Chicago", "Rotterdam", "Singapore", "Los Angeles", "Frankfurt"], 130),
            "destination_city": np.random.choice(["New York", "London", "Tokyo", "Berlin", "Sydney"], 130),
            "transit_lead_time_days": np.random.randint(1, 18, 130),
            "freight_value": np.round(np.random.uniform(4500.0, 180000.0, 130), 2),
            "shipping_cost": np.round(np.random.uniform(400.0, 14000.0, 130), 2),
            "delivery_status": np.random.choice(["On-Time", "Delayed", "Expedited"], 130, p=[0.82, 0.12, 0.06])
        })
        filename = "Supply_Chain_Logistics_Operations_Sample.csv"
    elif domain_key == "hr":
        df = pd.DataFrame({
            "employee_id": [f"EMP-{3000+i}" for i in range(120)],
            "hire_date": np.random.choice(dates, 120),
            "department": np.random.choice(["Engineering", "Product", "Sales", "Marketing", "People Operations", "Finance"], 120),
            "job_level": np.random.choice(["Associate", "Mid-Level", "Senior", "Staff", "Director"], 120),
            "workforce_location": np.random.choice(["New York HQ", "San Francisco", "London", "Remote Global"], 120),
            "gender": np.random.choice(["Male", "Female", "Non-Binary"], 120),
            "tenure_years": np.round(np.random.uniform(0.5, 12.0, 120), 1),
            "base_compensation": np.round(np.random.uniform(65000.0, 240000.0, 120), 2),
            "performance_bonus": np.round(np.random.uniform(4000.0, 48000.0, 120), 2),
            "attrition_status": np.random.choice(["Active", "Departed"], 120, p=[0.88, 0.12])
        })
        filename = "Human_Resources_Workforce_Analytics_Sample.csv"
    else: # Default: Retail & E-Commerce
        df = pd.DataFrame({
            "order_id": [f"ORD-{7000+i}" for i in range(160)],
            "order_date": np.random.choice(dates, 160),
            "category": np.random.choice(["Electronics", "Home & Furniture", "Apparel", "Beauty", "Sports & Fitness"], 160),
            "region": np.random.choice(["North America", "Europe", "Asia Pacific", "Latin America"], 160),
            "customer_segment": np.random.choice(["Consumer", "Corporate", "Small Business"], 160),
            "sales_revenue": np.round(np.random.uniform(25.0, 3200.0, 160), 2),
            "operating_profit": np.round(np.random.uniform(5.0, 850.0, 160), 2),
            "discount_rate": np.round(np.random.uniform(0.0, 0.35, 160), 2),
            "quantity": np.random.randint(1, 10, 160)
        })
        filename = "Retail_Commerce_Omnichannel_Sample.csv"

    col_mapping = {c: c.replace("_", " ").title() for c in df.columns}
    owner_email = identity.get("email") if identity else None
    d_id = dataset_store.add_dataset(filename, df, col_mapping, owner_email=owner_email, is_sample=True)
    ds = dataset_store.get_dataset(d_id, owner_email=owner_email)
    return {
        "success": True,
        "dataset_id": d_id,
        "name": filename,
        "summary": ds["summary"],
        "quality": ds["quality"]
    }

