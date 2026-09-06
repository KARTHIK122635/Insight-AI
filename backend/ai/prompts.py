import json
from typing import Dict, Any, List

ANALYTICS_SYSTEM_PROMPT = """You are InsightAI, an elite enterprise data analyst and reasoning engine.
Your core principles:
1. NEVER hallucinate or guess numerical calculations. All arithmetic, aggregations, percentages, and rankings MUST derive strictly from the provided DuckDB query results and dataset metadata.
2. Formulate concise, executive-grade business narratives explaining the "Why" behind metrics.
3. Return ONLY valid, raw JSON (no conversational preamble or markdown backticks outside of JSON when structured output is requested).
4. Provide actionable, high-impact business recommendations.
"""

def build_intent_and_sql_prompt(
    user_query: str, 
    columns_info: List[Dict[str, Any]], 
    domain: str,
    recent_history: List[Dict[str, str]] = None
) -> str:
    cols_repr = []
    for c in columns_info:
        cols_repr.append(f"  - {c['name']} (type: {c['physical_type']}, semantic: {c['semantic_type']}, unique_values: {c['unique_count']})")
    cols_text = "\n".join(cols_repr)

    history_text = ""
    if recent_history:
        history_text = "Recent Conversation Context:\n" + "\n".join([f"{h['role'].upper()}: {h['content']}" for h in recent_history[-4:]]) + "\n"

    return f"""Dataset Domain: {domain}
Available Columns in table 'dataset':
{cols_text}

{history_text}User Question: "{user_query}"

Generate an analytical execution plan for DuckDB SQL.
Identify the user's intent, relevant dimensions, measures, chart recommendation, and exact SQL query against table 'dataset'.
Note: DuckDB supports standard ANSI SQL, STRFTIME for date formatting, and window functions.
If the user asks "Why did it drop?" or similar follow-up, use the prior context to identify the target dimension and metric.

Return ONLY a JSON object with this exact structure:
{{
  "intent": "comparison" | "trend" | "relationship" | "ranking" | "distribution" | "composition" | "root_cause" | "general",
  "dimension": "<dimension_column_name>",
  "measure": "<measure_column_name>",
  "aggregation": "sum" | "avg" | "count" | "min" | "max",
  "chart_type": "bar" | "line" | "scatter" | "pie" | "area",
  "title": "<Concise Chart Title>",
  "sql": "<Valid SELECT SQL query for DuckDB against table 'dataset'>",
  "explanation": "<Brief reasoning behind this query and chart choice>"
}}"""

def build_explanation_prompt(
    user_query: str,
    sql: str,
    query_results: List[Dict[str, Any]],
    domain: str,
    intent: str
) -> str:
    # Present up to 12 rows of exact data to the model
    sample_data = query_results[:12]
    data_str = json.dumps(sample_data, indent=2)

    return f"""You are the senior data analyst for a {domain} organization.
User Question: "{user_query}"
SQL Executed: {sql}
Exact Query Results from DuckDB ({len(query_results)} total rows, showing top {len(sample_data)}):
{data_str}

Analyze these EXACT numbers and formulate:
1. A direct, clear answer stating the exact figures from the results.
2. Deep business interpretation: explain what this means for the business, notable leaders or laggards, and root causes if apparent.
3. 2-3 specific, relevant analytical follow-up questions the user might want to explore next.

Return ONLY a JSON object:
{{
  "answer": "<Direct answer and business interpretation referencing exact numbers>",
  "evidence": "<One sentence highlighting the exact numerical proof>",
  "suggested_followups": [
    "<Follow up question 1>",
    "<Follow up question 2>",
    "<Follow up question 3>"
  ]
}}"""

def build_story_prompt(
    dataset_summary: Dict[str, Any],
    insights: List[Dict[str, Any]],
    quality_summary: Dict[str, Any]
) -> str:
    insights_text = json.dumps(insights[:6], indent=2)
    summary_text = json.dumps(dataset_summary, indent=2)

    return f"""You are a Chief Strategy Officer and Head of Business Intelligence.
Generate an 8-part Executive Data Story based strictly on these verified analytical insights:

Dataset Summary:
{summary_text}

Data Quality Grade: {quality_summary.get('grade', 'A')} (Score: {quality_summary.get('score', 95)}/100)

Discovered Deterministic Insights & Evidence:
{insights_text}

Generate a comprehensive executive story following the 8-part standard:
1. Executive Summary: High-level overview of health and performance.
2. Overall Performance: Detailed trajectory and scale.
3. Growth Drivers: Specific segments or products expanding revenue/profit.
4. Underperforming Areas: Regions, tiers, or categories experiencing stagnation or losses.
5. Anomalies: Notable statistical outliers or unexpected surges/drops.
6. Risks: Strategic vulnerabilities identified in data.
7. Opportunities: Low-hanging fruit and untapped upside.
8. Recommended Actions: 3-5 concrete business decisions leadership should execute immediately.

Return ONLY a JSON object matching:
{{
  "executive_summary": "...",
  "overall_performance": "...",
  "growth_drivers": "...",
  "underperforming_areas": "...",
  "anomalies": "...",
  "risks": "...",
  "opportunities": "...",
  "recommended_actions": [
    "Action 1...",
    "Action 2...",
    "Action 3..."
  ]
}}"""
