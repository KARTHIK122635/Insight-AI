import io
import re
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Response, Depends
from pydantic import BaseModel
import pandas as pd
import numpy as np

from backend.data.store import dataset_store
from backend.data.sanitizer import sanitize_for_json
from backend.api.security_deps import get_optional_identity

router = APIRouter(prefix="/api/clean", tags=["data_cleaning"])

CLEANING_METADATA = {
    "mean_imputation": {
        "title": "Arithmetic Mean Imputation",
        "definition": "Replaces missing null entries in a continuous numeric variable with the global arithmetic average of non-null observations.",
        "formula": "Estimated Value = (1 / N) * Sum(x_i)",
        "example": "If an income feature has values [50, 60, null, 70], the mean is 60.0. The null record is replaced by 60.0."
    },
    "median_imputation": {
        "title": "Sample Median Imputation",
        "definition": "Replaces missing values with the 50th percentile rank middle observation, providing robustness against extreme outlier skewness.",
        "formula": "Estimated Value = Value at rank (N + 1) / 2 of sorted observations",
        "example": "If home prices are [200k, 250k, 900k, null], median is 225k (resistant to the 900k luxury outlier). Null is imputed with 225k."
    },
    "mode_imputation": {
        "title": "Mode Frequency Imputation",
        "definition": "Replaces missing entries in categorical or discrete features with the most frequently occurring attribute value.",
        "formula": "Estimated Value = Category with Maximum Frequency Count",
        "example": "If payment method has 80% 'Credit Card' and 20% 'Cash', missing entries are imputed with 'Credit Card'."
    },
    "zero_constant_imputation": {
        "title": "Constant or Zero Default Imputation",
        "definition": "Replaces missing values with an explicit neutral baseline constant (0 for numeric quantities, 'Unknown' for categories).",
        "formula": "Estimated Value = 0.0 or 'Unknown'",
        "example": "If discount percentage is null for customers who received no promo code, imputing 0.0 standardizes the calculation."
    },
    "winsorization": {
        "title": "Tukey Interquartile Range Winsorization",
        "definition": "Clips extreme outliers beyond statistical fence boundaries to the upper and lower fence thresholds, retaining all sample observations while preventing variance distortion.",
        "formula": "Clipped Value = min(max(x, Quartile 1 - 1.5 * Interquartile Range), Quartile 3 + 1.5 * Interquartile Range)",
        "example": "If upper fence is 500 and an erroneous transaction is 9800, winsorization clips the value to 500.00."
    },
    "deduplication": {
        "title": "Exact Record Deduplication",
        "definition": "Identifies and removes duplicate rows where every column value matches an existing preceding record across the entire feature space.",
        "formula": "Keep first instance where Hash(Row_i) == Hash(Row_j)",
        "example": "If 25 duplicate customer order confirmations exist due to network retries, deduplication purges 24 duplicate rows."
    },
    "drop_missing": {
        "title": "Listwise Complete Case Deletion",
        "definition": "Filters out rows where critical attributes are missing, guaranteeing that subsequent statistical models compute on complete observations.",
        "formula": "Retain Row_i if and only if All Column Values are Non-Null",
        "example": "If 5 records lack customer identifiers or mandatory outcome labels, listwise deletion drops those 5 incomplete rows."
    }
}

class TransformRequest(BaseModel):
    imputations: Optional[Dict[str, str]] = None
    handle_outliers: Optional[Dict[str, str]] = None
    remove_duplicates: bool = False
    drop_columns: Optional[List[str]] = None

