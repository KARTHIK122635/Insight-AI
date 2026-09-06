from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.data.store import dataset_store
from backend.ai.orchestrator import ai_orchestrator
from backend.ai.gemini_client import gemini_client
from backend.ai.qwen import qwen_client
from backend.api.security_deps import get_optional_identity

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    question: str
    dataset_id: Optional[str] = None
    session_id: Optional[str] = "default_session"

class AIConfigRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    hf_token: Optional[str] = None

@router.post("")
def chat_with_analyst(
    req: ChatRequest,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    owner_email = identity.get("email") if identity else None
    ds = dataset_store.get_dataset(req.dataset_id, owner_email=owner_email)
    if not ds:
        raise HTTPException(status_code=404, detail="No active dataset available. Please upload or select a dataset first.")

    table_name = f"data_{ds['id']}"
    
    try:
        response = ai_orchestrator.process_user_query(
            query=req.question,
            dataset_summary=ds["summary"],
            col_profiles=ds["columns"],
            session_id=req.session_id,
            table_name=table_name
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Analytics error: {str(e)}")

@router.get("/history/{session_id}")
def get_chat_history(session_id: str):
    return {"history": ai_orchestrator.get_history(session_id)}

@router.get("/config")
def get_ai_config():
    """Return active AI engine telemetry and configuration status."""
    return {
        "active_provider": ai_orchestrator.get_active_provider(),
        "gemini": {
            "configured": gemini_client.is_configured(),
            "model": gemini_client.primary_model
        },
        "huggingface": {
            "configured": qwen_client.is_configured(),
            "model": qwen_client.primary_model
        },
        "engine": "DuckDB In-Memory OLAP + Zero Arithmetic Hallucination"
    }

@router.post("/config")
def update_ai_config(cfg: AIConfigRequest):
    """Dynamically set Google Gemini API Key or Hugging Face token at runtime."""
    updated = []
    if cfg.gemini_api_key is not None:
        gemini_client.set_api_key(cfg.gemini_api_key.strip())
        updated.append("Google Gemini API Key")
    if cfg.hf_token is not None:
        qwen_client.set_token(cfg.hf_token.strip())
        updated.append("Hugging Face Token")
    
    return {
        "success": True,
        "message": f"Updated: {', '.join(updated) if updated else 'No changes'}",
        "active_provider": ai_orchestrator.get_active_provider(),
        "gemini_configured": gemini_client.is_configured()
    }
