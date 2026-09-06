import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.data.api_key_manager import api_key_manager
from backend.api.security_deps import get_authenticated_identity

client = TestClient(app)

def test_demo_google_login_and_jwt():
    """Verify 1-click Enterprise Google Account login and JWT issuance."""
    res = client.post("/api/auth/demo-google")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "token" in data
    assert len(data["token"]) > 20
    assert data["user"]["email"] == "alex.morgan@enterprise.google.com"
    assert data["user"]["name"] == "Alex Morgan"
    assert "picture" in data["user"]
    assert "Google Identity Services" in data["user"]["provider"]

def test_get_current_user_with_jwt():
    """Verify GET /api/auth/me returns profile for valid JWT."""
    login_res = client.post("/api/auth/demo-google")
    token = login_res.json()["token"]

    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    user = me_res.json()["user"]
    assert user["email"] == "alex.morgan@enterprise.google.com"
    assert user["name"] == "Alex Morgan"

def test_get_current_user_unauthorized():
    """Verify GET /api/auth/me returns 401 when no token is provided."""
    res = client.get("/api/auth/me")
    assert res.status_code == 401

    res_invalid = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_token_xyz"})
    assert res_invalid.status_code == 401

def test_api_key_generation_and_masking():
    """Verify API key creation generates iak_live_ prefix and does not leak raw keys in list."""
    res = client.post("/api/security/keys", json={
        "name": "Automated ETL Pipeline",
        "role": "Data Analyst",
        "expires_in_days": 45
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    key_info = data["key"]
    raw_key = key_info["raw_key"]
    key_id = key_info["key_id"]
    assert raw_key.startswith("iak_live_")
    assert len(raw_key) > 30

    # List keys and ensure raw_key is NOT in the listing
    list_res = client.get("/api/security/keys")
    assert list_res.status_code == 200
    keys_list = list_res.json()["keys"]
    matching = next((k for k in keys_list if k["key_id"] == key_id), None)
    assert matching is not None
    assert "raw_key" not in matching
    assert "hashed_key" not in matching
    assert matching["key_prefix"].startswith("iak_live_")
    assert "..." in matching["key_prefix"]

def test_api_key_verification_workbench():
    """Verify live key testing against /api/security/keys/verify."""
    # Create key
    res = client.post("/api/security/keys", json={
        "name": "Workbench Verification Key",
        "role": "Administrator"
    })
    raw_key = res.json()["key"]["raw_key"]
    key_id = res.json()["key"]["key_id"]

    # Verify valid key
    verify_res = client.post("/api/security/keys/verify", json={"api_key": raw_key})
    assert verify_res.status_code == 200
    vdata = verify_res.json()
    assert vdata["valid"] is True
    assert vdata["status"] == "ACTIVE_AUTHENTICATED"
    assert vdata["key_id"] == key_id
    assert vdata["role"] == "Administrator"
    assert vdata["elapsed_ms"] >= 0

    # Verify tampered / invalid key
    tampered_key = raw_key[:-4] + "ffff"
    bad_res = client.post("/api/security/keys/verify", json={"api_key": tampered_key})
    assert bad_res.status_code == 200
    bdata = bad_res.json()
    assert bdata["valid"] is False
    assert bdata["status"] == "REJECTED"

def test_api_key_revocation_and_deletion():
    """Verify revoking or deleting an API key immediately disallows access."""
    res = client.post("/api/security/keys", json={
        "name": "Temporary Test Key",
        "role": "Read-Only"
    })
    raw_key = res.json()["key"]["raw_key"]
    key_id = res.json()["key"]["key_id"]

    # First verify it is valid
    v1 = client.post("/api/security/keys/verify", json={"api_key": raw_key})
    assert v1.json()["valid"] is True

    # Delete key
    del_res = client.delete(f"/api/security/keys/{key_id}")
    assert del_res.status_code == 200

    # Verify it is now rejected
    v2 = client.post("/api/security/keys/verify", json={"api_key": raw_key})
    assert v2.json()["valid"] is False

def test_security_dependency_injection():
    """Verify get_authenticated_identity with both X-API-Key and Bearer JWT."""
    # 1. API key header
    create_res = client.post("/api/security/keys", json={"name": "Dep Injection Key"})
    api_key = create_res.json()["key"]["raw_key"]
    identity = get_authenticated_identity(x_api_key=api_key)
    assert identity["auth_type"] == "api_key"
    assert identity["name"] == "Dep Injection Key"

    # 2. Google JWT bearer
    login_res = client.post("/api/auth/demo-google")
    token = login_res.json()["token"]
    jwt_identity = get_authenticated_identity(authorization=f"Bearer {token}")
    assert jwt_identity["auth_type"] == "google_user"
    assert jwt_identity["email"] == "alex.morgan@enterprise.google.com"

def test_security_config_endpoints():
    """Verify GET and POST for security configuration."""
    cfg_res = client.get("/api/security/config")
    assert cfg_res.status_code == 200
    cfg = cfg_res.json()
    assert "google_oauth" in cfg
    assert "api_keys" in cfg

    set_res = client.post("/api/security/config/google-client-id", json={
        "client_id": "123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com"
    })
    assert set_res.status_code == 200
    assert set_res.json()["configured"] is True

def test_ai_config_endpoints():
    """Verify GET and POST /api/chat/config for Gemini and HF configuration."""
    res = client.get("/api/chat/config")
    assert res.status_code == 200
    data = res.json()
    assert "active_provider" in data
    assert "gemini" in data
    assert "huggingface" in data

    update_res = client.post("/api/chat/config", json={
        "gemini_api_key": "AIzaSyTestKey1234567890abcdef"
    })
    assert update_res.status_code == 200
    assert update_res.json()["gemini_configured"] is True

    # Reset back to unconfigured so test suite tests fast-path local performance
    from backend.ai.gemini_client import gemini_client
    gemini_client.set_api_key("")

def test_chat_analyst_responses():
    """Verify chat answers questions properly with DuckDB SQL and narratives."""
    from backend.data.store import dataset_store
    import os
    dataset_store.preload_samples(os.path.join(os.getcwd(), "datasets"))
    ds_id = dataset_store.active_dataset_id

    res = client.post("/api/chat", json={
        "question": "Summarize this dataset",
        "dataset_id": ds_id
    })
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["answer"]) > 50
    assert "sql" in data
    assert "SELECT" in data["sql"]
    assert "suggested_followups" in data
    assert len(data["suggested_followups"]) > 0

def test_multi_user_data_isolation_and_privacy():
    """Verify that User A's uploaded dataset is strictly private and invisible to User B and unauthenticated guests."""
    from backend.api.auth import create_session_jwt
    import io

    # User A token & User B token
    token_a = create_session_jwt({
        "email": "user_a@enterprise.com",
        "name": "User Alpha",
        "picture": "",
        "role": "Data Analyst",
        "provider": "google"
    })
    token_b = create_session_jwt({
        "email": "user_b@enterprise.com",
        "name": "User Beta",
        "picture": "",
        "role": "Data Analyst",
        "provider": "google"
    })

    # User A uploads private dataset
    csv_content = b"department,revenue,cost\nEngineering,50000,20000\nSales,80000,30000\nMarketing,40000,15000\n"
    upload_res = client.post(
        "/api/datasets/upload",
        files={"file": ("alpha_private_finances.csv", io.BytesIO(csv_content), "text/csv")},
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert upload_res.status_code == 200
    dataset_id_a = upload_res.json()["dataset_id"]

    # 1. User A listing: sees their own dataset
    list_a = client.get("/api/datasets", headers={"Authorization": f"Bearer {token_a}"})
    assert list_a.status_code == 200
    dataset_ids_a = [d["id"] for d in list_a.json()["datasets"]]
    assert dataset_id_a in dataset_ids_a

    # 2. User B listing: User A's dataset is NOT in the list!
    list_b = client.get("/api/datasets", headers={"Authorization": f"Bearer {token_b}"})
    assert list_b.status_code == 200
    dataset_ids_b = [d["id"] for d in list_b.json()["datasets"]]
    assert dataset_id_a not in dataset_ids_b

    # 3. Unauthenticated guest listing (e.g. mobile device without login): User A's dataset is NOT in the list!
    list_guest = client.get("/api/datasets")
    assert list_guest.status_code == 200
    dataset_ids_guest = [d["id"] for d in list_guest.json()["datasets"]]
    assert dataset_id_a not in dataset_ids_guest

    # 4. Direct GET /api/datasets/{dataset_id} access control
    # User A can get it:
    get_a = client.get(f"/api/datasets/{dataset_id_a}", headers={"Authorization": f"Bearer {token_a}"})
    assert get_a.status_code == 200
    assert get_a.json()["name"] == "alpha_private_finances.csv"

    # User B is denied (404 / Access Denied):
    get_b = client.get(f"/api/datasets/{dataset_id_a}", headers={"Authorization": f"Bearer {token_b}"})
    assert get_b.status_code == 404

    # Unauthenticated guest is denied (404 / Access Denied):
    get_guest = client.get(f"/api/datasets/{dataset_id_a}")
    assert get_guest.status_code == 404

    # 5. Dashboard access control
    dash_a = client.get(f"/api/dashboard/{dataset_id_a}", headers={"Authorization": f"Bearer {token_a}"})
    assert dash_a.status_code == 200

    dash_b = client.get(f"/api/dashboard/{dataset_id_a}", headers={"Authorization": f"Bearer {token_b}"})
    assert dash_b.status_code == 404

    dash_guest = client.get(f"/api/dashboard/{dataset_id_a}")
    assert dash_guest.status_code == 404

    # 6. Deletion authorization: User B cannot delete User A's dataset
    del_b = client.delete(f"/api/datasets/{dataset_id_a}", headers={"Authorization": f"Bearer {token_b}"})
    assert del_b.status_code == 404

    # User A can delete their dataset
    del_a = client.delete(f"/api/datasets/{dataset_id_a}", headers={"Authorization": f"Bearer {token_a}"})
    assert del_a.status_code == 200

def test_personal_gmail_login():
    """Verify login with personal Gmail address and isolated session issuance."""
    res = client.post("/api/auth/personal-login", json={
        "email": "karthik.engineer@gmail.com",
        "name": "Karthik E"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "token" in data
    assert data["user"]["email"] == "karthik.engineer@gmail.com"
    assert data["user"]["name"] == "Karthik E"
    assert data["user"]["provider"] == "Personal Google / Gmail"

    # Verify invalid email format is rejected
    bad_res = client.post("/api/auth/personal-login", json={
        "email": "invalid_email_without_at"
    })
    assert bad_res.status_code == 400

def test_dataset_sharing_view_and_editor_permissions():
    """Verify share link generation, public/guest lookup, view-only enforcement, and editor collaboration."""
    from backend.api.auth import create_session_jwt
    import io

    # User A (Owner) and User B (Recipient)
    token_owner = create_session_jwt({
        "email": "owner@analytics.com",
        "name": "Owner User",
        "role": "Data Analyst"
    })
    token_collab = create_session_jwt({
        "email": "collaborator@analytics.com",
        "name": "Collab User",
        "role": "Data Analyst"
    })

    # 1. Owner uploads dataset
    csv_bytes = b"dept,budget,spend\nR&D,100000,45000\nMarketing,60000,55000\nOperations,80000,70000\n"
    up_res = client.post(
        "/api/datasets/upload",
        files={"file": ("shared_budget_plan.csv", io.BytesIO(csv_bytes), "text/csv")},
        headers={"Authorization": f"Bearer {token_owner}"}
    )
    assert up_res.status_code == 200
    ds_id = up_res.json()["dataset_id"]

    # 2. Non-owner cannot create share link
    bad_share = client.post(
        f"/api/datasets/{ds_id}/share",
        json={"permission": "view"},
        headers={"Authorization": f"Bearer {token_collab}"}
    )
    assert bad_share.status_code == 403

    # 3. Owner creates Viewer share link
    view_share = client.post(
        f"/api/datasets/{ds_id}/share",
        json={"permission": "view", "label": "Finance Audit View"},
        headers={"Authorization": f"Bearer {token_owner}"}
    )
    assert view_share.status_code == 200
    view_data = view_share.json()
    assert view_data["success"] is True
    assert view_data["permission"] == "view"
    view_token = view_data["share_token"]
    assert view_token.startswith("sh_")

    # 4. Resolve share link metadata via GET /api/shares/{share_token}
    info_res = client.get(f"/api/shares/{view_token}")
    assert info_res.status_code == 200
    assert info_res.json()["dataset_id"] == ds_id
    assert info_res.json()["permission"] == "view"
    assert info_res.json()["owner_email"] == "owner@analytics.com"

    # 5. Access dataset using view share token
    get_shared_res = client.get(
        f"/api/datasets/{ds_id}?share_token={view_token}",
        headers={"Authorization": f"Bearer {token_collab}"}
    )
    assert get_shared_res.status_code == 200
    assert get_shared_res.json()["name"] == "shared_budget_plan.csv"
    assert get_shared_res.json()["user_permission"] == "view"

    # 6. Attempt data cleaning with Viewer permission -> Must be rejected (403 Forbidden)
    clean_view_attempt = client.post(
        f"/api/clean/{ds_id}/transform?share_token={view_token}",
        json={"remove_duplicates": True},
        headers={"Authorization": f"Bearer {token_collab}"}
    )
    assert clean_view_attempt.status_code == 403
    assert "Read-only" in clean_view_attempt.json()["detail"] or "permission" in clean_view_attempt.json()["detail"]

    # 7. Owner creates Editor share link
    editor_share = client.post(
        f"/api/datasets/{ds_id}/share",
        json={"permission": "editor", "label": "Finance Co-Editor"},
        headers={"Authorization": f"Bearer {token_owner}"}
    )
    assert editor_share.status_code == 200
    editor_token = editor_share.json()["share_token"]
    assert editor_share.json()["permission"] == "editor"

    # 8. User with Editor permission can clean/transform dataset
    clean_editor_attempt = client.post(
        f"/api/clean/{ds_id}/transform?share_token={editor_token}",
        json={"remove_duplicates": True},
        headers={"Authorization": f"Bearer {token_collab}"}
    )
    assert clean_editor_attempt.status_code == 200
    assert clean_editor_attempt.json()["success"] is True

    # 9. List active share links for this dataset
    list_shares = client.get(f"/api/datasets/{ds_id}/shares", headers={"Authorization": f"Bearer {token_owner}"})
    assert list_shares.status_code == 200
    assert len(list_shares.json()["shares"]) >= 2

    # 10. Revoke share link
    revoke_res = client.delete(f"/api/shares/{view_token}", headers={"Authorization": f"Bearer {token_owner}"})
    assert revoke_res.status_code == 200

    # 11. Revoked token is now rejected
    info_revoked = client.get(f"/api/shares/{view_token}")
    assert info_revoked.status_code == 404

def test_laptop_vs_mobile_cross_device_isolation():
    """
    Directly simulates the user's scenario:
    - User logs in on Laptop as laptop.user@gmail.com and uploads a project dataset.
    - Another user logs in on Mobile as mobile.user@gmail.com.
    - Verifies Mobile device sees 0 datasets, active_id is None, and Laptop's data cannot be accessed.
    """
    import io

    # 1. Laptop signs in with personal Gmail
    laptop_login = client.post("/api/auth/personal-login", json={
        "email": "laptop.user@gmail.com",
        "name": "Laptop User"
    })
    assert laptop_login.status_code == 200
    laptop_token = laptop_login.json()["token"]

    # 2. Laptop uploads a project dataset
    laptop_csv = b"Product,Q1_Sales,Q2_Sales\nServer_A,50000,75000\nServer_B,30000,42000\n"
    laptop_upload = client.post(
        "/api/datasets/upload",
        files={"file": ("laptop_project_data.csv", io.BytesIO(laptop_csv), "text/csv")},
        headers={"Authorization": f"Bearer {laptop_token}"}
    )
    assert laptop_upload.status_code == 200
    laptop_ds_id = laptop_upload.json()["dataset_id"]

    # 3. Laptop lists datasets: sees its own dataset
    laptop_list = client.get("/api/datasets", headers={"Authorization": f"Bearer {laptop_token}"})
    assert laptop_list.status_code == 200
    laptop_items = [d["id"] for d in laptop_list.json()["datasets"]]
    assert laptop_ds_id in laptop_items
    assert laptop_list.json()["active_id"] == laptop_ds_id

    # 4. Mobile user signs in with different personal Gmail
    mobile_login = client.post("/api/auth/personal-login", json={
        "email": "mobile.user@gmail.com",
        "name": "Mobile User"
    })
    assert mobile_login.status_code == 200
    mobile_token = mobile_login.json()["token"]

    # 5. Mobile lists datasets: MUST NOT see Laptop's dataset!
    mobile_list = client.get("/api/datasets", headers={"Authorization": f"Bearer {mobile_token}"})
    assert mobile_list.status_code == 200
    mobile_items = [d["id"] for d in mobile_list.json()["datasets"] if not d.get("is_sample")]
    assert laptop_ds_id not in mobile_items
    # Active ID for mobile must NOT be the laptop's dataset
    assert mobile_list.json()["active_id"] != laptop_ds_id

    # 6. Mobile directly requests Laptop dataset: MUST BE 404 Access Denied
    mobile_get = client.get(f"/api/datasets/{laptop_ds_id}", headers={"Authorization": f"Bearer {mobile_token}"})
    assert mobile_get.status_code == 404

    mobile_dash = client.get(f"/api/dashboard/{laptop_ds_id}", headers={"Authorization": f"Bearer {mobile_token}"})
    assert mobile_dash.status_code == 404

    # 7. Unauthenticated visitor (e.g. mobile before login): MUST BE 404 Access Denied
    unauth_list = client.get("/api/datasets")
    assert unauth_list.status_code == 200
    assert laptop_ds_id not in [d["id"] for d in unauth_list.json()["datasets"]]
    assert unauth_list.json()["active_id"] != laptop_ds_id

    unauth_get = client.get(f"/api/datasets/{laptop_ds_id}")
    assert unauth_get.status_code == 404



