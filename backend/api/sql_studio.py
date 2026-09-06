from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.data.duckdb_engine import duckdb_engine

router = APIRouter(prefix="/api/sql", tags=["sql"])

class SQLQueryRequest(BaseModel):
    sql: str
    limit: int = 100

@router.post("/execute")
def execute_sql(req: SQLQueryRequest):
    try:
        res = duckdb_engine.query(req.sql, limit=req.limit)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/schema")
def get_schema():
    return {"schema": duckdb_engine.get_table_schema("dataset")}
