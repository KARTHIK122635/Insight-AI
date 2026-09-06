import math
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from backend.data.schema import SemanticClassifier

class DataProfiler:
    @staticmethod
    def profile_dataset(df: pd.DataFrame, col_mapping: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Comprehensive data profiling for any dataset.
        Returns:
            dataset_summary: row count, col count, memory, domain, dimensions, measures
            column_profiles: detailed statistics per column
        """
        if col_mapping is None:
            col_mapping = {col: col for col in df.columns}

        total_rows = len(df)
        total_cols = len(df.columns)
        memory_usage_mb = round(float(df.memory_usage(deep=True).sum()) / (1024 * 1024), 2)
        
        column_profiles = {}
        dimensions = []
        measures = []
        temporal_cols = []
        geo_cols = []
        id_cols = []

        for col in df.columns:
            series = df[col]
            semantic_info = SemanticClassifier.classify_column(col, series)
            display_name = col_mapping.get(col, col)
            
            profile = {
                "name": col,
                "display_name": display_name,
                "physical_type": semantic_info["physical_type"],
                "semantic_type": semantic_info["semantic_type"],
                "is_measure": semantic_info["is_measure"],
                "is_dimension": semantic_info["is_dimension"],
                "unique_count": semantic_info["unique_count"],
                "cardinality_ratio": semantic_info["cardinality_ratio"],
                "null_count": semantic_info["null_count"],
                "null_pct": semantic_info["null_pct"]
            }

            # Classify lists
            if semantic_info["is_measure"]:
                measures.append(col)
            elif semantic_info["semantic_type"] == "temporal":
                temporal_cols.append(col)
                dimensions.append(col)
            elif semantic_info["semantic_type"] == "geographical":
                geo_cols.append(col)
                dimensions.append(col)
            elif semantic_info["semantic_type"] == "identifier":
                id_cols.append(col)
            else:
                dimensions.append(col)

            # Numerical metrics
            if semantic_info["physical_type"] in ["integer", "float"]:
                valid_series = series.dropna()
                if len(valid_series) > 0:
                    min_val = float(valid_series.min())
                    max_val = float(valid_series.max())
                    mean_val = float(valid_series.mean())
                    median_val = float(valid_series.median())
                    std_val = float(valid_series.std(ddof=1)) if len(valid_series) > 1 else 0.0
                    q25 = float(valid_series.quantile(0.25))
                    q75 = float(valid_series.quantile(0.75))
                    
                    profile.update({
                        "min": round(min_val, 2) if not math.isnan(min_val) else None,
                        "max": round(max_val, 2) if not math.isnan(max_val) else None,
                        "mean": round(mean_val, 2) if not math.isnan(mean_val) else None,
                        "median": round(median_val, 2) if not math.isnan(median_val) else None,
                        "std": round(std_val, 2) if not math.isnan(std_val) else None,
                        "q25": round(q25, 2) if not math.isnan(q25) else None,
                        "q75": round(q75, 2) if not math.isnan(q75) else None,
                    })

                    # Compute 8-bucket histogram
                    try:
                        counts, bin_edges = np.histogram(valid_series, bins=8)
                        profile["histogram"] = {
                            "counts": [int(c) for c in counts],
                            "bins": [round(float(b), 2) for b in bin_edges]
                        }
                    except Exception:
                        profile["histogram"] = None
                else:
                    profile.update({"min": None, "max": None, "mean": None, "median": None, "std": None})
            
            # Categorical / Temporal top values
            else:
                top_values = series.value_counts(dropna=True).head(5).to_dict()
                profile["top_frequent"] = [
                    {"value": str(k), "count": int(v), "pct": round((v / max(1, total_rows)) * 100, 1)}
                    for k, v in top_values.items()
                ]

            column_profiles[col] = profile

        domain_info = SemanticClassifier.detect_domain(list(df.columns))

        return {
            "summary": {
                "total_rows": total_rows,
                "total_columns": total_cols,
                "memory_usage_mb": memory_usage_mb,
                "domain": domain_info["primary_domain"],
                "domain_confidence": domain_info["confidence_score"],
                "measures": measures,
                "dimensions": dimensions,
                "temporal_columns": temporal_cols,
                "geographical_columns": geo_cols,
                "identifier_columns": id_cols
            },
            "columns": column_profiles
        }
