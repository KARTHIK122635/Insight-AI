import re
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from backend.data.store import dataset_store
from backend.data.duckdb_engine import duckdb_engine
from backend.data.schema import SemanticClassifier
from backend.data.loader import sanitize_column_name
from backend.data.sanitizer import sanitize_for_json
from backend.api.security_deps import get_optional_identity

router = APIRouter(prefix="/api/formulas", tags=["formulas"])

class FormulaRequest(BaseModel):
    column_name: str
    formula: str # e.g. "(profit / sales) * 100" or "sales * (1 - discount)"

@router.post("/{dataset_id}")
def add_calculated_field(
    dataset_id: str,
    req: FormulaRequest,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    raw_name = req.column_name.strip()
    clean_col = sanitize_column_name(raw_name)
    formula_sql = req.formula.strip()

    # Basic safety checks
    disallowed = ["DROP", "DELETE", "INSERT", "UPDATE", "CREATE", "ALTER", ";"]
    for word in disallowed:
        if word in formula_sql.upper():
            raise HTTPException(status_code=400, detail=f"Disallowed keyword in formula: {word}")

    table_name = f"data_{ds['id']}"

    # Step 1: Test formula with LIMIT 5
    test_sql = f"SELECT ({formula_sql}) AS {clean_col} FROM {table_name} LIMIT 5"
    try:
        duckdb_engine.query(test_sql)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Formula syntax error: {str(e)}")

    # Step 2: Compute new column across whole table
    full_sql = f"SELECT *, ({formula_sql}) AS {clean_col} FROM {table_name}"
    try:
        new_rel = duckdb_engine.conn.sql(full_sql)
        new_df = new_rel.df()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate new field: {str(e)}")

    # Step 3: Classify new column
    new_series = new_df[clean_col]
    col_info = SemanticClassifier.classify_column(clean_col, new_series)
    col_info["display_name"] = raw_name

    # Add numeric stats if numeric
    if col_info["physical_type"] in ["integer", "float"]:
        valid = new_series.dropna()
        if len(valid) > 0:
            col_info.update({
                "min": round(float(valid.min()), 2),
                "max": round(float(valid.max()), 2),
                "mean": round(float(valid.mean()), 2),
                "median": round(float(valid.median()), 2),
                "std": round(float(valid.std(ddof=1)), 2) if len(valid) > 1 else 0.0
            })

    # Step 4: Update DatasetStore
    ds["df"] = new_df
    ds["col_mapping"][clean_col] = raw_name
    ds["columns"][clean_col] = col_info
    
    if col_info["is_measure"] and clean_col not in ds["summary"]["measures"]:
        ds["summary"]["measures"].append(clean_col)
    elif col_info["is_dimension"] and clean_col not in ds["summary"]["dimensions"]:
        ds["summary"]["dimensions"].append(clean_col)

    ds["summary"]["total_columns"] = len(new_df.columns)

    # Re-register with DuckDB
    duckdb_engine.register_dataframe(table_name, new_df)
    duckdb_engine.register_dataframe("dataset", new_df)

    preview_vals = new_series.head(10).tolist()

    return sanitize_for_json({
        "success": True,
        "new_column": clean_col,
        "display_name": raw_name,
        "column_info": col_info,
        "summary": ds["summary"],
        "sample_values": preview_vals
    })
