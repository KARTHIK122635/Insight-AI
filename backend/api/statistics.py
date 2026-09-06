import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from backend.data.store import dataset_store
from backend.data.sanitizer import sanitize_for_json
from backend.api.security_deps import get_optional_identity

router = APIRouter(prefix="/api/statistics", tags=["statistics"])

STATISTICAL_METADATA = {
    "mean": {
        "title": "Arithmetic Mean",
        "definition": "The central average calculated by summing all observations and dividing by the total count of values.",
        "formula": "Mean = (1 / N) * ∑(x_i) from i=1 to N",
        "example": "For values [10, 20, 30], Mean = (10 + 20 + 30) / 3 = 20.0"
    },
    "median": {
        "title": "Median (50th Percentile)",
        "definition": "The exact middle value separating the higher half from the lower half of an ordered data sample.",
        "formula": "Median = x_((N+1)/2) if N is odd; (x_(N/2) + x_(N/2+1)) / 2 if N is even",
        "example": "For sorted values [10, 20, 30, 40, 100], Median = 30. Unlike the mean, it is resilient to extreme outliers."
    },
    "mode": {
        "title": "Mode",
        "definition": "The value that appears most frequently within the dataset column.",
        "formula": "Mode = argmax_x (Frequency(x))",
        "example": "In values [10, 20, 20, 30, 40], 20 appears twice, so Mode = 20.0"
    },
    "standard_deviation": {
        "title": "Sample Standard Deviation",
        "definition": "A measure of the dispersion, variation, or spread of values relative to their mean.",
        "formula": "s = √[ ∑(x_i - x̄)² / (N - 1) ]",
        "example": "If mean is 50 and standard deviation is 5, ~68% of normally distributed data falls between 45 and 55."
    },
    "variance": {
        "title": "Sample Variance",
        "definition": "The average squared difference of observations from the sample mean.",
        "formula": "s² = ∑(x_i - x̄)² / (N - 1)",
        "example": "If standard deviation is 5, variance is 5² = 25.0"
    },
    "skewness": {
        "title": "Fisher-Pearson Skewness",
        "definition": "A measure of the asymmetry of the probability distribution about its mean. Positive indicates a right tail; negative indicates a left tail.",
        "formula": "Skewness = [ N / ((N-1)(N-2)) ] * ∑[ (x_i - x̄) / s ]³",
        "example": "Skewness = 0 is symmetric (normal bell curve). Skewness = +1.8 indicates heavy right-tail concentration (e.g., luxury order prices)."
    },
    "kurtosis": {
        "title": "Sample Kurtosis",
        "definition": "A measure of the 'tailedness' and outlier-proneness of the probability distribution.",
        "formula": "Kurtosis = [ N(N+1) / ((N-1)(N-2)(N-3)) ] * ∑[ (x_i - x̄) / s ]⁴ - [ 3(N-1)² / ((N-2)(N-3)) ]",
        "example": "Excess Kurtosis > 0 indicates heavier tails and higher risk of extreme outlier spikes compared to a normal distribution."
    },
    "interquartile_range": {
        "title": "Interquartile Range",
        "definition": "The spread of the middle 50% of values, calculated as the difference between the 75th and 25th percentiles.",
        "formula": "Interquartile Range = Q3 (75th Percentile) - Q1 (25th Percentile)",
        "example": "If 75th percentile is 120 and 25th percentile is 40, Interquartile Range = 120 - 40 = 80.0"
    },
    "coefficient_of_variation": {
        "title": "Coefficient of Variation",
        "definition": "A standardized measure of dispersion showing the ratio of the standard deviation to the mean expressed as a percentage.",
        "formula": "Coefficient of Variation = (Standard Deviation / Mean) * 100%",
        "example": "If Mean = 200 and Standard Deviation = 20, Coefficient of Variation = (20 / 200) * 100% = 10.0%, indicating low relative volatility."
    },
    "outliers_count": {
        "title": "Tukey's Fences Outlier Detection",
        "definition": "Identifies extreme observation values that fall outside 1.5 times the Interquartile Range beyond the lower and upper quartiles.",
        "formula": "Lower Bound = Quartile 1 - 1.5 * Interquartile Range, Upper Bound = Quartile 3 + 1.5 * Interquartile Range",
        "example": "If Quartile 1 = 10, Quartile 3 = 30, Interquartile Range = 20: Any value below -20 or above 60 is flagged as a statistical outlier."
    },
    "correlation_coefficient": {
        "title": "Pearson Product-Moment Correlation Coefficient",
        "definition": "Measures the linear bivariate association and strength of directional dependency between two quantitative continuous measures on a standardized scale from -1.0 to +1.0.",
        "formula": "r = ∑((x_i - x̄)(y_i - ȳ)) / [ √(∑(x_i - x̄)²) * √(∑(y_i - ȳ)²) ]",
        "example": "If r = 0.82 between Advertising Spend and Sales Revenue, increases in advertising spend strongly correlate with higher sales revenue."
    }
}

