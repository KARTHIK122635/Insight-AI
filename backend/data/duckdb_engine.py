import re
import time
import threading
import duckdb
import pandas as pd
from typing import Dict, Any, List, Optional

class DuckDBEngine:
    """Thread-safe DuckDB in-memory analytical engine."""
    
    def __init__(self):
        self.lock = threading.Lock()
        self.conn = duckdb.connect(database=":memory:", read_only=False)
        self.registered_tables: Dict[str, pd.DataFrame] = {}

    def register_dataframe(self, table_name: str, df: pd.DataFrame):
        """Register or replace an in-memory DataFrame as a queryable DuckDB view/table."""
        clean_name = re.sub(r"[^\w]", "_", table_name).lower()
        with self.lock:
            existing = self.registered_tables.get(clean_name)
            if existing is not None and existing is df:
                return

            if existing is not None and not existing.empty and len(existing.columns) == len(df.columns):
                try:
                    if existing.equals(df):
                        self.registered_tables[clean_name] = df
                        return
                except Exception:
                    pass

            if existing is not None:
                try:
                    self.conn.unregister(clean_name)
                except Exception:
                    pass
            self.registered_tables[clean_name] = df
            self.conn.register(clean_name, df)
            # Also always register as 'dataset' for simple default queries
            self.conn.register("dataset", df)

    def validate_sql(self, sql: str) -> str:
        """Sanitize and validate analytical SQL to ensure read-only safety and prevent SQL injection/filesystem access."""
        cleaned_sql = sql.strip().rstrip(";")
        
        # Check for multiple statements separated by semicolon
        if ";" in cleaned_sql:
            raise ValueError("Security restriction: Multiple SQL statements are not permitted. Semicolons cannot be chained.")
            
        disallowed = [
            r"\bDROP\b", r"\bDELETE\b", r"\bINSERT\b", r"\bUPDATE\b",
            r"\bCREATE\b", r"\bALTER\b", r"\bATTACH\b", r"\bDETACH\b",
            r"\bCOPY\b", r"\bEXPORT\b", r"\bIMPORT\b", r"\bEXECUTE\b",
            r"\bPRAGMA\b", r"\bINSTALL\b", r"\bLOAD\b", r"\bCHECKPOINT\b",
            r"\bCALL\b", r"\bSET\b", r"\bRESET\b",
            r"\bread_csv\b", r"\bread_parquet\b", r"\bread_json\b",
            r"\bscan_parquet\b", r"\bparquet_scan\b", r"\bduckdb_settings\b",
            r"\bduckdb_secrets\b"
        ]
        for pattern in disallowed:
            if re.search(pattern, cleaned_sql, re.IGNORECASE):
                raise ValueError(f"Security restriction: Keyword or function not permitted ({pattern}). Only SELECT analytical queries are permitted.")
        return cleaned_sql

    def query(self, sql: str, limit: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute an analytical SQL query against registered datasets.
        Returns:
            columns: list of column names
            rows: list of row dicts
            row_count: int
            duration_ms: float
        """
        clean_sql = self.validate_sql(sql)
        if limit and "LIMIT" not in clean_sql.upper():
            clean_sql = f"{clean_sql} LIMIT {limit}"

        start_time = time.perf_counter()
        try:
            with self.lock:
                rel = self.conn.sql(clean_sql)
                if rel is None:
                    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    return {
                        "columns": [],
                        "rows": [],
                        "row_count": 0,
                        "duration_ms": duration_ms,
                        "sql": clean_sql
                    }
                df_result = rel.df()

            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Convert timestamp/datetime to string for JSON serialization
            for col in df_result.columns:
                if pd.api.types.is_datetime64_any_dtype(df_result[col]):
                    df_result[col] = df_result[col].dt.strftime("%Y-%m-%d %H:%M:%S")
                elif pd.api.types.is_numeric_dtype(df_result[col]):
                    # Replace NaN with None
                    df_result[col] = df_result[col].where(pd.notnull(df_result[col]), None)

            records = df_result.to_dict(orient="records")
            columns = list(df_result.columns)

            return {
                "columns": columns,
                "rows": records,
                "row_count": len(records),
                "duration_ms": duration_ms,
                "sql": clean_sql
            }
        except Exception as e:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            raise RuntimeError(f"DuckDB Execution Error: {str(e)} in SQL: [{clean_sql}]")

    def execute(self, sql: str) -> List[Dict[str, Any]]:
        """Direct execution for internal engine operations."""
        with self.lock:
            rel = self.conn.sql(sql)
            if rel is not None:
                return rel.df().to_dict(orient="records")
            return []

    def get_table_schema(self, table_name: str = "dataset") -> List[Dict[str, str]]:
        """Get column names and DuckDB types."""
        try:
            res = self.conn.sql(f"DESCRIBE {table_name}").df()
            return res.to_dict(orient="records")
        except Exception:
            return []

# Singleton instance
duckdb_engine = DuckDBEngine()
