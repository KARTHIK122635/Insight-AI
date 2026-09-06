import os
import uuid
import datetime
import pandas as pd
from typing import Dict, Any, Optional, List
from backend.data.loader import DataLoader
from backend.analytics.profiler import DataProfiler
from backend.analytics.quality import DataQualityEngine
from backend.data.duckdb_engine import duckdb_engine
from backend.data.sanitizer import sanitize_for_json

class DatasetStore:
    """Multi-user partitioned in-memory and file-backed dataset registry."""
    def __init__(self):
        self.datasets: Dict[str, Dict[str, Any]] = {}
        self.active_dataset_id: Optional[str] = None
        self.user_active_datasets: Dict[str, str] = {}

    def get_active_dataset_id(self, owner_email: Optional[str] = None) -> Optional[str]:
        """Resolve active dataset ID scoped strictly to a specific user session."""
        if owner_email and owner_email in self.user_active_datasets:
            target = self.user_active_datasets[owner_email]
            if target in self.datasets:
                target_ds = self.datasets[target]
                if target_ds.get("is_sample") or target_ds.get("owner_email") == owner_email:
                    return target

        # Find first owned dataset for this user
        if owner_email:
            for k, v in self.datasets.items():
                if v.get("owner_email") == owner_email:
                    return k

            # Check if there is an active shared dataset accessed by this user
            try:
                from backend.data.share_manager import share_manager
                for share in share_manager.shares.values():
                    if share.get("is_active", True) and owner_email in share.get("accessed_by", []):
                        d_id = share.get("dataset_id")
                        if d_id and d_id in self.datasets:
                            return d_id
            except Exception:
                pass

        # Fallback only to public sample templates
        for k, v in self.datasets.items():
            if v.get("is_sample"):
                return k

        # Never return another user's private dataset under any circumstance
        return None

    def add_dataset(
        self,
        name: str,
        df: pd.DataFrame,
        col_mapping: Dict[str, str],
        dataset_id: Optional[str] = None,
        owner_email: Optional[str] = None,
        is_sample: bool = False
    ) -> str:
        d_id = dataset_id or f"ds_{uuid.uuid4().hex[:8]}"
        
        # Profile dataset
        profile_res = DataProfiler.profile_dataset(df, col_mapping)
        quality_res = DataQualityEngine.audit_quality(df, profile_res["columns"])
        
        # Register into DuckDB
        duckdb_engine.register_dataframe(f"data_{d_id}", df)
        duckdb_engine.register_dataframe("dataset", df)

        created_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

        self.datasets[d_id] = {
            "id": d_id,
            "name": name,
            "df": df,
            "col_mapping": col_mapping,
            "summary": sanitize_for_json(profile_res["summary"]),
            "columns": sanitize_for_json(profile_res["columns"]),
            "quality": sanitize_for_json(quality_res),
            "created_at": created_time,
            "owner_email": owner_email,
            "is_sample": is_sample
        }

        if owner_email:
            self.user_active_datasets[owner_email] = d_id
        self.active_dataset_id = d_id

        try:
            from backend.data.mongo_manager import mongo_manager
            mongo_manager.save_dataset(d_id, name, self.datasets[d_id], df)
        except Exception:
            pass
        return d_id

    def update_dataset(
        self,
        d_id: str,
        new_df: pd.DataFrame,
        owner_email: Optional[str] = None,
        share_token: Optional[str] = None
    ):
        """Update an existing dataset with cleaned/transformed dataframe and re-profile."""
        if d_id not in self.datasets:
            raise KeyError(f"Dataset {d_id} does not exist in store")
        
        ds = self.datasets[d_id]
        ds_owner = ds.get("owner_email")
        is_owner = ds.get("is_sample", False) or (not ds_owner) or (owner_email and ds_owner == owner_email)

        if not is_owner:
            if share_token:
                from backend.data.share_manager import share_manager
                share = share_manager.get_share(share_token)
                if not share or share.get("dataset_id") != d_id:
                    raise PermissionError("Access denied: Invalid share link for modifying this dataset.")
                if share.get("permission") != "editor":
                    raise PermissionError("Access denied: Read-only ('view') access. Only users with 'editor' permissions can clean or modify this dataset.")
            else:
                raise PermissionError("Access denied: You do not have permission to modify this dataset.")

        name = ds["name"]
        col_mapping = {c: c for c in new_df.columns}
        profile_res = DataProfiler.profile_dataset(new_df, col_mapping)
        quality_res = DataQualityEngine.audit_quality(new_df, profile_res["columns"])

        duckdb_engine.register_dataframe(f"data_{d_id}", new_df)
        duckdb_engine.register_dataframe("dataset", new_df)

        ds.update({
            "df": new_df,
            "col_mapping": col_mapping,
            "summary": sanitize_for_json(profile_res["summary"]),
            "columns": sanitize_for_json(profile_res["columns"]),
            "quality": sanitize_for_json(quality_res)
        })
        return ds

    def get_dataset(
        self,
        d_id: Optional[str] = None,
        owner_email: Optional[str] = None,
        share_token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Retrieve dataset enforcing user isolation and share permissions."""
        target_id = d_id or self.get_active_dataset_id(owner_email)
        if not target_id:
            return None

        ds = self.datasets.get(target_id)
        if not ds:
            return None

        user_permission = "owner"

        # Check share link access if provided
        has_share_access = False
        if share_token:
            from backend.data.share_manager import share_manager
            share = share_manager.get_share(share_token)
            if share and share.get("dataset_id") == target_id and share.get("is_active", True):
                has_share_access = True
                user_permission = share.get("permission", "view")

        # Data Isolation Check: non-sample private datasets require matching owner or valid share link
        if not ds.get("is_sample", False):
            if not has_share_access:
                if ds.get("owner_email"):
                    if not owner_email or ds.get("owner_email") != owner_email:
                        return None
                else:
                    if owner_email:
                        return None

        if "df" in ds:
            current_dataset = duckdb_engine.registered_tables.get("dataset")
            current_table = duckdb_engine.registered_tables.get(f"data_{target_id}")
            if current_dataset is not ds["df"]:
                duckdb_engine.register_dataframe("dataset", ds["df"])
            if current_table is not ds["df"]:
                duckdb_engine.register_dataframe(f"data_{target_id}", ds["df"])

        ds["user_permission"] = user_permission
        return ds

    def delete_dataset(self, d_id: str, owner_email: Optional[str] = None) -> bool:
        """Delete dataset with ownership authorization."""
        if d_id in self.datasets:
            ds = self.datasets[d_id]
            if not ds.get("is_sample", False) and ds.get("owner_email"):
                if not owner_email or ds.get("owner_email") != owner_email:
                    return False

            del self.datasets[d_id]
            try:
                from backend.data.mongo_manager import mongo_manager
                mongo_manager.delete_dataset(d_id)
            except Exception:
                pass
            try:
                duckdb_engine.execute(f"DROP VIEW IF EXISTS data_{d_id}")
            except Exception:
                pass

            if owner_email and self.user_active_datasets.get(owner_email) == d_id:
                del self.user_active_datasets[owner_email]

            if self.active_dataset_id == d_id:
                self.active_dataset_id = next((k for k, v in self.datasets.items() if v.get("is_sample")), None)
                if self.active_dataset_id:
                    self.get_dataset(self.active_dataset_id)
                else:
                    try:
                        duckdb_engine.execute("DROP VIEW IF EXISTS dataset")
                    except Exception:
                        pass
            return True
        return False

    def clear_owner_datasets(self, owner_email: str) -> int:
        """Delete all datasets owned by a temporary anonymous browser session."""
        dataset_ids = [
            d_id for d_id, dataset in self.datasets.items()
            if not dataset.get("is_sample", False) and dataset.get("owner_email") == owner_email
        ]
        for dataset_id in dataset_ids:
            self.delete_dataset(dataset_id, owner_email=owner_email)
        return len(dataset_ids)

    def list_datasets(self, owner_email: Optional[str] = None) -> list:
        """Return dataset metadata partitioned by user ownership, including datasets shared with user."""
        results = []
        seen_ids = set()

        for k, v in self.datasets.items():
            # If user is authenticated, show their owned datasets + sample templates
            if owner_email:
                if v.get("owner_email") == owner_email or v.get("is_sample", False):
                    meta = self._format_meta(k, v, owner_email)
                    meta["user_permission"] = "owner" if v.get("owner_email") == owner_email else "viewer"
                    results.append(meta)
                    seen_ids.add(k)
            else:
                # If unauthenticated, only show sample templates (never private user data)
                if v.get("is_sample", False):
                    meta = self._format_meta(k, v, None)
                    meta["user_permission"] = "viewer"
                    results.append(meta)
                    seen_ids.add(k)

        # Include any datasets that have been shared with this user
        if owner_email:
            try:
                from backend.data.share_manager import share_manager
                for share in list(share_manager.shares.values()):
                    target_id = share.get("dataset_id")
                    if (
                        target_id
                        and target_id not in seen_ids
                        and target_id in self.datasets
                        and share.get("is_active", True)
                        and owner_email in share.get("accessed_by", [])
                    ):
                        v = self.datasets[target_id]
                        meta = self._format_meta(target_id, v, owner_email)
                        meta["is_shared"] = True
                        meta["user_permission"] = share.get("permission", "view")
                        meta["shared_by"] = share.get("owner_email")
                        results.append(meta)
                        seen_ids.add(target_id)
            except Exception:
                pass

        return results

    def _format_meta(self, k: str, v: Dict[str, Any], user_email: Optional[str]) -> Dict[str, Any]:
        active_id = self.get_active_dataset_id(user_email)
        return {
            "id": k,
            "name": v["name"],
            "rows": v["summary"]["total_rows"],
            "columns": v["summary"]["total_columns"],
            "domain": v["summary"]["domain"],
            "measures": v["summary"].get("measures", [])[:3],
            "dimensions": v["summary"].get("dimensions", [])[:3],
            "quality_score": v["quality"]["score"],
            "quality_grade": v["quality"]["grade"],
            "created_at": v.get("created_at", "Recently added"),
            "owner_email": v.get("owner_email"),
            "is_sample": v.get("is_sample", False),
            "is_active": k == active_id,
            "user_permission": "owner" if (user_email and v.get("owner_email") == user_email) else "viewer"
        }

    def preload_samples(self, datasets_dir: str):
        """Preload sample datasets marked as public templates."""
        if not os.path.exists(datasets_dir):
            return
            
        ecom_path = os.path.join(datasets_dir, "ecommerce_sales.csv")
        if os.path.exists(ecom_path) and "ecommerce_01" not in self.datasets:
            try:
                df, mapping = DataLoader.load_from_file(ecom_path, "ecommerce_sales.csv")
                self.add_dataset("E-Commerce Superstore Sales", df, mapping, dataset_id="ecommerce_01", is_sample=True)
            except Exception as e:
                print("Failed to preload ecommerce sample:", e)

        saas_path = os.path.join(datasets_dir, "saas_metrics.csv")
        if os.path.exists(saas_path) and "saas_01" not in self.datasets:
            try:
                df, mapping = DataLoader.load_from_file(saas_path, "saas_metrics.csv")
                self.add_dataset("B2B SaaS Growth & Churn Metrics", df, mapping, dataset_id="saas_01", is_sample=True)
            except Exception as e:
                print("Failed to preload saas sample:", e)

    def purge_demo_datasets(self):
        """Purge legacy unowned or demo datasets from store and MongoDB collections."""
        to_delete = []
        for d_id, ds in list(self.datasets.items()):
            if ds.get("is_sample"):
                continue
            owner = ds.get("owner_email")
            if not owner or owner in ("alex.morgan@enterprise.google.com", "test@demo.com"):
                to_delete.append(d_id)

        for d_id in to_delete:
            if d_id in self.datasets:
                del self.datasets[d_id]
            try:
                duckdb_engine.execute(f"DROP VIEW IF EXISTS data_{d_id}")
            except Exception:
                pass

        # Also purge legacy demo documents from MongoDB collections on startup
        try:
            from backend.data.mongo_manager import mongo_manager
            if mongo_manager.connected and mongo_manager.db is not None:
                db = mongo_manager.db
                db["insight_datasets"].delete_many({
                    "$or": [
                        {"meta.owner_email": "alex.morgan@enterprise.google.com"},
                        {"meta.owner_email": None},
                        {"meta.owner_email": {"$exists": False}},
                        {"name": "sales_dataset.csv"}
                    ]
                })
                db["insight_users"].delete_many({
                    "email": "alex.morgan@enterprise.google.com"
                })
                db["insight_documents"].delete_many({
                    "$or": [
                        {"dataset_id": {"$in": to_delete}},
                        {"dataset_id": None}
                    ]
                })
        except Exception as e:
            print("Notice during legacy demo dataset purge:", e)

# Singleton store
dataset_store = DatasetStore()
