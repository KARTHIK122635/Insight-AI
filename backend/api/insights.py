from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, Any
from backend.data.store import dataset_store
from backend.analytics.insights import InsightEngine
from backend.analytics.business_intelligence import business_intelligence_engine
from backend.api.security_deps import get_optional_identity

router = APIRouter(prefix="/api/insights", tags=["insights"])

@router.get("/{dataset_id}")
def get_dataset_insights(
    dataset_id: str,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    table_name = f"data_{dataset_id}"
    insights = InsightEngine.discover_insights(
        df=ds["df"],
        summary=ds["summary"],
        table_name=table_name
    )

    return {
        "dataset_id": dataset_id,
        "dataset_name": ds["name"],
        "count": len(insights),
        "insights": insights
    }

@router.get("/executive_briefing/{dataset_id}")
def get_executive_briefing(
    dataset_id: str,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """Generate high-impact executive briefing, health score, and prioritized decision items."""
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    table_name = f"data_{dataset_id}"
    briefing = business_intelligence_engine.generate_executive_briefing(
        df=ds["df"],
        summary=ds["summary"],
        table_name=table_name
    )
    briefing["dataset_id"] = dataset_id
    briefing["dataset_name"] = ds["name"]
    return briefing

@router.get("/business_opportunities/{dataset_id}")
def get_business_opportunities(
    dataset_id: str,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """Extract actionable growth opportunities and revenue leakage risks."""
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    table_name = f"data_{dataset_id}"
    opportunities = business_intelligence_engine.discover_growth_opportunities(
        df=ds["df"],
        summary=ds["summary"],
        table_name=table_name
    )
    leakage = business_intelligence_engine.detect_revenue_leakage(
        df=ds["df"],
        summary=ds["summary"],
        table_name=table_name
    )

    return {
        "dataset_id": dataset_id,
        "dataset_name": ds["name"],
        "opportunities": opportunities,
        "leakage": leakage
    }

