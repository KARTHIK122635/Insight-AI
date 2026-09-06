import hashlib
import secrets
import datetime
import logging
from typing import Dict, Any, List, Optional
from backend.data.mongo_manager import mongo_manager

logger = logging.getLogger("insight_ai.api_key_manager")

class ApiKeyManager:
    """Enterprise API Key Management with SHA-256 Hashing and MongoDB Storage."""
    
    KEY_PREFIX = "iak_live_"

    def __init__(self):
        # Ensure fallback store collection exists
        if "insight_api_keys" not in mongo_manager.fallback_store:
            mongo_manager.fallback_store["insight_api_keys"] = []

    def _hash_key(self, raw_key: str) -> str:
        """Compute SHA-256 cryptographic hash of the raw API key."""
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    def _mask_key(self, raw_key: str) -> str:
        """Return safe masked representation of the API key for display."""
        if len(raw_key) > 16:
            return f"{raw_key[:12]}...{raw_key[-4:]}"
        return raw_key

    def create_key(
        self,
        name: str,
        role: str = "Data Analyst",
        expires_in_days: Optional[int] = None,
        created_by: str = "system"
    ) -> Dict[str, Any]:
        """
        Generate a new cryptographically secure API key.
        The raw key is returned only on creation.
        """
        raw_secret = secrets.token_hex(20)
        raw_key = f"{self.KEY_PREFIX}{raw_secret}"
        hashed_key = self._hash_key(raw_key)
        key_id = f"key_{secrets.token_hex(4)}"

        now = datetime.datetime.now(datetime.timezone.utc)
        expires_at = None
        if expires_in_days and expires_in_days > 0:
            expires_at = (now + datetime.timedelta(days=expires_in_days)).isoformat()

        record = {
            "key_id": key_id,
            "name": name.strip() or "Default Analytics Key",
            "key_prefix": self._mask_key(raw_key),
            "hashed_key": hashed_key,
            "role": role,
            "created_at": now.isoformat(),
            "expires_at": expires_at,
            "last_used_at": None,
            "is_active": True,
            "created_by": created_by
        }

        # Store in MongoDB or in-memory fallback
        if mongo_manager.connected and mongo_manager.db is not None:
            try:
                mongo_manager.db["insight_api_keys"].insert_one(record)
            except Exception as err:
                logger.error(f"Failed to persist API key to MongoDB: {err}. Writing to memory fallback.")
                mongo_manager.fallback_store["insight_api_keys"].append(record)
        else:
            mongo_manager.fallback_store["insight_api_keys"].append(record)

        logger.info(f"Generated new API key '{name}' (id: {key_id}, role: {role})")
        
        # Return record with raw_key populated exclusively once
        return {
            "key_id": key_id,
            "name": record["name"],
            "raw_key": raw_key,
            "key_prefix": record["key_prefix"],
            "role": role,
            "created_at": record["created_at"],
            "expires_at": record["expires_at"],
            "is_active": True
        }

    def list_keys(self) -> List[Dict[str, Any]]:
        """List all generated API keys with masked prefixes (raw keys excluded)."""
        keys = []
        if mongo_manager.connected and mongo_manager.db is not None:
            try:
                cursor = mongo_manager.db["insight_api_keys"].find({}, {"_id": 0, "hashed_key": 0})
                keys = list(cursor)
            except Exception as err:
                logger.error(f"Error fetching API keys from MongoDB: {err}")
                keys = mongo_manager.fallback_store.get("insight_api_keys", [])
        else:
            keys = mongo_manager.fallback_store.get("insight_api_keys", [])

        # Sanitize records to exclude hashed_key if present in memory
        sanitized = []
        for k in keys:
            item = dict(k)
            item.pop("hashed_key", None)
            item.pop("_id", None)
            sanitized.append(item)

        return sorted(sanitized, key=lambda x: x.get("created_at", ""), reverse=True)

    def verify_key(self, raw_key: Any) -> Optional[Dict[str, Any]]:
        """
        Validate an API key by matching hash against active stored keys.
        Updates last_used_at timestamp upon valid authentication.
        """
        if not raw_key or not isinstance(raw_key, str) or not raw_key.startswith(self.KEY_PREFIX):
            return None

        target_hash = self._hash_key(raw_key.strip())
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Check MongoDB
        if mongo_manager.connected and mongo_manager.db is not None:
            try:
                record = mongo_manager.db["insight_api_keys"].find_one({"hashed_key": target_hash})
                if record and record.get("is_active"):
                    # Check expiration
                    exp = record.get("expires_at")
                    if exp and exp < now:
                        logger.warning(f"API key {record.get('key_id')} expired at {exp}")
                        return None
                    
                    # Update last_used_at
                    mongo_manager.db["insight_api_keys"].update_one(
                        {"_id": record["_id"]},
                        {"$set": {"last_used_at": now}}
                    )
                    res = dict(record)
                    res.pop("hashed_key", None)
                    res.pop("_id", None)
                    return res
            except Exception as err:
                logger.error(f"Error verifying API key against MongoDB: {err}")

        # Check memory fallback
        for record in mongo_manager.fallback_store.get("insight_api_keys", []):
            if record.get("hashed_key") == target_hash and record.get("is_active"):
                exp = record.get("expires_at")
                if exp and exp < now:
                    return None
                record["last_used_at"] = now
                res = dict(record)
                res.pop("hashed_key", None)
                res.pop("_id", None)
                return res

        return None

    def revoke_key(self, key_id: str) -> bool:
        """Revoke an existing API key by ID."""
        success = False
        if mongo_manager.connected and mongo_manager.db is not None:
            try:
                res = mongo_manager.db["insight_api_keys"].update_one(
                    {"key_id": key_id},
                    {"$set": {"is_active": False}}
                )
                success = res.modified_count > 0
            except Exception as err:
                logger.error(f"Error revoking API key in MongoDB: {err}")

        for record in mongo_manager.fallback_store.get("insight_api_keys", []):
            if record.get("key_id") == key_id:
                record["is_active"] = False
                success = True

        return success

    def delete_key(self, key_id: str) -> bool:
        """Permanently delete an API key by ID."""
        success = False
        if mongo_manager.connected and mongo_manager.db is not None:
            try:
                res = mongo_manager.db["insight_api_keys"].delete_one({"key_id": key_id})
                success = res.deleted_count > 0
            except Exception as err:
                logger.error(f"Error deleting API key in MongoDB: {err}")

        initial_len = len(mongo_manager.fallback_store.get("insight_api_keys", []))
        mongo_manager.fallback_store["insight_api_keys"] = [
            k for k in mongo_manager.fallback_store.get("insight_api_keys", [])
            if k.get("key_id") != key_id
        ]
        if len(mongo_manager.fallback_store.get("insight_api_keys", [])) < initial_len:
            success = True

        return success

# Global Singleton Instance
api_key_manager = ApiKeyManager()
