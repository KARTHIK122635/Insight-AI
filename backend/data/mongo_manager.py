import os
import re
import logging
import datetime
from typing import Dict, Any, List, Optional
import pandas as pd

logger = logging.getLogger("insight_ai.mongodb")


def utc_now_iso() -> str:
    """Return a UTC ISO-8601 timestamp with a trailing Z for JSON-safe serialization."""
    return datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


class MongoManager:
    """Enterprise MongoDB Connection and Document Persistence Manager."""
    def __init__(self):
        self.connected: bool = False
        self.client: Any = None
        self.db: Any = None
        self.uri: Optional[str] = None
        self.db_name: str = "insight_ai"
        
        # In-memory document fallback store when offline/standby
        self.fallback_store: Dict[str, List[Dict[str, Any]]] = {
            "insight_datasets": [],
            "insight_documents": [],
            "insight_chats": [],
            "insight_custom_charts": [],
            "insight_scenarios": []
        }

        # Initialize from environment variable if configured
        env_uri = os.getenv("MONGODB_URI")
        env_db = os.getenv("MONGODB_DATABASE", "insight_ai")
        if env_uri:
            self.connect(env_uri, env_db)

    def mask_uri(self, uri: Optional[str]) -> str:
        if not uri:
            return "Not Configured"
        # Mask password in URI
        return re.sub(r":([^/@]+)@", ":****@", uri)

    def connect(self, uri: str, db_name: str = "insight_ai") -> Dict[str, Any]:
        """Connect to a MongoDB instance or Atlas cluster."""
        try:
            from pymongo import MongoClient
            # Set short timeout so connection attempts don't block
            client = MongoClient(uri, serverSelectionTimeoutMS=2500)
            # Verify connectivity with ping command
            client.admin.command("ping")
            
            self.client = client
            self.uri = uri
            self.db_name = db_name
            self.db = client[db_name]
            self.connected = True
            
            logger.info(f"Connected successfully to MongoDB database '{db_name}' at {self.mask_uri(uri)}")
            return {
                "success": True,
                "mode": "LIVE_MONGODB",
                "database": db_name,
                "uri": self.mask_uri(uri),
                "message": f"Connected to MongoDB database '{db_name}' successfully."
            }
        except Exception as e:
            logger.warning(f"MongoDB connection failed to '{self.mask_uri(uri)}': {e}. Operating in Standby Mode.")
            self.connected = False
            self.client = None
            self.db = None
            return {
                "success": False,
                "mode": "STANDBY_MEMORY",
                "database": db_name,
                "error": str(e),
                "message": "Could not connect to MongoDB server. Standby persistence mode active."
            }

    def get_status(self) -> Dict[str, Any]:
        """Return live connection state and collections status."""
        colls = []
        if self.connected and self.db is not None:
            try:
                colls = self.db.list_collection_names()
            except Exception:
                colls = []
        else:
            colls = list(self.fallback_store.keys())

        return {
            "connected": self.connected,
            "mode": "LIVE_MONGODB" if self.connected else "STANDBY_MEMORY",
            "database": self.db_name,
            "uri": self.mask_uri(self.uri),
            "collections_count": len(colls),
            "collections": colls
        }

    def save_dataset(self, dataset_id: str, name: str, meta: Dict[str, Any], df: Optional[pd.DataFrame] = None) -> bool:
        """Persist dataset metadata and record documents into MongoDB."""
        now = utc_now_iso()
        doc_meta = {
            "dataset_id": dataset_id,
            "name": name,
            "meta": meta,
            "rows_count": len(df) if df is not None else meta.get("rows_count", 0),
            "columns_count": len(df.columns) if df is not None else meta.get("columns_count", 0),
            "updated_at": now
        }

        if self.connected and self.db is not None:
            try:
                self.db["insight_datasets"].update_one(
                    {"dataset_id": dataset_id},
                    {"$set": doc_meta},
                    upsert=True
                )
                if df is not None:
                    # Store records in chunks
                    records = df.head(5000).to_dict(orient="records")
                    self.db["insight_documents"].delete_many({"dataset_id": dataset_id})
                    for r in records:
                        r["dataset_id"] = dataset_id
                    if records:
                        self.db["insight_documents"].insert_many(records)
                return True
            except Exception as e:
                logger.error(f"Failed to persist dataset to MongoDB: {e}")
        
        # Fallback in-memory persistence
        self.fallback_store["insight_datasets"] = [
            d for d in self.fallback_store["insight_datasets"] if d.get("dataset_id") != dataset_id
        ]
        self.fallback_store["insight_datasets"].append(doc_meta)
        return True

    def list_saved_datasets(self) -> List[Dict[str, Any]]:
        """Retrieve list of saved dataset metadata from MongoDB."""
        if self.connected and self.db is not None:
            try:
                cursor = self.db["insight_datasets"].find({}, {"_id": 0})
                return list(cursor)
            except Exception as e:
                logger.error(f"Error fetching datasets from MongoDB: {e}")
        return self.fallback_store.get("insight_datasets", [])

    def delete_dataset(self, dataset_id: str) -> bool:
        """Remove dataset metadata and records from MongoDB."""
        if self.connected and self.db is not None:
            try:
                self.db["insight_datasets"].delete_one({"dataset_id": dataset_id})
                self.db["insight_documents"].delete_many({"dataset_id": dataset_id})
                self.db["insight_chats"].delete_many({"dataset_id": dataset_id})
                self.db["insight_custom_charts"].delete_many({"dataset_id": dataset_id})
                self.db["insight_scenarios"].delete_many({"dataset_id": dataset_id})
                return True
            except Exception as e:
                logger.error(f"Error deleting dataset from MongoDB: {e}")
        
        # Fallback deletion
        self.fallback_store["insight_datasets"] = [
            d for d in self.fallback_store["insight_datasets"] if d.get("dataset_id") != dataset_id
        ]
        return True

    def save_chat_message(self, dataset_id: str, role: str, text: str, sql: Optional[str] = None) -> bool:
        """Persist AI Analyst interaction."""
        entry = {
            "dataset_id": dataset_id,
            "role": role,
            "text": text,
            "sql": sql,
            "timestamp": utc_now_iso()
        }
        if self.connected and self.db is not None:
            try:
                self.db["insight_chats"].insert_one(entry)
                return True
            except Exception as e:
                logger.error(f"Error saving chat to MongoDB: {e}")
        
        self.fallback_store["insight_chats"].append(entry)
        return True

    def get_chat_history(self, dataset_id: str) -> List[Dict[str, Any]]:
        """Fetch chat history for a dataset."""
        if self.connected and self.db is not None:
            try:
                cursor = self.db["insight_chats"].find({"dataset_id": dataset_id}, {"_id": 0}).sort("timestamp", 1)
                return list(cursor)
            except Exception as e:
                logger.error(f"Error reading chat history from MongoDB: {e}")
        
        return [c for c in self.fallback_store["insight_chats"] if c.get("dataset_id") == dataset_id]

    def save_custom_chart(self, dataset_id: str, chart: Dict[str, Any]) -> bool:
        """Persist user custom chart configuration."""
        chart_doc = {
            "dataset_id": dataset_id,
            "title": chart.get("title", "Custom Chart"),
            "options": chart.get("options", {}),
            "created_at": utc_now_iso()
        }
        if self.connected and self.db is not None:
            try:
                self.db["insight_custom_charts"].insert_one(chart_doc)
                return True
            except Exception as e:
                logger.error(f"Error saving custom chart to MongoDB: {e}")
        
        self.fallback_store["insight_custom_charts"].append(chart_doc)
        return True

    def get_custom_charts(self, dataset_id: str) -> List[Dict[str, Any]]:
        """Retrieve custom charts for a dataset."""
        if self.connected and self.db is not None:
            try:
                cursor = self.db["insight_custom_charts"].find({"dataset_id": dataset_id}, {"_id": 0})
                return list(cursor)
            except Exception as e:
                logger.error(f"Error fetching custom charts from MongoDB: {e}")
        
        return [c for c in self.fallback_store["insight_custom_charts"] if c.get("dataset_id") == dataset_id]

    def save_scenario(self, dataset_id: str, params: Dict[str, Any], impact: Dict[str, Any], simulated: Dict[str, Any]) -> bool:
        """Persist What-If simulation run."""
        doc = {
            "dataset_id": dataset_id,
            "params": params,
            "impact": impact,
            "simulated": simulated,
            "created_at": utc_now_iso()
        }
        if self.connected and self.db is not None:
            try:
                self.db["insight_scenarios"].insert_one(doc)
                return True
            except Exception as e:
                logger.error(f"Error saving scenario to MongoDB: {e}")
        
        self.fallback_store["insight_scenarios"].append(doc)
        return True

    def import_collection_as_dataframe(self, collection_name: str, limit: int = 5000) -> pd.DataFrame:
        """Import documents from any MongoDB collection and flatten into a tabular DataFrame."""
        if not self.connected or self.db is None:
            # Check fallback
            if collection_name in self.fallback_store:
                docs = self.fallback_store[collection_name][:limit]
                if docs:
                    df = pd.json_normalize(docs)
                    if "_id" in df.columns:
                        df["_id"] = df["_id"].astype(str)
                    return df
            # Return sample document dataframe if testing
            sample_docs = [
                {"account_id": "ACC_1001", "customer_tier": "Enterprise", "portfolio_value": 450000, "status": "Active", "region": "North America"},
                {"account_id": "ACC_1002", "customer_tier": "Standard", "portfolio_value": 125000, "status": "Active", "region": "Europe"},
                {"account_id": "ACC_1003", "customer_tier": "Enterprise", "portfolio_value": 980000, "status": "Review", "region": "Asia Pacific"},
                {"account_id": "ACC_1004", "customer_tier": "Premium", "portfolio_value": 340000, "status": "Active", "region": "North America"},
                {"account_id": "ACC_1005", "customer_tier": "Standard", "portfolio_value": 85000, "status": "Dormant", "region": "Latin America"},
            ]
            return pd.DataFrame(sample_docs)

        try:
            coll = self.db[collection_name]
            cursor = coll.find().limit(limit)
            docs = list(cursor)
            if not docs:
                return pd.DataFrame()
            
            df = pd.json_normalize(docs)
            if "_id" in df.columns:
                df["_id"] = df["_id"].astype(str)
            return df
        except Exception as e:
            logger.error(f"Error importing collection '{collection_name}' from MongoDB: {e}")
            raise RuntimeError(f"Failed to import collection '{collection_name}': {str(e)}")

    def export_dataframe_to_collection(self, df: pd.DataFrame, collection_name: str) -> int:
        """Export a pandas DataFrame as documents into a MongoDB collection."""
        records = df.to_dict(orient="records")
        # Ensure timestamps/dates are converted to strings or ISO
        for r in records:
            for k, v in list(r.items()):
                if isinstance(v, (datetime.date, datetime.datetime)):
                    r[k] = v.isoformat()
                elif pd.isna(v):
                    r[k] = None

        if self.connected and self.db is not None:
            try:
                coll = self.db[collection_name]
                if records:
                    res = coll.insert_many(records)
                    return len(res.inserted_ids)
                return 0
            except Exception as e:
                logger.error(f"Error exporting to collection '{collection_name}' in MongoDB: {e}")
                raise RuntimeError(f"Failed to export to collection '{collection_name}': {str(e)}")
        
        # Save to fallback
        self.fallback_store[collection_name] = records
        return len(records)

mongo_manager = MongoManager()
