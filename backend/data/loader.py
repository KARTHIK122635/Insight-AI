import os
import io
import re
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, Optional

def sanitize_column_name(col: str) -> str:
    """Sanitize column name to be SQL-safe while readable."""
    col = str(col).strip()
    col = re.sub(r"[^\w\s]", "_", col)
    col = re.sub(r"\s+", "_", col)
    col = re.sub(r"_+", "_", col)
    col = col.strip("_").lower()
    if not col or col[0].isdigit():
        col = f"col_{col}"
    return col

class DataLoader:
    @staticmethod
    def load_from_file(file_path_or_buffer, filename: str) -> Tuple[pd.DataFrame, Dict[str, str]]:
        """
        Load dataframe from file path or file-like buffer.
        Returns:
            df: Cleaned Pandas DataFrame
            col_mapping: Mapping from sanitized SQL column names to original display names
        """
        ext = os.path.splitext(filename)[1].lower()
        
        if ext in [".csv", ".tsv", ".txt"]:
            # Auto-detect delimiter and encoding
            if isinstance(file_path_or_buffer, (str, bytes, os.PathLike)):
                with open(file_path_or_buffer, "rb") as f:
                    sample = f.read(4096)
            else:
                pos = file_path_or_buffer.tell()
                sample = file_path_or_buffer.read(4096)
                file_path_or_buffer.seek(pos)
                
            delimiter = ","
            try:
                text_sample = sample.decode("utf-8", errors="ignore")
                for sep in ["\t", ";", "|", ","]:
                    if sep in text_sample and text_sample.count(sep) > text_sample.count("\n"):
                        delimiter = sep
                        break
            except Exception:
                delimiter = ","
                
            try:
                df = pd.read_csv(file_path_or_buffer, sep=delimiter, encoding="utf-8")
            except UnicodeDecodeError:
                if hasattr(file_path_or_buffer, "seek"):
                    file_path_or_buffer.seek(0)
                df = pd.read_csv(file_path_or_buffer, sep=delimiter, encoding="latin1")

        elif ext in [".xlsx", ".xls"]:
            df = pd.read_excel(file_path_or_buffer)
        elif ext == ".parquet":
            df = pd.read_parquet(file_path_or_buffer)
        elif ext in [".json", ".jsonl"]:
            try:
                df = pd.read_json(file_path_or_buffer)
            except Exception:
                if hasattr(file_path_or_buffer, "seek"):
                    file_path_or_buffer.seek(0)
                df = pd.read_json(file_path_or_buffer, lines=True)
        elif ext in [".sqlite", ".db"]:
            import sqlite3
            import tempfile
            if isinstance(file_path_or_buffer, (str, bytes, os.PathLike)):
                conn = sqlite3.connect(file_path_or_buffer)
            else:
                pos = file_path_or_buffer.tell()
                content = file_path_or_buffer.read()
                file_path_or_buffer.seek(pos)
                with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                    tmp.write(content)
                    tmp_path = tmp.name
                conn = sqlite3.connect(tmp_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
            tables = [r[0] for r in cursor.fetchall()]
            if not tables:
                conn.close()
                raise ValueError("No user tables found in SQLite database.")
            best_table = tables[0]
            max_r = -1
            for t in tables:
                try:
                    cursor.execute(f'SELECT COUNT(*) FROM "{t}"')
                    cnt = cursor.fetchone()[0]
                    if cnt > max_r:
                        max_r = cnt
                        best_table = t
                except Exception:
                    pass
            df = pd.read_sql_query(f'SELECT * FROM "{best_table}"', conn)
            conn.close()
        else:
            raise ValueError(f"Unsupported file format: '{ext}'. Allowed formats: CSV, TSV, TXT, Excel (.xlsx/.xls), Parquet, JSON, SQLite (.db/.sqlite).")

        # Clean column names
        original_cols = list(df.columns)
        sanitized_cols = []
        seen = set()
        for col in original_cols:
            clean = sanitize_column_name(col)
            # Ensure uniqueness
            unique_clean = clean
            idx = 1
            while unique_clean in seen:
                unique_clean = f"{clean}_{idx}"
                idx += 1
            seen.add(unique_clean)
            sanitized_cols.append(unique_clean)

        col_mapping = dict(zip(sanitized_cols, original_cols))
        df.columns = sanitized_cols

        # Attempt date parsing on object columns that match date patterns
        for col in df.columns:
            if df[col].dtype == object or pd.api.types.is_string_dtype(df[col]):
                sample_vals = df[col].dropna().head(20).astype(str).tolist()
                if sample_vals:
                    date_match_count = sum(
                        1 for v in sample_vals 
                        if re.match(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}", v) or 
                           re.match(r"^\d{1,2}[-/]\d{1,2}[-/]\d{4}", v) or
                           re.match(r"^\d{4}-\d{2}$", v)
                    )
                    if date_match_count / len(sample_vals) > 0.7:
                        try:
                            df[col] = pd.to_datetime(df[col], errors="coerce")
                        except Exception:
                            pass

        return df, col_mapping
