import re
import pandas as pd
import numpy as np
from typing import Dict, Any, List

class SemanticClassifier:
    TEMPORAL_KEYWORDS = ["date", "time", "year", "month", "day", "quarter", "week", "created_at", "updated_at", "timestamp", "period"]
    GEO_KEYWORDS = ["region", "country", "state", "city", "zip", "postal", "province", "latitude", "longitude", "address", "continent", "territory", "location"]
    ID_KEYWORDS = ["id", "uuid", "key", "code", "sku", "number", "num", "hash", "ssn", "guid"]
    MONETARY_KEYWORDS = ["sale", "sales", "revenue", "profit", "cost", "price", "amount", "income", "expense", "mrr", "arr", "spend", "budget", "salary", "gross", "net", "margin", "gmv", "arpu", "cac", "ltv", "fee", "charge", "bill", "invoice", "compensation", "premium", "deductible", "tuition", "payroll"]
    QUANTITATIVE_KEYWORDS = ["quantity", "qty", "count", "volume", "units", "visits", "clicks", "conversions", "score", "age", "rating", "weight", "duration", "hours", "size", "discount", "dosage", "tenure", "gpa", "downtime", "uptime", "yield", "temperature", "speed", "frequency", "headcount", "days", "length", "rate", "percent", "percentage", "churn", "index", "ratio", "factor"]
    
    @classmethod
    def classify_column(cls, col_name: str, series: pd.Series) -> Dict[str, Any]:
        """Classify physical type, logical type, and semantic category."""
        col_lower = col_name.lower()
        dtype = str(series.dtype)
        unique_count = series.nunique(dropna=True)
        total_count = len(series)
        cardinality_ratio = unique_count / max(1, total_count)
        
        # 1. Physical Type
        if pd.api.types.is_datetime64_any_dtype(series):
            physical_type = "datetime"
        elif pd.api.types.is_bool_dtype(series):
            physical_type = "boolean"
        elif pd.api.types.is_numeric_dtype(series):
            if pd.api.types.is_integer_dtype(series):
                physical_type = "integer"
            else:
                physical_type = "float"
        else:
            physical_type = "string"

        # 2. Semantic Type
        # Check temporal
        if physical_type == "datetime" or any(k in col_lower for k in cls.TEMPORAL_KEYWORDS):
            semantic_type = "temporal"
        # Check identifier
        elif (any(k == col_lower or col_lower.endswith(f"_{k}") or col_lower.startswith(f"{k}_") for k in cls.ID_KEYWORDS)
              and cardinality_ratio > 0.4):
            semantic_type = "identifier"
        # Check geography
        elif any(k in col_lower for k in cls.GEO_KEYWORDS):
            semantic_type = "geographical"
        # Check monetary
        elif any(k in col_lower for k in cls.MONETARY_KEYWORDS) and physical_type in ["integer", "float"]:
            semantic_type = "monetary_measure"
        # Check general quantitative
        elif physical_type in ["integer", "float"]:
            if any(k in col_lower for k in cls.QUANTITATIVE_KEYWORDS):
                semantic_type = "quantitative_measure"
            elif cardinality_ratio > 0.05 and unique_count > 10:
                semantic_type = "quantitative_measure"
            else:
                semantic_type = "categorical"
        # Default string/object
        else:
            semantic_type = "categorical"

        is_dimension = semantic_type in ["categorical", "geographical", "temporal", "identifier"]
        is_measure = semantic_type in ["monetary_measure", "quantitative_measure"]

        return {
            "name": col_name,
            "physical_type": physical_type,
            "semantic_type": semantic_type,
            "is_measure": is_measure,
            "is_dimension": is_dimension,
            "unique_count": int(unique_count),
            "cardinality_ratio": round(cardinality_ratio, 4),
            "null_count": int(series.isna().sum()),
            "null_pct": round(float(series.isna().mean()) * 100, 2)
        }

    @classmethod
    def detect_domain(cls, columns: List[str]) -> Dict[str, Any]:
        """Detect business domain from dataset column names across all core data analyst fields."""
        cols_text = " ".join([c.lower() for c in columns])
        
        domain_scores = {
            "Healthcare & Clinical Operations": sum(1 for w in ["patient", "diagnosis", "doctor", "hospital", "treatment", "dosage", "prescription", "symptom", "admission", "discharge", "vital", "triage", "medication", "clinic", "bed", "physician", "disease", "blood"] if w in cols_text),
            "Financial Services & Banking": sum(1 for w in ["account", "balance", "transaction", "credit", "debit", "loan", "asset", "liability", "ledger", "tax", "equity", "portfolio", "interest", "dividend", "fraud", "deposit", "payment", "bank"] if w in cols_text),
            "Human Resources & People Analytics": sum(1 for w in ["employee", "department", "salary", "hire", "attrition", "performance", "tenure", "job", "turnover", "compensation", "payroll", "rating", "bonus", "role", "leave", "resignation"] if w in cols_text),
            "Supply Chain & Logistics Operations": sum(1 for w in ["shipment", "supplier", "warehouse", "freight", "delivery", "inventory", "carrier", "transit", "sku", "lead_time", "dispatch", "fulfillment", "tracking", "logistics", "consignment", "origin", "destination"] if w in cols_text),
            "Digital Marketing & Customer Acquisition": sum(1 for w in ["campaign", "clicks", "impressions", "cpc", "ctr", "lead", "conversion", "spend", "channel", "ad", "bounce_rate", "attribution", "roas", "funnel", "subscriber", "visitor"] if w in cols_text),
            "Education & Academic Analytics": sum(1 for w in ["student", "course", "grade", "enrollment", "faculty", "gpa", "score", "exam", "semester", "school", "university", "attendance", "graduation", "subject", "tuition", "term"] if w in cols_text),
            "Software as a Service & Subscription Economy": sum(1 for w in ["mrr", "arr", "churn", "subscription", "plan", "tier", "cac", "ltv", "arpu", "active_customers", "retention", "contract", "license", "seats"] if w in cols_text),
            "Retail & E-Commerce Commerce": sum(1 for w in ["order", "product", "sales", "discount", "customer", "ship", "cart", "item", "category", "sub_category", "gmv", "basket", "store", "merchandise"] if w in cols_text),
            "Operations & Manufacturing Quality": sum(1 for w in ["machine", "downtime", "uptime", "cycle_time", "defect", "quality", "maintenance", "production", "throughput", "yield", "scrap", "oee", "assembly", "plant", "batch", "sensor"] if w in cols_text),
        }
        
        best_domain, score = max(domain_scores.items(), key=lambda x: x[1])
        if score < 1:
            best_domain = "General Business Analytics"
            
        domain_descriptions = {
            "Healthcare & Clinical Operations": "Clinical outcomes, patient admissions, treatment efficacy, and hospital operational efficiency.",
            "Financial Services & Banking": "Portfolio performance, transaction volumes, risk exposure, credit allocation, and ledger accounting.",
            "Human Resources & People Analytics": "Headcount dynamics, employee retention, compensation parity, performance reviews, and attrition risk.",
            "Supply Chain & Logistics Operations": "Freight transit efficiency, inventory replenishment cycles, supplier reliability, and carrier on-time delivery rates.",
            "Digital Marketing & Customer Acquisition": "Advertising spend efficiency, customer acquisition funnel conversion rates, cost per click, and campaign return on investment.",
            "Education & Academic Analytics": "Student academic performance, course completion rates, grade point averages, and demographic retention trends.",
            "Software as a Service & Subscription Economy": "Monthly recurring revenue growth, customer churn dynamics, lifetime value, and cohort expansion.",
            "Retail & E-Commerce Commerce": "Merchandise sales performance, average order value, category margin contribution, and fulfillment velocity.",
            "Operations & Manufacturing Quality": "Equipment overall effectiveness, manufacturing defect rates, cycle time optimization, and preventative maintenance.",
            "General Business Analytics": "Cross-functional key performance metrics, distribution frequencies, and exploratory operational trends."
        }

        return {
            "primary_domain": best_domain,
            "description": domain_descriptions.get(best_domain, "Standard analytical distribution across dimensions and measures."),
            "confidence_score": min(1.0, round(score / 3.0, 2)),
            "all_scores": domain_scores
        }
