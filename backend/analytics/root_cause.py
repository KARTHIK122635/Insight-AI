import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from backend.data.duckdb_engine import duckdb_engine

class RootCauseAnalyzer:
    @staticmethod
    def analyze_metric_variance(
        measure: str,
        dimensions: List[str],
        filter_clause: Optional[str] = None,
        table_name: str = "dataset"
    ) -> Dict[str, Any]:
        """
        Perform multi-dimensional root-cause breakdown of a metric.
        Calculates how changes/distributions across dimensions explain overall variance.
        """
        results_by_dim = {}
        top_drivers = []
        top_detractors = []

        where_sql = f"WHERE {filter_clause}" if filter_clause else "WHERE 1=1"

        # Overall metric aggregate
        total_res = duckdb_engine.query(f"SELECT SUM({measure}) AS total_val, COUNT(*) AS count_val FROM {table_name} {where_sql}")
        total_val = float(total_res["rows"][0]["total_val"] or 0)
        total_count = int(total_res["rows"][0]["count_val"] or 0)

        for dim in dimensions[:4]: # Analyze top 4 dimensions
            try:
                sql = f"""
                    SELECT 
                        {dim},
                        SUM({measure}) AS dim_sum,
                        COUNT(*) AS dim_count,
                        AVG({measure}) AS dim_avg
                    FROM {table_name}
                    {where_sql} AND {dim} IS NOT NULL
                    GROUP BY {dim}
                    ORDER BY dim_sum DESC
                """
                res = duckdb_engine.query(sql)
                rows = res["rows"]
                
                dim_breakdown = []
                for r in rows:
                    val = float(r["dim_sum"] or 0)
                    share_pct = round((val / max(0.001, abs(total_val))) * 100, 2)
                    dim_breakdown.append({
                        "dimension_value": str(r[dim]),
                        "metric_sum": round(val, 2),
                        "count": int(r["dim_count"]),
                        "average": round(float(r["dim_avg"] or 0), 2),
                        "share_percentage": share_pct
                    })

                results_by_dim[dim] = dim_breakdown

                # Identify top positive contributors and negative/underperforming segments
                if dim_breakdown:
                    sorted_by_val = sorted(dim_breakdown, key=lambda x: x["metric_sum"])
                    # Lowest performer
                    worst = sorted_by_val[0]
                    best = sorted_by_val[-1]
                    
                    if worst["metric_sum"] < 0 or worst["share_percentage"] < 10.0:
                        top_detractors.append({
                            "dimension": dim,
                            "value": worst["dimension_value"],
                            "metric_sum": worst["metric_sum"],
                            "share_pct": worst["share_percentage"],
                            "summary": f"{dim} '{worst['dimension_value']}' is an underperformer ({worst['share_percentage']}% share, ${worst['metric_sum']:,.2f})"
                        })
                    
                    top_drivers.append({
                        "dimension": dim,
                        "value": best["dimension_value"],
                        "metric_sum": best["metric_sum"],
                        "share_pct": best["share_percentage"],
                        "summary": f"{dim} '{best['dimension_value']}' is the primary growth driver ({best['share_percentage']}% share, ${best['metric_sum']:,.2f})"
                    })

            except Exception:
                continue

        # Synthesize plain-english finding
        driver_text = "; ".join([d["summary"] for d in top_drivers[:2]])
        detractor_text = "; ".join([d["summary"] for d in top_detractors[:2]]) if top_detractors else "No critical negative outliers detected."

        synthesis = f"Root-cause analysis across {measure}: Total value is ${total_val:,.2f} across {total_count:,} records. Key growth anchors: {driver_text}. Primary risk/drag areas: {detractor_text}."

        return {
            "measure": measure,
            "total_value": round(total_val, 2),
            "record_count": total_count,
            "dimensions_analyzed": list(results_by_dim.keys()),
            "breakdown": results_by_dim,
            "top_drivers": top_drivers,
            "top_detractors": top_detractors,
            "synthesis": synthesis
        }
