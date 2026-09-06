import logging
import re
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status, Depends
from backend.data.api_key_manager import api_key_manager
from backend.api.auth import decode_session_jwt

logger = logging.getLogger("insight_ai.security_deps")

def get_authenticated_identity(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    FastAPI Security Dependency:
    Validates identity from either an API Key (X-API-Key header or Bearer token)
    or a Google OAuth JWT session token.
    """
    # 1. Check X-API-Key header
    if isinstance(x_api_key, str) and x_api_key.strip():
        key_record = api_key_manager.verify_key(x_api_key.strip())
        if key_record:
            return {
                "auth_type": "api_key",
                "key_id": key_record.get("key_id"),
                "name": key_record.get("name"),
                "email": key_record.get("created_by") or f"apikey_{key_record.get('key_id')}@system.local",
                "role": key_record.get("role", "Data Analyst"),
                "is_active": True
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid, expired, or revoked API Key."
            )

    # 2. Check Authorization header
    if isinstance(authorization, str) and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1].strip()

        # Is it an API Key passed in Bearer format?
        if token.startswith("iak_live_"):
            key_record = api_key_manager.verify_key(token)
            if key_record:
                return {
                    "auth_type": "api_key",
                    "key_id": key_record.get("key_id"),
                    "name": key_record.get("name"),
                    "email": key_record.get("created_by") or f"apikey_{key_record.get('key_id')}@system.local",
                    "role": key_record.get("role", "Data Analyst"),
                    "is_active": True
                }
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid, expired, or revoked API Key."
            )

        # It is a JWT session token from Google OAuth
        payload = decode_session_jwt(token)
        if payload:
            return {
                "auth_type": "google_user",
                "email": payload.get("email"),
                "name": payload.get("name"),
                "role": payload.get("role", "Data Analyst"),
                "picture": payload.get("picture"),
                "provider": payload.get("provider", "google")
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token."
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide a valid Google session token or X-API-Key header."
    )

def get_optional_identity(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
) -> Optional[Dict[str, Any]]:
    """Optional authentication dependency that does not raise 401 if missing."""
    try:
        identity = get_authenticated_identity(x_api_key, authorization)
        return identity
    except HTTPException:
        if x_session_id and re.fullmatch(r"[a-f0-9-]{36}", x_session_id.strip().lower()):
            return {
                "auth_type": "anonymous_session",
                "email": f"session_{x_session_id.strip().lower()}",
                "session_id": x_session_id.strip().lower(),
                "role": "Session User"
            }
        return None
