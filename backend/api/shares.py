import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Header, status
from pydantic import BaseModel, Field

from backend.data.store import dataset_store
from backend.data.share_manager import share_manager
from backend.api.security_deps import get_optional_identity

logger = logging.getLogger("insight_ai.api.shares")

router = APIRouter(prefix="/api", tags=["Dataset Collaboration & Sharing"])

class CreateShareRequest(BaseModel):
    permission: str = Field(default="view", description="'view' for read-only or 'editor' for full editing/cleaning access")
    label: Optional[str] = Field(default=None, description="Optional nickname or purpose for the share link")

@router.post("/datasets/{dataset_id}/share")
def create_dataset_share(
    dataset_id: str,
    req: CreateShareRequest,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """
    Generate a secure shareable link for a dataset with specified permission ('view' or 'editor').
    Requires the caller to be the dataset owner.
    """
    owner_email = identity.get("email")
    if not owner_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A browser session is required to share datasets."
        )

    # Validate dataset existence
    ds = dataset_store.datasets.get(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    # Validate ownership (sample datasets can be shared by any authenticated user)
    if not ds.get("is_sample", False) and ds.get("owner_email") != owner_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only the dataset owner can generate shareable links."
        )

    permission = req.permission.lower().strip()
    if permission not in ("view", "editor"):
        raise HTTPException(
            status_code=400,
            detail="Invalid permission level. Must be 'view' (read-only) or 'editor' (collaborative)."
        )

    share_record = share_manager.create_share(
        dataset_id=dataset_id,
        owner_email=owner_email,
        permission=permission,
        label=req.label
    )

    return {
        "success": True,
        "share_token": share_record["share_token"],
        "dataset_id": dataset_id,
        "dataset_name": ds["name"],
        "permission": permission,
        "label": share_record["label"],
        "created_at": share_record["created_at"],
        "share_url": f"/?share={share_record['share_token']}"
    }

@router.get("/shares/{share_token}")
def get_share_information(share_token: str, identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)):
    """
    Public or authenticated lookup to resolve a share link and verify permissions.
    Returns dataset metadata and permission ('view' or 'editor').
    """
    share = share_manager.get_share(share_token)
    if not share or not share.get("is_active", True):
        raise HTTPException(status_code=404, detail="Invalid or expired share link.")

    dataset_id = share["dataset_id"]
    ds = dataset_store.datasets.get(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="The shared dataset is no longer available.")

    # Record access audit
    user_email = identity.get("email") if identity else None
    share_manager.record_access(share_token, user_email)

    return {
        "success": True,
        "share_token": share_token,
        "dataset_id": dataset_id,
        "name": ds["name"],
        "permission": share["permission"],
        "owner_email": share["owner_email"],
        "created_at": share["created_at"],
        "rows_count": ds["summary"].get("total_rows", 0),
        "columns_count": ds["summary"].get("total_columns", 0),
        "domain": ds["summary"].get("domain", "General Enterprise Analytics"),
        "columns": list(ds["df"].columns) if "df" in ds else [c["name"] if isinstance(c, dict) else str(c) for c in ds.get("columns", [])]
    }

@router.get("/datasets/{dataset_id}/shares")
def list_dataset_shares(
    dataset_id: str,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """
    List all active share links generated for this dataset. Only the owner can view this.
    """
    owner_email = identity.get("email")
    if not owner_email:
        raise HTTPException(status_code=401, detail="Authentication required.")

    ds = dataset_store.datasets.get(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    if not ds.get("is_sample", False) and ds.get("owner_email") != owner_email:
        raise HTTPException(status_code=403, detail="Access denied: not dataset owner.")

    shares = share_manager.list_shares_for_dataset(dataset_id, owner_email)
    return {
        "dataset_id": dataset_id,
        "dataset_name": ds["name"],
        "shares": shares
    }

@router.delete("/shares/{share_token}")
def revoke_dataset_share(
    share_token: str,
    identity: Optional[Dict[str, Any]] = Depends(get_optional_identity)
):
    """
    Revoke an active share link. Only the owner who created it can revoke it.
    """
    owner_email = identity.get("email")
    if not owner_email:
        raise HTTPException(status_code=401, detail="Authentication required.")

    share = share_manager.get_share(share_token)
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found.")

    if share.get("owner_email") != owner_email:
        raise HTTPException(status_code=403, detail="Access denied: only owner can revoke this link.")

    success = share_manager.revoke_share(share_token, owner_email)
    return {
        "success": success,
        "message": f"Share link '{share_token}' has been successfully revoked."
    }