@router.get("/{dataset_id}/preview")
def get_cleaning_preview(
    dataset_id: str,
    share_token: Optional[str] = None,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """Audits dataset for missing values, outliers, and duplicates, providing recommended cleaning recipes."""
    owner_email = identity.get("email") if identity else None
    token = share_token or (identity.get("share_token") if identity else None)
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email, share_token=token)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    df: pd.DataFrame = ds["df"]
    total_rows = len(df)
    total_cols = len(df.columns)

    # 1. Duplicates
    dup_count = int(df.duplicated().sum())
    dup_pct = round((dup_count / max(1, total_rows)) * 100, 2)

    # 2. Missing values per column
    missing_summary = []
    for col in df.columns:
        null_count = int(df[col].isna().sum())
        if null_count > 0:
            null_pct = round((null_count / max(1, total_rows)) * 100, 2)
            is_num = pd.api.types.is_numeric_dtype(df[col])
            
            # Recommend imputation
            if is_num:
                s = df[col].dropna()
                skew = abs(float(s.skew())) if len(s) > 2 else 0
                rec = "median" if skew > 1.0 else "mean"
            else:
                rec = "mode"

            missing_summary.append({
                "column": col,
                "null_count": null_count,
                "null_percentage": null_pct,
                "data_type": str(df[col].dtype),
                "recommended_strategy": rec
            })

    # 3. Outlier profiling for numeric columns
    outlier_summary = []
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            s = df[col].dropna()
            if len(s) >= 10:
                q1 = float(s.quantile(0.25))
                q3 = float(s.quantile(0.75))
                iqr = q3 - q1
                if iqr > 0:
                    lower_bound = round(q1 - 1.5 * iqr, 4)
                    upper_bound = round(q3 + 1.5 * iqr, 4)
                    outliers = s[(s < lower_bound) | (s > upper_bound)]
                    outlier_count = len(outliers)
                    if outlier_count > 0:
                        outlier_summary.append({
                            "column": col,
                            "outlier_count": outlier_count,
                            "outlier_percentage": round((outlier_count / len(s)) * 100, 2),
                            "lower_fence": lower_bound,
                            "upper_fence": upper_bound,
                            "minimum_value": round(float(s.min()), 4),
                            "maximum_value": round(float(s.max()), 4),
                            "recommended_action": "winsorize"
                        })

    # 4. Synthesize intelligent recipe suggestions
    suggestions = []
    if dup_count > 0:
        suggestions.append({
            "type": "deduplication",
            "title": f"Remove {dup_count} duplicate records",
            "description": f"Eliminate {dup_count} ({dup_pct}%) completely identical rows to prevent inflation of aggregates.",
            "action": "remove_duplicates"
        })

    for m in missing_summary[:3]:
        suggestions.append({
            "type": "imputation",
            "title": f"Impute {m['column']} missing values with {m['recommended_strategy'].title()}",
            "description": f"Replace {m['null_count']} missing cells ({m['null_percentage']}%) using statistical {m['recommended_strategy']}.",
            "column": m['column'],
            "strategy": m['recommended_strategy']
        })

    for o in outlier_summary[:2]:
        suggestions.append({
            "type": "winsorization",
            "title": f"Winsorize {o['column']} outliers at Interquartile Range fences",
            "description": f"Cap {o['outlier_count']} extreme observations to boundary interval [{o['lower_fence']}, {o['upper_fence']}].",
            "column": o['column'],
            "action": "winsorize"
        })

    return sanitize_for_json({
        "dataset_id": dataset_id,
        "dataset_name": ds["name"],
        "total_rows": total_rows,
        "total_columns": total_cols,
        "duplicate_count": dup_count,
        "duplicate_percentage": dup_pct,
        "missing_summary": missing_summary,
        "outlier_summary": outlier_summary,
        "suggestions": suggestions,
        "metadata": CLEANING_METADATA
    })

