import os
import uuid
import datetime
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("insight_ai.share_manager")

class ShareManager:
    """
    Manages secure shareable links for datasets with granular access control:
    - 'view': Read-only dashboard, KPI exploration, query execution.
    - 'editor': Collaborative editing, data cleaning transformations, custom chart creation.
    """
    def __init__(self):
        # In-memory share storage: token -> share record
        self.shares: Dict[str, Dict[str, Any]] = {}
        # Ensure fallback store in mongo_manager has insight_shares
        try:
            from backend.data.mongo_manager import mongo_manager
            if "insight_shares" not in mongo_manager.fallback_store:
                mongo_manager.fallback_store["insight_shares"] = []
        except Exception:
            pass

    def create_share(
        self,
        dataset_id: str,
        owner_email: str,
        permission: str = "view",
        label: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new share link token for a dataset.
        permission must be 'view' or 'editor'.
        """
        if permission not in ("view", "editor"):
            permission = "view"

        token = f"sh_{uuid.uuid4().hex[:16]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        share_record = {
            "share_token": token,
            "dataset_id": dataset_id,
            "owner_email": owner_email,
            "permission": permission,
            "label": label or f"Shared {permission.capitalize()} Link",
            "created_at": now,
            "access_count": 0,
            "last_accessed": None,
            "is_active": True
        }

        self.shares[token] = share_record

        # Persist to MongoDB if connected
        try:
            from backend.data.mongo_manager import mongo_manager
            if mongo_manager.connected and mongo_manager.db is not None:
                mongo_manager.db["insight_shares"].insert_one(dict(share_record))
            else:
                mongo_manager.fallback_store["insight_shares"].append(dict(share_record))
        except Exception as err:
            logger.warning(f"Could not persist share record to mongo: {err}")

        logger.info(f"Created share link '{token}' for dataset '{dataset_id}' by '{owner_email}' with permission '{permission}'")
        return share_record

    def get_share(self, share_token: str) -> Optional[Dict[str, Any]]:
        """Resolve share record by token."""
        if not share_token:
            return None

        # Check in-memory first
        if share_token in self.shares:
            rec = self.shares[share_token]
            if rec.get("is_active", True):
                return rec
            return None

        # Fallback to MongoDB / fallback store
        try:
            from backend.data.mongo_manager import mongo_manager
            if mongo_manager.connected and mongo_manager.db is not None:
                doc = mongo_manager.db["insight_shares"].find_one({"share_token": share_token, "is_active": True})
                if doc:
                    doc.pop("_id", None)
                    self.shares[share_token] = doc
                    return doc
            else:
                for item in mongo_manager.fallback_store.get("insight_shares", []):
                    if item.get("share_token") == share_token and item.get("is_active", True):
                        self.shares[share_token] = item
                        return item
        except Exception as err:
            logger.warning(f"Error querying share token {share_token}: {err}")

        return None

    def list_shares_for_dataset(self, dataset_id: str, owner_email: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all active shares for a given dataset owned by owner_email."""
        results = []
        # Query memory
        for token, rec in self.shares.items():
            if rec.get("dataset_id") == dataset_id and rec.get("is_active", True):
                if not owner_email or rec.get("owner_email") == owner_email:
                    results.append(rec)

        # Merge from mongo if available
        try:
            from backend.data.mongo_manager import mongo_manager
            if mongo_manager.connected and mongo_manager.db is not None:
                query = {"dataset_id": dataset_id, "is_active": True}
                if owner_email:
                    query["owner_email"] = owner_email
                docs = list(mongo_manager.db["insight_shares"].find(query))
                for d in docs:
                    d.pop("_id", None)
                    if not any(r["share_token"] == d["share_token"] for r in results):
                        results.append(d)
        except Exception:
            pass

        return results

    def revoke_share(self, share_token: str, owner_email: Optional[str] = None) -> bool:
        """Revoke / deactivate a share link."""
        rec = self.get_share(share_token)
        if not rec:
            return False

        if owner_email and rec.get("owner_email") != owner_email:
            raise PermissionError("Access denied: only the dataset owner can revoke this share link.")

        rec["is_active"] = False
        self.shares[share_token] = rec

        try:
            from backend.data.mongo_manager import mongo_manager
            if mongo_manager.connected and mongo_manager.db is not None:
                mongo_manager.db["insight_shares"].update_one(
                    {"share_token": share_token},
                    {"$set": {"is_active": False}}
                )
            else:
                for item in mongo_manager.fallback_store.get("insight_shares", []):
                    if item.get("share_token") == share_token:
                        item["is_active"] = False
        except Exception:
            pass

        logger.info(f"Share link '{share_token}' was successfully revoked.")
        return True

    def record_access(self, share_token: str, user_email: Optional[str] = None):
        """Increment access counter and record timestamp for analytics."""
        rec = self.get_share(share_token)
        if rec:
            rec["access_count"] = rec.get("access_count", 0) + 1
            rec["last_accessed"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            if user_email and "accessed_by" not in rec:
                rec["accessed_by"] = []
            if user_email and user_email not in rec.get("accessed_by", []):
                rec["accessed_by"].append(user_email)

share_manager = ShareManager()
