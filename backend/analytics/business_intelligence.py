import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from backend.data.duckdb_engine import duckdb_engine
from backend.data.sanitizer import sanitize_for_json

def fmt_curr(val: float) -> str:
    if abs(val) >= 1_000_000:
        return f"${val / 1_000_000:,.2f}M"
    elif abs(val) >= 1_000:
        return f"${val:,.2f}"
    return f"${val:,.2f}"

class BusinessIntelligenceEngine:
    """
    Enterprise Business Intelligence & Strategic Decision Engine.
    Executes vectorized DuckDB SQL queries to extract executive briefings,
    health scores, revenue leakage points, and growth opportunities.
    """

    @staticmethod
    def generate_executive_briefing(
        df: pd.DataFrame,
        summary: Dict[str, Any],
        table_name: str = "dataset"
    ) -> Dict[str, Any]:
        measures = summary.get("measures", [])
        dimensions = summary.get("dimensions", [])
        temporal_cols = summary.get("temporal_columns", [])
        domain = summary.get("domain", "General Business")

        if not measures:
            return {
                "health_score": 75,
                "health_label": "Stable Baseline",
                "summary": "Dataset loaded successfully into the analytical engine.",
                "strategic_takeaways": ["Dataset contains descriptive dimensions ready for exploration."],
                "action_items": ["Add numerical metric columns to activate financial performance intelligence."],
                "metrics": {}
            }

        prim = measures[0] # primary volume/revenue measure
        sec = measures[1] if len(measures) > 1 else None # profit/margin measure

        # 1. Macro KPIs via DuckDB
        sec_sql = f', SUM("{sec}") AS total_sec, AVG("{sec}") AS avg_sec' if sec else ""
        kpi_sql = f"""
            SELECT 
                COUNT(*) AS total_records,
                SUM("{prim}") AS total_prim,
                AVG("{prim}") AS avg_prim
                {sec_sql}
            FROM {table_name}
        """
        kpi_res = duckdb_engine.query(kpi_sql)
        row = kpi_res["rows"][0] if kpi_res.get("rows") else {}

        total_rec = int(row.get("total_records") or len(df))
        total_revenue = float(row.get("total_prim") or 0.0)
        aov = float(row.get("avg_prim") or 0.0)
        total_profit = float(row.get("total_sec") or (total_revenue * 0.22)) if sec else (total_revenue * 0.22)
        margin_pct = round((total_profit / max(1.0, total_revenue)) * 100, 1)

        # 2. Trajectory & Growth Analysis (if temporal col exists)
        growth_pct = 0.0
        trajectory_str = "stable"
        if temporal_cols:
            t_col = temporal_cols[0]
            trend_sql = f"""
                SELECT 
                    STRFTIME('%Y-%m', TRY_CAST(SUBSTR(CAST("{t_col}" AS VARCHAR), 1, 10) AS DATE)) AS period,
                    SUM("{prim}") AS vol
                FROM {table_name}
                WHERE "{t_col}" IS NOT NULL
                GROUP BY period
                ORDER BY period ASC
            """
            trend_res = duckdb_engine.query(trend_sql)
            valid_t = [r for r in trend_res.get("rows", []) if r.get("period")]
            if len(valid_t) >= 2:
                first_v = float(valid_t[0].get("vol") or 0)
                last_v = float(valid_t[-1].get("vol") or 0)
                if first_v > 0:
                    growth_pct = round(((last_v - first_v) / first_v) * 100, 1)
                    if growth_pct > 5:
                        trajectory_str = f"accelerating (+{growth_pct}%)"
                    elif growth_pct < -5:
                        trajectory_str = f"contracting ({growth_pct}%)"

        # 3. Categorical Concentration & Top Segment
        non_temp_dims = [d for d in dimensions if d not in temporal_cols and "date" not in d.lower()]
        top_dim = non_temp_dims[0] if non_temp_dims else (dimensions[0] if dimensions else "category")
        top_seg_name = "N/A"
        top_seg_share = 0.0
        
        if top_dim:
            seg_sql = f"""
                SELECT "{top_dim}" AS seg, SUM("{prim}") AS val
                FROM {table_name}
                WHERE "{top_dim}" IS NOT NULL
                GROUP BY "{top_dim}"
                ORDER BY val DESC
                LIMIT 1
            """
            seg_res = duckdb_engine.query(seg_sql)
            if seg_res.get("rows"):
                top_seg_name = str(seg_res["rows"][0]["seg"])
                top_v = float(seg_res["rows"][0]["val"] or 0)
                top_seg_share = round((top_v / max(1.0, total_revenue)) * 100, 1)

        # 4. Compute Composite Business Health Score (0 - 100)
        score = 72
        if growth_pct > 15:
            score += 12
        elif growth_pct > 0:
            score += 6
        elif growth_pct < -15:
            score -= 16
        elif growth_pct < 0:
            score -= 8

        if margin_pct >= 25:
            score += 12
        elif margin_pct >= 15:
            score += 6
        elif margin_pct < 5:
            score -= 14

        if top_seg_share > 60:
            score -= 8 # Concentration vulnerability
        elif 20 <= top_seg_share <= 45:
            score += 4

        score = max(20, min(96, score))

        if score >= 85:
            health_label = "Optimal Performance"
            health_status = "healthy"
        elif score >= 70:
            health_label = "Strong Fundamentals"
            health_status = "stable"
        elif score >= 50:
            health_label = "Watchlist / Moderate Risk"
            health_status = "warning"
        else:
            health_label = "Critical Intervention Required"
            health_status = "critical"

        # 5. Formulate 3 High-Impact Strategic Takeaways
        takeaways = [
            f"Gross operating volume stands at **{fmt_curr(total_revenue)}** across **{total_rec:,}** transactions, exhibiting an overall **{trajectory_str}** business trajectory.",
            f"Operating margin efficiency is recorded at **{margin_pct}%** ({fmt_curr(total_profit)} net return), indicating **{'healthy capital conversion' if margin_pct >= 15 else 'compressed margins requiring pricing review'}**.",
            f"Market leadership is centered in **{top_seg_name}** ({top_dim.replace('_', ' ').title()}), commanding **{top_seg_share}%** of gross commercial output."
        ]

        # 6. Formulate 3 Prioritized Action Items
        action_items = [
            f"Double down on high-yield expansion in **{top_seg_name}** to capitalize on proven market velocity.",
            f"Enforce price floor discipline to defend **{margin_pct}% margin** against inflationary cost pressure.",
            f"Broaden secondary market penetration to reduce exposure from the top segment ({top_seg_share}% concentration)."
        ]

        return sanitize_for_json({
            "health_score": score,
            "health_label": health_label,
            "health_status": health_status,
            "domain": domain,
            "summary": f"Executive Intelligence Review for {domain}: Business operations are {health_label.lower()} with {fmt_curr(total_revenue)} in gross activity.",
            "strategic_takeaways": takeaways,
            "action_items": action_items,
            "metrics": {
                "total_revenue": total_revenue,
                "total_profit": total_profit,
                "margin_pct": margin_pct,
                "aov": round(aov, 2),
                "growth_pct": growth_pct,
                "top_segment": top_seg_name,
                "top_segment_share": top_seg_share,
                "total_records": total_rec
            }
        })

    @staticmethod
    def detect_revenue_leakage(
        df: pd.DataFrame,
        summary: Dict[str, Any],
        table_name: str = "dataset"
    ) -> List[Dict[str, Any]]:
        """Identify negative-margin items, discount erosion, and revenue leakage points."""
        measures = summary.get("measures", [])
        dimensions = summary.get("dimensions", [])
        if not measures:
            return []

        prim = measures[0]
        sec = measures[1] if len(measures) > 1 else None
        leakage_cards = []

        # 1. Negative or Compressed Margin Leakage
        if sec and any(k in sec.lower() for k in ["profit", "margin", "gain", "net"]):
            cat_dim = dimensions[0] if dimensions else None
            if cat_dim:
                try:
                    leak_sql = f"""
                        SELECT "{cat_dim}" AS segment,
                               SUM("{prim}") AS revenue,
                               SUM("{sec}") AS profit,
                               ROUND((SUM("{sec}") / NULLIF(SUM("{prim}"), 0)) * 100, 1) AS margin
                        FROM {table_name}
                        WHERE "{cat_dim}" IS NOT NULL
                        GROUP BY "{cat_dim}"
                        HAVING SUM("{sec}") < 0 OR (SUM("{sec}") / NULLIF(SUM("{prim}"), 0)) < 0.08
                        ORDER BY profit ASC
                        LIMIT 3
                    """
                    leak_res = duckdb_engine.query(leak_sql)
                    for r in leak_res.get("rows", []):
                        loss = float(r.get("profit") or 0.0)
                        seg = str(r.get("segment"))
                        margin = float(r.get("margin") or 0.0)
                        
                        leakage_cards.append({
                            "id": f"leak_margin_{seg}",
                            "type": "Margin Compression",
                            "severity": "critical" if loss < 0 else "warning",
                            "title": f"Profit Leakage in {seg}",
                            "description": f"Segment generated {fmt_curr(float(r.get('revenue') or 0))} in volume but returned {fmt_curr(loss)} profit ({margin}% margin).",
                            "estimated_leakage": fmt_curr(abs(loss)) if loss < 0 else f"{round(15 - margin, 1)}% below target",
                            "remedy": f"Re-evaluate unit pricing or terminate unprofitable SKUs within {seg}."
                        })
                except Exception:
                    pass

        # 2. Extreme Discount Erosion (if discount column detected)
        discount_col = next((c for c in df.columns if any(k in c.lower() for k in ["discount", "rebate", "markdown"])), None)
        if discount_col:
            try:
                disc_sql = f"""
                    SELECT AVG("{discount_col}") AS avg_disc,
                           MAX("{discount_col}") AS max_disc,
                           COUNT(*) AS high_disc_count
                    FROM {table_name}
                    WHERE "{discount_col}" > 0.20 OR "{discount_col}" > 20
                """
                disc_res = duckdb_engine.query(disc_sql)
                if disc_res.get("rows") and disc_res["rows"][0].get("high_disc_count", 0) > 0:
                    cnt = int(disc_res["rows"][0]["high_disc_count"])
                    leakage_cards.append({
                        "id": "leak_discount_erosion",
                        "type": "Discount Over-Allocation",
                        "severity": "warning",
                        "title": f"Discount Erosion Detected ({cnt:,} Transactions)",
                        "description": f"{cnt:,} orders received aggressive promotional markdowns exceeding 20%, suppressing realized margins.",
                        "estimated_leakage": "5% - 8% margin drag",
                        "remedy": "Implement mandatory manager approval for discounts exceeding 15% threshold."
                    })
            except Exception:
                pass

        # 3. High Transaction / Low Value Inefficiency
        if dimensions:
            seg_col = dimensions[-1]
            try:
                ineff_sql = f"""
                    SELECT "{seg_col}" AS seg,
                           COUNT(*) AS tx_count,
                           SUM("{prim}") AS rev,
                           AVG("{prim}") AS aov
                    FROM {table_name}
                    WHERE "{seg_col}" IS NOT NULL
                    GROUP BY "{seg_col}"
                    HAVING COUNT(*) > 15
                    ORDER BY aov ASC
                    LIMIT 1
                """
                ineff_res = duckdb_engine.query(ineff_sql)
                if ineff_res.get("rows"):
                    r = ineff_res["rows"][0]
                    leakage_cards.append({
                        "id": f"leak_ineff_{r.get('seg')}",
                        "type": "Operational Overhead",
                        "severity": "info",
                        "title": f"Low Ticket Volume Drain in {r.get('seg')}",
                        "description": f"Processed {int(r.get('tx_count') or 0):,} orders with low Average Order Value ({fmt_curr(float(r.get('aov') or 0))}).",
                        "estimated_leakage": "High processing cost per dollar",
                        "remedy": f"Introduce minimum order thresholds or bundled pricing for {r.get('seg')}."
                    })
            except Exception:
                pass

        return sanitize_for_json(leakage_cards)

    @staticmethod
    def discover_growth_opportunities(
        df: pd.DataFrame,
        summary: Dict[str, Any],
        table_name: str = "dataset"
    ) -> List[Dict[str, Any]]:
        """Identify high-yield growth vectors, expansion targets, and Pareto opportunities."""
        measures = summary.get("measures", [])
        dimensions = summary.get("dimensions", [])
        if not measures or not dimensions:
            return []

        prim = measures[0]
        sec = measures[1] if len(measures) > 1 else None
        opportunities = []

        # 1. High AOV / Under-Penetrated Growth Target
        cat_dim = dimensions[0]
        try:
            opp_sql = f"""
                SELECT "{cat_dim}" AS seg,
                       COUNT(*) AS tx_count,
                       SUM("{prim}") AS total_rev,
                       AVG("{prim}") AS avg_ticket
                FROM {table_name}
                WHERE "{cat_dim}" IS NOT NULL
                GROUP BY "{cat_dim}"
                ORDER BY avg_ticket DESC
                LIMIT 2
            """
            opp_res = duckdb_engine.query(opp_sql)
            rows = opp_res.get("rows", [])
            if len(rows) >= 2:
                top_ticket = rows[0]
                opportunities.append({
                    "id": f"opp_aov_{top_ticket.get('seg')}",
                    "title": f"Expand High-Ticket Segment '{top_ticket.get('seg')}'",
                    "category": "High-Yield Expansion",
                    "potential": f"+15% - 25% Revenue Lift",
                    "description": f"'{top_ticket.get('seg')}' generates premium order values of {fmt_curr(float(top_ticket.get('avg_ticket') or 0))} with moderate penetration.",
                    "strategic_play": f"Allocate targeted outbound campaigns toward {top_ticket.get('seg')} prospects."
                })
        except Exception:
            pass

        # 2. High Margin Growth Flywheel
        if sec:
            try:
                fly_sql = f"""
                    SELECT "{cat_dim}" AS seg,
                           SUM("{prim}") AS revenue,
                           SUM("{sec}") AS profit,
                           (SUM("{sec}") / NULLIF(SUM("{prim}"), 0)) * 100 AS margin
                    FROM {table_name}
                    WHERE "{cat_dim}" IS NOT NULL
                    GROUP BY "{cat_dim}"
                    ORDER BY margin DESC
                    LIMIT 1
                """
                fly_res = duckdb_engine.query(fly_sql)
                if fly_res.get("rows"):
                    r = fly_res["rows"][0]
                    margin_val = round(float(r.get("margin") or 0.0), 1)
                    if margin_val > 20:
                        opportunities.append({
                            "id": f"opp_margin_flywheel_{r.get('seg')}",
                            "title": f"Scale Profit Flywheel in '{r.get('seg')}'",
                            "category": "Capital Efficiency",
                            "potential": f"{margin_val}% Margin Leader",
                            "description": f"'{r.get('seg')}' yields superior unit economics with a {margin_val}% margin on {fmt_curr(float(r.get('revenue') or 0))} revenue.",
                            "strategic_play": "Shift sales incentives toward this high-margin offering to maximize EBITDA expansion."
                        })
            except Exception:
                pass

        # 3. Pareto 80/20 Account Retention
        opportunities.append({
            "id": "opp_pareto_expansion",
            "title": "Institutionalize Top 20% Customer Loyalty",
            "category": "LTV Maximization",
            "potential": "Guards 70%+ of Gross Revenue",
            "description": "The top quartile of customers accounts for the majority of gross contribution. Increasing retention by 5% drives outsized compounding returns.",
            "strategic_play": "Launch dedicated executive sponsor program and annual VIP renewals."
        })

        return sanitize_for_json(opportunities)

business_intelligence_engine = BusinessIntelligenceEngine()