@router.get("/{dataset_id}")
def get_dataset_statistics(
    dataset_id: str,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """Exhaustive Descriptive Statistics and Data Profiling for all columns."""
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    df: pd.DataFrame = ds["df"]
    summary = ds["summary"]
    measures_list = summary.get("measures", [])
    dimensions_list = summary.get("dimensions", [])

    total_rows = len(df)
    total_cols = len(df.columns)
    total_cells = total_rows * total_cols
    total_missing_cells = int(df.isna().sum().sum())
    missing_cells_percentage = round((total_missing_cells / max(1, total_cells)) * 100, 2)

    measure_stats = []
    for col in measures_list:
        if col not in df.columns:
            continue
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(series) == 0:
            continue

        q1 = float(series.quantile(0.25))
        q2 = float(series.quantile(0.50))
        q3 = float(series.quantile(0.75))
        iqr = round(q3 - q1, 4)
        mean_val = float(series.mean())
        std_val = float(series.std(ddof=1)) if len(series) > 1 else 0.0
        var_val = float(series.var(ddof=1)) if len(series) > 1 else 0.0
        min_val = float(series.min())
        max_val = float(series.max())
        val_range = round(max_val - min_val, 4)
        
        # Mode
        mode_series = series.mode()
        mode_val = float(mode_series.iloc[0]) if not mode_series.empty else mean_val
        
        # Skewness & Kurtosis
        skew_val = float(series.skew()) if len(series) > 2 else 0.0
        kurt_val = float(series.kurt()) if len(series) > 3 else 0.0

        # Coefficient of variation
        cv = round((std_val / abs(mean_val)) * 100, 2) if mean_val != 0 else 0.0

        # Outlier counts via Tukey's fences
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        outlier_count = int(((series < lower_bound) | (series > upper_bound)).sum())

        # Histogram distribution (10 bins)
        counts, bin_edges = np.histogram(series, bins=min(10, max(3, len(series.unique()))))
        histogram = [
            {
                "bin_label": f"{round(bin_edges[i], 1)} - {round(bin_edges[i+1], 1)}",
                "lower": round(float(bin_edges[i]), 2),
                "upper": round(float(bin_edges[i+1]), 2),
                "frequency": int(counts[i]),
                "percentage": round((int(counts[i]) / len(series)) * 100, 1)
            }
            for i in range(len(counts))
        ]

        measure_stats.append({
            "column": col,
            "count": int(len(series)),
            "missing_count": int(df[col].isna().sum()),
            "missing_percentage": round(float(df[col].isna().mean()) * 100, 2),
            "mean": round(mean_val, 4),
            "median": round(q2, 4),
            "mode": round(mode_val, 4),
            "standard_deviation": round(std_val, 4),
            "variance": round(var_val, 4),
            "skewness": round(skew_val, 4),
            "kurtosis": round(kurt_val, 4),
            "minimum": round(min_val, 4),
            "percentile_25": round(q1, 4),
            "percentile_50": round(q2, 4),
            "percentile_75": round(q3, 4),
            "maximum": round(max_val, 4),
            "interquartile_range": iqr,
            "range": val_range,
            "coefficient_of_variation": cv,
            "outliers_count": outlier_count,
            "outliers_percentage": round((outlier_count / len(series)) * 100, 2),
            "histogram": histogram
        })

    dimension_stats = []
    for col in dimensions_list:
        if col not in df.columns:
            continue
        series = df[col].dropna().astype(str)
        if len(series) == 0:
            continue

        unique_count = int(series.nunique())
        val_counts = series.value_counts()
        top_mode = str(val_counts.index[0]) if not val_counts.empty else "N/A"
        top_freq = int(val_counts.iloc[0]) if not val_counts.empty else 0
        top_pct = round((top_freq / len(series)) * 100, 2) if len(series) > 0 else 0.0

        freq_table = [
            {
                "category": str(cat),
                "count": int(cnt),
                "percentage": round((cnt / len(series)) * 100, 2)
            }
            for cat, cnt in val_counts.head(10).items()
        ]

        dimension_stats.append({
            "column": col,
            "count": int(len(series)),
            "missing_count": int(df[col].isna().sum()),
            "missing_percentage": round(float(df[col].isna().mean()) * 100, 2),
            "unique_count": unique_count,
            "cardinality_ratio": round(unique_count / max(1, len(series)), 4),
            "top_mode": top_mode,
            "top_frequency": top_freq,
            "top_percentage": top_pct,
            "frequency_table": freq_table
        })

    # Exhaustive Pearson Correlation Matrix across quantitative measures
    corr_columns = [
        col for col in df.columns
        if pd.api.types.is_numeric_dtype(df[col])
        and not (col.lower().endswith('_id') or col.lower() == 'id' or col.lower().startswith('id_'))
        and df[col].nunique(dropna=True) > 1
    ]
    correlation_matrix = []
    correlation_pairs = []

    if len(corr_columns) >= 2:
        sub_df = df[corr_columns].dropna()
        if len(sub_df) >= 3:
            raw_corr = sub_df.corr(method="pearson")
            for r_idx, col_r in enumerate(corr_columns):
                row_vals = []
                for c_idx, col_c in enumerate(corr_columns):
                    val = raw_corr.loc[col_r, col_c]
                    r_val = round(float(val), 4) if pd.notnull(val) else None
                    row_vals.append(r_val)
                    if r_idx < c_idx and r_val is not None:
                        abs_r = abs(r_val)
                        if abs_r >= 0.7:
                            strength = "Strong Positive" if r_val > 0 else "Strong Negative"
                        elif abs_r >= 0.3:
                            strength = "Moderate Positive" if r_val > 0 else "Moderate Negative"
                        else:
                            strength = "Weak or Negligible"

                        dir_text = "increases proportionately with" if r_val > 0 else "decreases inversely with"
                        interp = f"As {col_r.replace('_', ' ')} increases, {col_c.replace('_', ' ')} {dir_text}."

                        correlation_pairs.append({
                            "measure_x": col_r,
                            "measure_y": col_c,
                            "coefficient": r_val,
                            "strength": strength,
                            "interpretation": interp
                        })
                correlation_matrix.append(row_vals)
            correlation_pairs.sort(key=lambda x: abs(x["coefficient"]), reverse=True)

    return sanitize_for_json({
        "dataset_id": dataset_id,
        "dataset_name": ds["name"],
        "overview": {
            "total_rows": total_rows,
            "total_columns": total_cols,
            "total_cells": total_cells,
            "total_missing_cells": total_missing_cells,
            "missing_cells_percentage": missing_cells_percentage,
            "measures_count": len(measure_stats),
            "dimensions_count": len(dimension_stats),
            "domain": summary.get("domain", "General Business Analytics"),
            "domain_description": summary.get("domain_description", "")
        },
        "measures": measure_stats,
        "dimensions": dimension_stats,
        "correlation": {
            "columns": corr_columns,
            "matrix": correlation_matrix,
            "pairs": correlation_pairs
        },
        "metadata": STATISTICAL_METADATA
    })
