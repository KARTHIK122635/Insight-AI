import math
import numpy as np
import pandas as pd
from typing import Any

def sanitize_for_json(obj: Any) -> Any:
    """
    Recursively sanitize objects so they are 100% JSON compliant.
    Replaces float('nan'), float('inf'), -float('inf'), and pandas NA with None.
    """
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, (int, str, bool)) or obj is None:
        return obj
    elif isinstance(obj, dict):
        return {str(k): sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple, set)):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, np.generic):
        item = obj.item()
        if isinstance(item, float) and (math.isnan(item) or math.isinf(item)):
            return None
        return item
    elif pd.isna(obj):
        return None
    elif hasattr(obj, "to_dict"):
        try:
            return sanitize_for_json(obj.to_dict())
        except Exception:
            return str(obj)
    return str(obj)
