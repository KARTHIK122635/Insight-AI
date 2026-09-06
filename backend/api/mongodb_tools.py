import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query
from backend.data.mongo_manager import mongo_manager
from backend.data.store import dataset_store

logger = logging.getLogger("insight_ai.api.mongodb")
router = APIRouter(prefix="/api/mongodb", tags=["MongoDB Integration"])

class MongoConnectRequest(BaseModel):
    uri: str
    database: Optional[str] = "insight_ai"

class MongoImportRequest(BaseModel):
    collection_name: str
    dataset_name: Optional[str] = None
    limit: Optional[int] = 5000

class MongoExportRequest(BaseModel):
    dataset_id: Optional[str] = None
    collection_name: str

@router.get("/status")
def get_mongodb_status():
    """Return MongoDB connection state, database name, and collection telemetry."""
    return mongo_manager.get_status()

@router.post("/connect")
def connect_mongodb(req: MongoConnectRequest):
    """Dynamically connect to a MongoDB Atlas cluster or local database instance."""
    if not req.uri or not req.uri.strip():
        raise HTTPException(status_code=400, detail="MongoDB URI cannot be empty.")
    
    res = mongo_manager.connect(req.uri.strip(), req.database or "insight_ai")
    if not res["success"]:
        return {
            "status": "standby",
            "message": res["message"],
            "error": res.get("error"),
            "database": req.database
        }
    return {
        "status": "connected",
        "message": res["message"],
        "database": req.database,
        "uri": mongo_manager.mask_uri(req.uri)
    }

@router.get("/collections")
def list_mongodb_collections():
    """List available collections in the active MongoDB database."""
    status = mongo_manager.get_status()
    return {
        "connected": status["connected"],
        "database": status["database"],
        "collections": status["collections"]
    }

@router.post("/import")
def import_from_mongodb(req: MongoImportRequest):
    """Import documents from a MongoDB collection directly into DuckDB analytical pipeline."""
    if not req.collection_name:
        raise HTTPException(status_code=400, detail="Collection name is required.")
    
    try:
        df = mongo_manager.import_collection_as_dataframe(req.collection_name, limit=req.limit or 5000)
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No documents found in collection '{req.collection_name}'.")
        
        name = req.dataset_name or f"Mongo_{req.collection_name}"
        col_mapping = {c: c for c in df.columns}
        dataset_id = dataset_store.add_dataset(name, df, col_mapping)

        return {
            "success": True,
            "dataset_id": dataset_id,
            "dataset_name": name,
            "rows_imported": len(df),
            "columns_count": len(df.columns),
            "columns": list(df.columns),
            "message": f"Successfully imported {len(df)} documents from MongoDB collection '{req.collection_name}' into DuckDB."
        }
    except Exception as e:
        logger.error(f"MongoDB import failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export")
def export_to_mongodb(req: MongoExportRequest):
    """Export active DuckDB dataset into a MongoDB collection."""
    d_id = req.dataset_id or dataset_store.active_dataset_id
    if not d_id:
        raise HTTPException(status_code=400, detail="No active dataset selected for export.")
    
    ds = dataset_store.get_dataset(d_id)
    if not ds or "df" not in ds:
        raise HTTPException(status_code=404, detail=f"Dataset {d_id} not found in store.")
    
    try:
        exported_count = mongo_manager.export_dataframe_to_collection(ds["df"], req.collection_name)
        return {
            "success": True,
            "collection_name": req.collection_name,
            "documents_exported": exported_count,
            "message": f"Exported {exported_count} rows from dataset '{ds['name']}' to MongoDB collection '{req.collection_name}'."
        }
    except Exception as e:
        logger.error(f"MongoDB export failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
