from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from backend.data.store import dataset_store
from backend.data.duckdb_engine import duckdb_engine
from backend.visualization.specification import EChartsSpecBuilder
from backend.data.sanitizer import sanitize_for_json
from backend.api.security_deps import get_optional_identity

router = APIRouter(prefix="/api/charts", tags=["charts"])

class ChartBuildRequest(BaseModel):
    dataset_id: Optional[str] = None
    dimension: str
    measure: str
    aggregation: str = "SUM" # SUM, AVG, COUNT, MIN, MAX
    chart_type: str = "bar" # bar, line, area, pie, donut, radar, funnel, treemap, pareto, scatter
    sort_direction: str = "desc"
    limit: int = 10
    color_theme: str = "indigo"
    filters: Optional[Dict[str, Any]] = None
    title: Optional[str] = None

@router.post("/build")
def build_custom_chart(
    req: ChartBuildRequest,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(req.dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    table_name = f"data_{ds['id']}"
    dim = req.dimension.replace("'", "")
    meas = req.measure.replace("'", "")
    agg = req.aggregation.upper()
    if agg not in ["SUM", "AVG", "COUNT", "MIN", "MAX"]:
        agg = "SUM"

    # Build WHERE clause from filters
    where_parts = []
    if req.filters:
        for k, v in req.filters.items():
            if v and v != "all" and v != "All":
                safe_k = k.replace("'", "")
                safe_v = str(v).replace("'", "''")
                where_parts.append(f"{safe_k} = '{safe_v}'")
    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else "WHERE 1=1"

    # Check temporal formatting
    is_temporal = dim in ds["summary"].get("temporal_columns", []) or "date" in dim.lower() or "month" in dim.lower()
    
    if is_temporal:
        dim_expr = f"STRFTIME('%Y-%m', CAST({dim} AS DATE))"
        group_dim = "period"
    else:
        dim_expr = dim
        group_dim = dim

    if req.chart_type == "scatter":
        sql = f"SELECT {dim}, {meas} FROM {table_name} {where_sql} AND {dim} IS NOT NULL AND {meas} IS NOT NULL LIMIT {req.limit * 5}"
    else:
        order_clause = f"ORDER BY agg_val {req.sort_direction.upper()}" if not is_temporal else f"ORDER BY {group_dim} ASC"
        sql = f"""
            SELECT 
                {dim_expr} AS {group_dim},
                {agg}({meas}) AS agg_val
            FROM {table_name}
            {where_sql} AND {dim} IS NOT NULL
            GROUP BY {group_dim}
            {order_clause}
            LIMIT {req.limit}
        """

    try:
        query_res = duckdb_engine.query(sql)
        rows = query_res["rows"]
        
        display_title = req.title or f"{agg} of {meas.replace('_', ' ').title()} by {dim.replace('_', ' ').title()}"
        
        echarts_option = EChartsSpecBuilder.build_option(
            chart_type=req.chart_type,
            title=display_title,
            data=rows,
            dimension=query_res["columns"][0] if query_res["columns"] else group_dim,
            measure=query_res["columns"][1] if len(query_res["columns"]) > 1 else query_res["columns"][0],
            theme_name=req.color_theme
        )

        return sanitize_for_json({
            "success": True,
            "title": display_title,
            "chart_type": req.chart_type,
            "dimension": dim,
            "measure": meas,
            "aggregation": agg,
            "sql": sql,
            "row_count": len(rows),
            "data": rows,
            "options": echarts_option
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Custom chart query failed: {str(e)}")
