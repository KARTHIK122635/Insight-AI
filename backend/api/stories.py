from fastapi import APIRouter, HTTPException, Response, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from backend.data.store import dataset_store
from backend.analytics.insights import InsightEngine
from backend.storytelling.narrative import StoryEngine
from backend.storytelling.report import ReportExporter
from backend.data.sanitizer import sanitize_for_json
from backend.api.security_deps import get_optional_identity

router = APIRouter(prefix="/api/stories", tags=["stories"])

# In-memory store for user-edited stories
user_edited_stories: Dict[str, Dict[str, Any]] = {}

class GenerateStoryRequest(BaseModel):
    tone: str = "executive" # executive, investor, operational, technical
    custom_focus: Optional[str] = None

class SaveStoryRequest(BaseModel):
    sections: List[Dict[str, Any]]
    story_metadata: Optional[Dict[str, Any]] = None

@router.post("/{dataset_id}")
def generate_story(
    dataset_id: str,
    req: Optional[GenerateStoryRequest] = None,
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

    story_data = StoryEngine.generate_executive_story(
        dataset_name=ds["name"],
        summary=ds["summary"],
        insights=insights,
        quality_summary=ds["quality"],
        table_name=table_name,
        df=ds["df"]
    )

    # Adjust tone if requested
    if req and req.tone and req.tone != "executive":
        tone_title = req.tone.title()
        for sec in story_data.get("sections", []):
            sec["badge"] = f"{tone_title} Focus"

    user_edited_stories[dataset_id] = story_data
    return sanitize_for_json(story_data)

@router.post("/{dataset_id}/save")
def save_user_customized_story(
    dataset_id: str,
    req: SaveStoryRequest,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """Save user-edited sections and slide customization while preserving charts."""
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    story_obj = user_edited_stories.get(dataset_id, {
        "dataset_name": ds["name"],
        "domain": ds["summary"].get("domain", "General Analytics"),
        "story": {}
    })

    # Preserve charts if only text was edited
    existing_sections = story_obj.get("sections", [])
    for new_sec in req.sections:
        match = next((s for s in existing_sections if s.get("id") == new_sec.get("id")), None)
        if match and "chart" in match and ("chart" not in new_sec or not new_sec["chart"]):
            new_sec["chart"] = match["chart"]

    story_obj["sections"] = req.sections
    user_edited_stories[dataset_id] = story_obj

    return sanitize_for_json({"success": True, "saved_sections_count": len(req.sections)})

@router.get("/{dataset_id}/export")
def export_story_markdown(
    dataset_id: str,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    # Use user-edited story if available
    story_data = user_edited_stories.get(dataset_id)
    if not story_data:
        insights = InsightEngine.discover_insights(
            df=ds["df"],
            summary=ds["summary"],
            table_name=f"data_{dataset_id}"
        )
        story_data = StoryEngine.generate_executive_story(
            dataset_name=ds["name"],
            summary=ds["summary"],
            insights=insights,
            quality_summary=ds["quality"],
            table_name=f"data_{dataset_id}",
            df=ds["df"]
        )

    md_content = ReportExporter.to_markdown(story_data)
    return Response(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=InsightAI_Story_{dataset_id}.md"}
    )