@router.post("/{dataset_id}/transform")
def apply_cleaning_transformations(
    dataset_id: str,
    req: TransformRequest,
    share_token: Optional[str] = None,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """Applies selected data cleaning and wrangling transformations, updates store and DuckDB, and returns an audit trail."""
    owner_email = identity.get("email") if identity else None
    token = share_token or (identity.get("share_token") if identity else None)
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email, share_token=token)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    df: pd.DataFrame = ds["df"].copy()
    initial_rows = len(df)
    initial_missing = int(df.isna().sum().sum())
    initial_duplicates = int(df.duplicated().sum())

    audit_log: List[str] = []

    # 1. Deduplication
    if req.remove_duplicates and initial_duplicates > 0:
        df = df.drop_duplicates().reset_index(drop=True)
        audit_log.append(f"Successfully removed {initial_duplicates:,} duplicate rows.")

    # 2. Drop Columns
    if req.drop_columns:
        valid_drops = [c for c in req.drop_columns if c in df.columns]
        if valid_drops:
            df = df.drop(columns=valid_drops)
            audit_log.append(f"Dropped {len(valid_drops)} unused columns: {', '.join(valid_drops)}.")

    # 3. Missing Value Imputations
    if req.imputations:
        for col, strategy in req.imputations.items():
            if col not in df.columns:
                continue
            null_count = int(df[col].isna().sum())
            if null_count == 0:
                continue

            if strategy == "mean" and pd.api.types.is_numeric_dtype(df[col]):
                fill_val = round(float(df[col].mean()), 4)
                df[col] = df[col].fillna(fill_val)
                audit_log.append(f"Imputed {null_count:,} missing values in '{col}' with Arithmetic Mean ({fill_val}).")
            elif strategy == "median" and pd.api.types.is_numeric_dtype(df[col]):
                fill_val = round(float(df[col].median()), 4)
                df[col] = df[col].fillna(fill_val)
                audit_log.append(f"Imputed {null_count:,} missing values in '{col}' with Sample Median ({fill_val}).")
            elif strategy == "mode":
                mode_series = df[col].mode()
                fill_val = mode_series[0] if not mode_series.empty else "Unknown"
                df[col] = df[col].fillna(fill_val)
                audit_log.append(f"Imputed {null_count:,} missing values in '{col}' with Mode Frequency ('{fill_val}').")
            elif strategy == "zero":
                fill_val = 0 if pd.api.types.is_numeric_dtype(df[col]) else "Unknown"
                df[col] = df[col].fillna(fill_val)
                audit_log.append(f"Imputed {null_count:,} missing values in '{col}' with Default Constant ({fill_val}).")
            elif strategy == "drop_row":
                before_drop = len(df)
                df = df.dropna(subset=[col]).reset_index(drop=True)
                dropped_rows = before_drop - len(df)
                audit_log.append(f"Dropped {dropped_rows:,} rows with missing entries in '{col}'.")

    # 4. Outlier Treatment (Winsorization or Trimming)
    if req.handle_outliers:
        for col, action in req.handle_outliers.items():
            if col not in df.columns or not pd.api.types.is_numeric_dtype(df[col]):
                continue
            s = df[col].dropna()
            if len(s) < 5:
                continue
            q1 = float(s.quantile(0.25))
            q3 = float(s.quantile(0.75))
            iqr = q3 - q1
            if iqr <= 0:
                continue
            lower_fence = q1 - 1.5 * iqr
            upper_fence = q3 + 1.5 * iqr

            outlier_mask = (df[col] < lower_fence) | (df[col] > upper_fence)
            outlier_count = int(outlier_mask.sum())
            if outlier_count > 0:
                if action == "winsorize":
                    df[col] = df[col].clip(lower=lower_fence, upper=upper_fence)
                    audit_log.append(f"Winsorized {outlier_count:,} extreme outliers in '{col}' to interval [{round(lower_fence, 2)}, {round(upper_fence, 2)}].")
                elif action == "drop_row":
                    before_drop = len(df)
                    df = df[~outlier_mask].reset_index(drop=True)
                    dropped = before_drop - len(df)
                    audit_log.append(f"Filtered out {dropped:,} outlier rows in '{col}'.")

    if not audit_log:
        audit_log.append("No cleaning rules selected; dataset structure remained unchanged.")

    # Update in-memory DatasetStore and DuckDB Engine
    try:
        dataset_store.update_dataset(dataset_id, df, owner_email=owner_email, share_token=token)
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    updated_ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email, share_token=token)

    final_rows = len(df)
    final_missing = int(df.isna().sum().sum())
    final_duplicates = int(df.duplicated().sum())

    sample_preview = df.head(15).to_dict(orient="records")

    return sanitize_for_json({
        "success": True,
        "dataset_id": dataset_id,
        "dataset_name": updated_ds["name"],
        "audit_log": audit_log,
        "metrics": {
            "rows_before": initial_rows,
            "rows_after": final_rows,
            "rows_difference": final_rows - initial_rows,
            "missing_cells_before": initial_missing,
            "missing_cells_after": final_missing,
            "missing_cells_resolved": initial_missing - final_missing,
            "duplicates_before": initial_duplicates,
            "duplicates_after": final_duplicates,
            "duplicates_removed": initial_duplicates - final_duplicates
        },
        "summary": updated_ds["summary"],
        "quality": updated_ds["quality"],
        "sample_rows": sample_preview
    })

@router.get("/{dataset_id}/export")
def export_cleaned_dataset(
    dataset_id: str,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """Stream cleaned and transformed dataset as downloadable CSV."""
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    df: pd.DataFrame = ds["df"]
    safe_name = re.sub(r"[^\w]", "_", ds["name"]).lower()

    output = io.StringIO()
    df.to_csv(output, index=False)
    csv_data = output.getvalue().encode("utf-8")

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=cleaned_{safe_name}.csv",
            "X-Content-Type-Options": "nosniff"
        }
    )
