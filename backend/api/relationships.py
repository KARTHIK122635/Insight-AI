import math
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from backend.data.store import dataset_store
from backend.data.sanitizer import sanitize_for_json
from backend.api.security_deps import get_optional_identity

router = APIRouter(prefix="/api/relationships", tags=["relationships"])

@router.get("/{dataset_id}")
def get_relationships_graph(
    dataset_id: str,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """
    Generate Entity-Relationship and Correlation Network Graph for Apache ECharts.
    """
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    df = ds["df"]
    summary = ds["summary"]
    columns = ds["columns"]

    nodes = []
    links = []
    categories = [
        {"name": "Measures", "itemStyle": {"color": "#6366f1"}},
        {"name": "Dimensions", "itemStyle": {"color": "#06b6d4"}},
        {"name": "Temporal", "itemStyle": {"color": "#f59e0b"}},
        {"name": "Geographical", "itemStyle": {"color": "#10b981"}},
        {"name": "Identifiers", "itemStyle": {"color": "#8b5cf6"}}
    ]

    measures = summary.get("measures", [])
    dimensions = summary.get("dimensions", [])
    temporal = summary.get("temporal_columns", [])
    geographical = summary.get("geographical_columns", [])
    identifiers = summary.get("identifier_columns", [])

    # Add Nodes
    for col_name, info in columns.items():
        sem = info.get("semantic_type", "")
        if info.get("is_measure"):
            cat_idx = 0
            symbol_size = 45
        elif sem == "temporal":
            cat_idx = 2
            symbol_size = 38
        elif sem == "geographical":
            cat_idx = 3
            symbol_size = 38
        elif sem == "identifier":
            cat_idx = 4
            symbol_size = 28
        else:
            cat_idx = 1
            symbol_size = 34

        nodes.append({
            "id": col_name,
            "name": info.get("display_name", col_name),
            "category": cat_idx,
            "symbolSize": symbol_size,
            "value": info.get("unique_count", 0),
            "tooltip": f"{col_name} ({sem}) - {info.get('unique_count', 0)} uniques"
        })

    # Add Links 1: Pearson Correlations between Numeric Measures
    numeric_cols = [m for m in measures if m in df.columns and df[m].dtype in ['int64', 'float64', 'int32', 'float32']]
    if len(numeric_cols) >= 2:
        corr_matrix = df[numeric_cols].corr()
        for i in range(len(numeric_cols)):
            for j in range(i + 1, len(numeric_cols)):
                c1 = numeric_cols[i]
                c2 = numeric_cols[j]
                val = corr_matrix.loc[c1, c2]
                if not math.isnan(val) and abs(val) >= 0.2:
                    strength = round(abs(val), 2)
                    links.append({
                        "source": c1,
                        "target": c2,
                        "value": round(float(val), 2),
                        "lineStyle": {
                            "width": max(1.5, strength * 5),
                            "curveness": 0.1,
                            "color": "#10b981" if val > 0 else "#f43f5e"
                        },
                        "label": {"show": True, "formatter": f"r={round(val, 2)}", "fontSize": 10}
                    })

    # Add Links 2: Structural grouping from Dimensions to Primary Measure
    primary_measure = measures[0] if measures else None
    if primary_measure:
        for dim in dimensions[:4]:
            if dim in df.columns:
                links.append({
                    "source": dim,
                    "target": primary_measure,
                    "value": "groups_by",
                    "lineStyle": {"width": 2, "type": "dashed", "color": "#475569"},
                    "label": {"show": False}
                })

    graph_options = {
        "title": {
            "text": "Dataset Entity & Correlation Network",
            "textStyle": {"color": "#f8fafc", "fontSize": 14}
        },
        "tooltip": {},
        "legend": [{"data": [c["name"] for c in categories], "textStyle": {"color": "#94a3b8"}, "bottom": 0}],
        "series": [{
            "type": "graph",
            "layout": "force",
            "animation": True,
            "data": nodes,
            "links": links,
            "categories": categories,
            "roam": True,
            "label": {
                "show": True,
                "position": "right",
                "color": "#e2e8f0",
                "fontSize": 11
            },
            "force": {
                "repulsion": 350,
                "edgeLength": [60, 160],
                "gravity": 0.1
            }
        }]
    }

    return sanitize_for_json({
        "dataset_id": dataset_id,
        "nodes_count": len(nodes),
        "links_count": len(links),
        "options": graph_options
    })
