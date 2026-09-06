import math
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from backend.data.duckdb_engine import duckdb_engine

class InsightEngine:
    @staticmethod
    def discover_insights(
        df: pd.DataFrame, 
        summary: Dict[str, Any], 
        table_name: str = "dataset"
    ) -> List[Dict[str, Any]]:
        """
        Discover evidence-based analytical insights deterministically.
        Categories: Trend, Growth, Decline, Concentration (Pareto), Anomaly, Correlation.
        """
        insights: List[Dict[str, Any]] = []
        measures = summary.get("measures", [])
        dimensions = summary.get("dimensions", [])
        temporal_cols = summary.get("temporal_columns", [])
        
        if not measures:
            return insights

        primary_measure = measures[0] # e.g. 'sales' or 'mrr'
        secondary_measure = measures[1] if len(measures) > 1 else None

        # 1. Temporal Trend & Growth / Decline Analysis
        if temporal_cols:
            time_col = temporal_cols[0]
            try:
                # Group by period (month or date)
                sql_trend = f"""
                    SELECT 
                        STRFTIME('%Y-%m', CAST({time_col} AS DATE)) AS period,
                        SUM({primary_measure}) AS total_measure,
                        COUNT(*) as record_count
                    FROM {table_name}
                    WHERE {time_col} IS NOT NULL
                    GROUP BY period
                    ORDER BY period ASC
                """
                res = duckdb_engine.query(sql_trend)
                rows = res["rows"]
                if len(rows) >= 2:
                    first_period = rows[0]["period"]
                    last_period = rows[-1]["period"]
                    first_val = float(rows[0]["total_measure"] or 0)
                    last_val = float(rows[-1]["total_measure"] or 0)
                    
                    if first_val > 0:
                        growth_pct = round(((last_val - first_val) / first_val) * 100, 1)
                        direction = "increased" if growth_pct >= 0 else "decreased"
                        impact_type = "positive" if growth_pct >= 0 else "negative"
                        
                        insights.append({
                            "id": "trend_overall",
                            "type": "Trend",
                            "impact": impact_type,
                            "title": f"Overall {primary_measure.replace('_', ' ').title()} {direction} by {abs(growth_pct)}%",
                            "claim": f"{primary_measure.title()} moved from ${first_val:,.2f} in {first_period} to ${last_val:,.2f} in {last_period}, representing a {growth_pct}% total trajectory.",
                            "evidence": f"Period comparison: {first_period} baseline was ${first_val:,.2f}; final period {last_period} reached ${last_val:,.2f}.",
                            "calculation": f"(({last_val:,.2f} - {first_val:,.2f}) / {first_val:,.2f}) * 100 = {growth_pct}%",
                            "dimension": time_col,
                            "measure": primary_measure,
                            "chart_type": "line",
                            "query": sql_trend
                        })

                    # Check for temporal anomalies (Z-Score > 2.2 across periods)
                    vals = [float(r["total_measure"] or 0) for r in rows]
                    mean_val = np.mean(vals)
                    std_val = np.std(vals)
                    if std_val > 0:
                        for r in rows:
                            val = float(r["total_measure"] or 0)
                            z_score = (val - mean_val) / std_val
                            if abs(z_score) >= 2.0:
                                anomaly_type = "surge" if z_score > 0 else "drop"
                                insights.append({
                                    "id": f"anomaly_{r['period']}",
                                    "type": "Anomaly",
                                    "impact": "warning" if z_score < 0 else "positive",
                                    "title": f"Statistical {anomaly_type} detected in {r['period']}",
                                    "claim": f"{primary_measure.title()} of ${val:,.2f} in {r['period']} deviates {abs(round(z_score, 2))} standard deviations from monthly mean (${mean_val:,.2f}).",
                                    "evidence": f"Z-score: {round(z_score, 2)}, Period Value: ${val:,.2f}, Mean: ${mean_val:,.2f}, StdDev: ${std_val:,.2f}",
                                    "calculation": f"Z = ({val:,.2f} - {mean_val:,.2f}) / {std_val:,.2f} = {round(z_score, 2)}",
                                    "dimension": time_col,
                                    "measure": primary_measure,
                                    "chart_type": "bar",
                                    "query": sql_trend
                                })
                                break
            except Exception:
                pass

        # 2. Pareto Concentration Analysis (Top N items share of total)
        cat_dimensions = [d for d in dimensions if d not in temporal_cols and d != "id"]
        if cat_dimensions:
            dim = cat_dimensions[0] # e.g. 'category' or 'region' or 'product'
            try:
                sql_pareto = f"""
                    SELECT 
                        {dim},
                        SUM({primary_measure}) AS measure_sum
                    FROM {table_name}
                    WHERE {dim} IS NOT NULL
                    GROUP BY {dim}
                    ORDER BY measure_sum DESC
                """
                res = duckdb_engine.query(sql_pareto)
                rows = res["rows"]
                if len(rows) >= 2:
                    total_sum = sum(float(r["measure_sum"] or 0) for r in rows)
                    if total_sum > 0:
                        top_item = rows[0]
                        top_val = float(top_item["measure_sum"] or 0)
                        top_pct = round((top_val / total_sum) * 100, 1)
                        
                        # Top 20% or top 3 items
                        top_3_sum = sum(float(r["measure_sum"] or 0) for r in rows[:3])
                        top_3_pct = round((top_3_sum / total_sum) * 100, 1)

                        insights.append({
                            "id": "concentration_pareto",
                            "type": "Concentration",
                            "impact": "neutral",
                            "title": f"Top category '{top_item[dim]}' contributes {top_pct}% of total {primary_measure.replace('_', ' ')}",
                            "claim": f"Significant revenue concentration observed in '{top_item[dim]}' generating ${top_val:,.2f} out of ${total_sum:,.2f} total ({top_pct}%). Top 3 leaders account for {top_3_pct}%.",
                            "evidence": f"Top item: {top_item[dim]} (${top_val:,.2f}), Total: ${total_sum:,.2f}.",
                            "calculation": f"({top_val:,.2f} / {total_sum:,.2f}) * 100 = {top_pct}%",
                            "dimension": dim,
                            "measure": primary_measure,
                            "chart_type": "pie",
                            "query": sql_pareto
                        })
            except Exception:
                pass

        # 3. Growth / Decline Across Secondary Dimension (e.g. Region or Tier)
        if len(cat_dimensions) > 1:
            dim2 = cat_dimensions[1] # e.g. 'region' or 'country'
            try:
                sql_dim = f"""
                    SELECT 
                        {dim2},
                        SUM({primary_measure}) AS measure_sum,
                        COUNT(*) as count
                    FROM {table_name}
                    WHERE {dim2} IS NOT NULL
                    GROUP BY {dim2}
                    ORDER BY measure_sum ASC
                """
                res = duckdb_engine.query(sql_dim)
                rows = res["rows"]
                if len(rows) >= 2:
                    lowest = rows[0]
                    highest = rows[-1]
                    low_val = float(lowest["measure_sum"] or 0)
                    high_val = float(highest["measure_sum"] or 0)
                    
                    insights.append({
                        "id": f"disparity_{dim2}",
                        "type": "Performance Disparity",
                        "impact": "warning",
                        "title": f"Large performance spread across {dim2.replace('_', ' ').title()}",
                        "claim": f"Top performing segment '{highest[dim2]}' (${high_val:,.2f}) outpaced lowest segment '{lowest[dim2]}' (${low_val:,.2f}) by a factor of {round(high_val / max(1.0, low_val), 1)}x.",
                        "evidence": f"Highest: {highest[dim2]} (${high_val:,.2f}); Lowest: {lowest[dim2]} (${low_val:,.2f}).",
                        "calculation": f"{high_val:,.2f} / {max(1.0, low_val):,.2f} = {round(high_val / max(1.0, low_val), 1)}x",
                        "dimension": dim2,
                        "measure": primary_measure,
                        "chart_type": "bar",
                        "query": sql_dim
                    })
            except Exception:
                pass

        # 4. Correlation Analysis (between numerical measures)
        if secondary_measure:
            try:
                valid_df = df[[primary_measure, secondary_measure]].dropna()
                if len(valid_df) > 10:
                    corr = float(valid_df[primary_measure].corr(valid_df[secondary_measure]))
                    if not math.isnan(corr) and abs(corr) >= 0.35:
                        strength = "strong" if abs(corr) >= 0.7 else "moderate"
                        corr_rel = "positive" if corr > 0 else "inverse"
                        
                        insights.append({
                            "id": "correlation_insight",
                            "type": "Correlation",
                            "impact": "positive" if corr > 0 else "neutral",
                            "title": f"{strength.title()} {corr_rel} correlation between {primary_measure} and {secondary_measure} (r={round(corr, 2)})",
                            "claim": f"Statistical correlation of {round(corr, 3)} indicates that as {secondary_measure} changes, {primary_measure} reliably follows in the same direction.",
                            "evidence": f"Pearson correlation coefficient: r = {round(corr, 3)} calculated across {len(valid_df)} data points.",
                            "calculation": f"Pearson r({primary_measure}, {secondary_measure}) = {round(corr, 3)}",
                            "dimension": secondary_measure,
                            "measure": primary_measure,
                            "chart_type": "scatter",
                            "query": f"SELECT {primary_measure}, {secondary_measure} FROM {table_name}"
                        })
            except Exception:
                pass

        return insights
