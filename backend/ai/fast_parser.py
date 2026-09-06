import re
from typing import Dict, Any, List, Optional

class FastAnalyticalParser:
    """
    Sub-millisecond analytical query pattern matcher.
    Resolves standard BI questions instantly in < 1ms without remote LLM latency.
    """

    @staticmethod
    def _find_matching_measure(q: str, measures: List[str]) -> Optional[str]:
        # Exact or partial match
        for m in measures:
            clean_m = m.lower().replace("_", " ")
            clean_stem = clean_m.rstrip("s")
            if clean_m in q or m.lower() in q or (len(clean_stem) > 3 and clean_stem in q):
                return m
        
        # Domain keyword mapping
        kw_map = {
            "revenue": ["sales", "revenue", "mrr", "arr"],
            "income": ["profit", "net_profit", "income", "margin"],
            "volume": ["quantity", "volume", "count", "units"],
            "orders": ["quantity", "order_id", "count"],
            "margin": ["profit_margin", "profit", "margin"],
            "discount": ["discount", "rebate"],
            "churn": ["churn_rate", "churn", "retention"],
            "cac": ["cac", "acquisition_cost"]
        }
        for kw, candidates in kw_map.items():
            if kw in q:
                for c in candidates:
                    for m in measures:
                        if c in m.lower():
                            return m
        
        return measures[0] if measures else None

    @staticmethod
    def _find_matching_dimension(q: str, dimensions: List[str]) -> Optional[str]:
        for d in dimensions:
            clean_d = d.lower().replace("_", " ")
            clean_stem = clean_d.rstrip("s")
            if clean_d in q or d.lower() in q or (len(clean_stem) > 3 and clean_stem in q):
                return d
        
        # Common aliases
        aliases = {
            "country": ["country", "state", "region"],
            "geo": ["region", "state", "country", "city"],
            "location": ["region", "state", "city"],
            "product": ["product_name", "product", "item", "sub_category"],
            "tier": ["tier", "plan", "plan_tier", "tier_name"],
            "user": ["customer_name", "customer", "user", "client"],
            "client": ["customer_name", "customer", "client", "account"],
            "type": ["category", "type", "segment"],
            "channel": ["channel", "acquisition_channel", "source"]
        }
        for kw, cands in aliases.items():
            if kw in q:
                for c in cands:
                    for d in dimensions:
                        if c in d.lower():
                            return d

        return None

    @staticmethod
    def match_query(
        query: str,
        dimensions: List[str],
        measures: List[str],
        temporal_cols: List[str],
        table_name: str = "dataset"
    ) -> Optional[Dict[str, Any]]:
        q = query.lower().strip()

        matched_measure = FastAnalyticalParser._find_matching_measure(q, measures)
        matched_dimension = FastAnalyticalParser._find_matching_dimension(q, dimensions)

        # Detect aggregation intent (avg, sum, min, max, count)
        agg_func = "SUM"
        agg_name = "sum"
        if any(w in q for w in ["average", "avg", "mean"]):
            agg_func = "AVG"
            agg_name = "avg"
        elif any(w in q for w in ["count", "how many", "number of"]):
            agg_func = "COUNT"
            agg_name = "count"
        elif any(w in q for w in ["minimum", "min", "lowest"]):
            if "by" not in q and "per" not in q and "across" not in q:
                agg_func = "MIN"
                agg_name = "min"
        elif any(w in q for w in ["maximum", "max", "highest"]):
            if "by" not in q and "per" not in q and "across" not in q:
                agg_func = "MAX"
                agg_name = "max"

        # 0. Dataset Summary & Overview (e.g. "summarize this data", "overview", "what is this dataset about")
        is_summary = any(w in q for w in ["summar", "overview", "describe", "what is this data", "what's in this", "tell me about", "about this data", "dataset info", "general health"])
        if is_summary:
            m1 = measures[0] if measures else None
            m2 = measures[1] if len(measures) > 1 else None
            d1 = dimensions[0] if dimensions else "item"
            
            select_parts = ["COUNT(*) AS total_records"]
            if m1:
                select_parts.append(f"SUM({m1}) AS total_{m1}")
                select_parts.append(f"AVG({m1}) AS avg_{m1}")
            if m2:
                select_parts.append(f"SUM({m2}) AS total_{m2}")
                select_parts.append(f"AVG({m2}) AS avg_{m2}")

            sql = f"SELECT {', '.join(select_parts)} FROM {table_name}"
            return {
                "matched": True,
                "intent": "summary",
                "dimension": d1,
                "measure": m1 or "records",
                "aggregation": "overview",
                "chart_type": "metric",
                "title": "Dataset Executive Overview",
                "sql": sql.strip(),
                "explanation": "High-level summary of total records and core KPIs."
            }

        # 0b. Actionable Recommendations & Improvement (e.g. "how to increase profits", "recommendations", "opportunities")
        is_recommendation = any(w in q for w in ["recommend", "improve", "increase", "boost", "advice", "opportunity", "action", "strategy", "maximize"])
        if is_recommendation:
            target_m = matched_measure or (measures[1] if len(measures) > 1 and "profit" in str(measures).lower() else (measures[0] if measures else "sales"))
            target_d = matched_dimension or (dimensions[0] if dimensions else "category")
            sql = f"""
                SELECT 
                    {target_d},
                    SUM({target_m}) AS total_{target_m},
                    AVG({target_m}) AS avg_{target_m},
                    COUNT(*) AS transaction_count
                FROM {table_name}
                WHERE {target_d} IS NOT NULL
                GROUP BY {target_d}
                ORDER BY total_{target_m} DESC
                LIMIT 10
            """
            return {
                "matched": True,
                "intent": "recommendation",
                "dimension": target_d,
                "measure": target_m,
                "aggregation": "sum",
                "chart_type": "bar",
                "title": f"Strategic Optimization Analysis: {target_m.replace('_', ' ').title()} by {target_d.replace('_', ' ').title()}",
                "sql": sql.strip(),
                "explanation": f"Strategic breakdown to identify upside opportunities in {target_m} across {target_d}."
            }

        # 0c. Anomalies & Outliers (e.g. "find anomalies", "outliers", "any unusual data")
        is_anomaly = any(w in q for w in ["anomal", "outlier", "unusual", "weird", "loss", "negative", "drop", "spike", "irregular"])
        if is_anomaly:
            target_m = matched_measure or (measures[0] if measures else "sales")
            target_d = matched_dimension or (dimensions[0] if dimensions else "category")
            sql = f"""
                SELECT 
                    {target_d},
                    MIN({target_m}) AS min_val,
                    MAX({target_m}) AS max_val,
                    AVG({target_m}) AS avg_val,
                    COUNT(*) AS count_val
                FROM {table_name}
                WHERE {target_d} IS NOT NULL
                GROUP BY {target_d}
                ORDER BY min_val ASC
                LIMIT 10
            """
            return {
                "matched": True,
                "intent": "anomaly",
                "dimension": target_d,
                "measure": target_m,
                "aggregation": "min_max",
                "chart_type": "bar",
                "title": f"Outlier & Variance Inspection: {target_m.replace('_', ' ').title()}",
                "sql": sql.strip(),
                "explanation": f"Extremes and outlier audit for {target_m} across {target_d}."
            }

        # 1. Overall Aggregates / Totals (e.g. "what is total sales", "average discount", "overall summary")
        is_overall_total = any(w in q for w in ["what is the total", "what is total", "overall total", "sum of", "overall average", "total amount of"]) or (
            ("total" in q or "average" in q or "avg" in q) and not any(w in q for w in ["by", "per", "across", "top", "trend", "over time"]) and matched_dimension is None
        )
        if is_overall_total and matched_measure:
            sql = f"""
                SELECT 
                    SUM({matched_measure}) AS total_{matched_measure},
                    AVG({matched_measure}) AS avg_{matched_measure},
                    MIN({matched_measure}) AS min_{matched_measure},
                    MAX({matched_measure}) AS max_{matched_measure},
                    COUNT(*) AS record_count
                FROM {table_name}
            """
            return {
                "matched": True,
                "intent": "aggregation",
                "dimension": "Dataset Overall",
                "measure": matched_measure,
                "aggregation": agg_name,
                "chart_type": "metric",
                "title": f"Overall {matched_measure.replace('_', ' ').title()} Summary",
                "sql": sql.strip(),
                "explanation": f"Dataset-wide aggregation metrics for {matched_measure}."
            }

        # 2. Time-series Trend (e.g. "sales trend", "monthly sales", "profit over time")
        is_trend = any(w in q for w in ["trend", "over time", "monthly", "by month", "quarterly", "timeline", "history", "growth", "over the year"])
        if is_trend and temporal_cols and matched_measure:
            t_col = temporal_cols[0]
            sql = f"""
                SELECT 
                    STRFTIME('%Y-%m', CAST({t_col} AS DATE)) AS period,
                    {agg_func}({matched_measure}) AS total_{matched_measure}
                FROM {table_name}
                WHERE {t_col} IS NOT NULL
                GROUP BY period
                ORDER BY period ASC
            """
            return {
                "matched": True,
                "intent": "trend",
                "dimension": t_col,
                "measure": matched_measure,
                "aggregation": agg_name,
                "chart_type": "line",
                "title": f"{matched_measure.replace('_', ' ').title()} Monthly Trend",
                "sql": sql.strip(),
                "explanation": f"Time-series trend of {matched_measure} over {t_col}."
            }

        # 3. Two-Measure Relationship / Scatter (e.g. "profit vs sales", "discount versus profit")
        vs_match = re.search(r"([a-z0-9_]+)\s+(?:vs|versus|compared with|and)\s+([a-z0-9_]+)", q)
        if vs_match and len(measures) >= 2:
            m1 = FastAnalyticalParser._find_matching_measure(vs_match.group(1), measures)
            m2 = FastAnalyticalParser._find_matching_measure(vs_match.group(2), measures)
            if m1 and m2 and m1 != m2:
                dim = matched_dimension or (dimensions[0] if dimensions else "category")
                sql = f"""
                    SELECT 
                        {dim},
                        AVG({m1}) AS avg_{m1},
                        AVG({m2}) AS avg_{m2},
                        COUNT(*) AS occurrences
                    FROM {table_name}
                    WHERE {dim} IS NOT NULL
                    GROUP BY {dim}
                    ORDER BY avg_{m1} DESC
                    LIMIT 30
                """
                return {
                    "matched": True,
                    "intent": "relationship",
                    "dimension": dim,
                    "measure": f"{m1} vs {m2}",
                    "aggregation": "avg",
                    "chart_type": "scatter",
                    "title": f"{m1.replace('_', ' ').title()} vs {m2.replace('_', ' ').title()}",
                    "sql": sql.strip(),
                    "explanation": f"Correlation and dispersion between {m1} and {m2} grouped by {dim}."
                }

        # 4. Top N / Bottom N Ranking (e.g. "top 5 products by profit", "worst 3 regions by sales")
        top_match = re.search(r"(?:top|highest|best|first)\s+(\d+)", q)
        bottom_match = re.search(r"(?:bottom|lowest|worst|least)\s+(\d+)", q)
        
        if top_match or bottom_match or any(k in q for k in ["highest", "best", "top", "lowest", "worst", "rank"]):
            n = 5
            if top_match:
                n = int(top_match.group(1))
            elif bottom_match:
                n = int(bottom_match.group(1))
            elif "10" in q:
                n = 10
            
            sort_dir = "ASC" if (bottom_match or any(k in q for k in ["lowest", "worst", "bottom", "least"])) else "DESC"
            target_dim = matched_dimension or (dimensions[0] if dimensions else "category")
            target_m = matched_measure or (measures[0] if measures else "sales")

            sql = f"""
                SELECT 
                    {target_dim},
                    {agg_func}({target_m}) AS metric_val
                FROM {table_name}
                WHERE {target_dim} IS NOT NULL
                GROUP BY {target_dim}
                ORDER BY metric_val {sort_dir}
                LIMIT {n}
            """
            chart_type = "bar"
            label = "Top" if sort_dir == "DESC" else "Bottom"
            return {
                "matched": True,
                "intent": "ranking",
                "dimension": target_dim,
                "measure": target_m,
                "aggregation": agg_name,
                "chart_type": chart_type,
                "title": f"{label} {n} {target_dim.replace('_', ' ').title()} by {target_m.replace('_', ' ').title()}",
                "sql": sql.strip(),
                "explanation": f"Ranking query of {label.lower()} {n} {target_dim} ordered by {target_m}."
            }

        # 5. Categorical Breakdown (e.g. "sales by region", "profit across categories", "churn rate per tier")
        by_match = re.search(r"(?:by|across|per|in)\s+([a-z0-9_]+)", q)
        if by_match or matched_dimension:
            target_dim = matched_dimension
            if not target_dim and by_match:
                target_dim = FastAnalyticalParser._find_matching_dimension(by_match.group(1), dimensions)

            if not target_dim and dimensions:
                target_dim = dimensions[0]

            target_m = matched_measure or (measures[0] if measures else "sales")

            chart_type = "bar"
            if any(w in q for w in ["share", "distribution", "proportion", "percentage", "donut", "pie", "split"]):
                chart_type = "donut"

            sql = f"""
                SELECT 
                    {target_dim},
                    {agg_func}({target_m}) AS total_val
                FROM {table_name}
                WHERE {target_dim} IS NOT NULL
                GROUP BY {target_dim}
                ORDER BY total_val DESC
                LIMIT 15
            """
            return {
                "matched": True,
                "intent": "comparison",
                "dimension": target_dim,
                "measure": target_m,
                "aggregation": agg_name,
                "chart_type": chart_type,
                "title": f"{target_m.replace('_', ' ').title()} by {target_dim.replace('_', ' ').title()}",
                "sql": sql.strip(),
                "explanation": f"Categorical distribution of {target_m} grouped by {target_dim}."
            }

        # 6. Smart Fallback: If no pattern explicitly matched, formulate the best analytical grouping
        default_dim = matched_dimension or (dimensions[0] if dimensions else "category")
        default_m = matched_measure or (measures[0] if measures else "sales")
        sql = f"""
            SELECT 
                {default_dim},
                SUM({default_m}) AS total_{default_m}
            FROM {table_name}
            WHERE {default_dim} IS NOT NULL
            GROUP BY {default_dim}
            ORDER BY total_{default_m} DESC
            LIMIT 10
        """
        return {
            "matched": True,
            "intent": "comparison",
            "dimension": default_dim,
            "measure": default_m,
            "aggregation": "sum",
            "chart_type": "bar",
            "title": f"{default_m.replace('_', ' ').title()} by {default_dim.replace('_', ' ').title()}",
            "sql": sql.strip(),
            "explanation": f"Analytical breakdown of {default_m} evaluated across {default_dim}."
        }
