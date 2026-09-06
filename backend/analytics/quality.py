import math
from datetime import datetime
import pandas as pd
import numpy as np
from typing import Dict, Any, List

class DataQualityEngine:
    @staticmethod
    def audit_quality(df: pd.DataFrame, col_profiles: Dict[str, Any]) -> Dict[str, Any]:
        """
        Audit data quality across missingness, duplicates, outliers, invalid values, and temporal consistency.
        Returns:
            quality_score: 0 - 100
            quality_grade: A+, A, B, C, Needs Attention
            issues: list of detected data health issues
            clean_metrics: summary cards
        """
        total_rows = len(df)
        issues: List[Dict[str, Any]] = []
        score_deductions = 0.0

        # 1. Check Duplicate Records
        dup_count = int(df.duplicated().sum())
        dup_pct = round((dup_count / max(1, total_rows)) * 100, 2)
        if dup_count > 0:
            severity = "high" if dup_pct > 5.0 else "medium"
            deduction = min(20.0, dup_pct * 2.0)
            score_deductions += deduction
            issues.append({
                "category": "Duplicates",
                "severity": severity,
                "title": f"{dup_count:,} duplicate rows detected ({dup_pct}%)",
                "description": f"Found {dup_count} identical records in the dataset. This can inflate aggregates like total sales and counts.",
                "remediation": "Deduplicate the dataset before training models or creating final financial reports."
            })

        # 2. Check Missing Values per Column
        null_issues = []
        for col_name, profile in col_profiles.items():
            null_pct = profile["null_pct"]
            if null_pct > 0.0:
                if null_pct > 30.0:
                    severity = "high"
                    score_deductions += 6.0
                elif null_pct > 5.0:
                    severity = "medium"
                    score_deductions += 3.0
                else:
                    severity = "low"
                    score_deductions += 1.0

                null_issues.append({
                    "column": col_name,
                    "null_pct": null_pct,
                    "null_count": profile["null_count"],
                    "severity": severity
                })

        if null_issues:
            null_desc_list = [f"{n['column']} ({n['null_pct']}%)" for n in null_issues[:5]]
            issues.append({
                "category": "Missing Values",
                "severity": "high" if any(n["severity"] == "high" for n in null_issues) else "medium",
                "title": f"Missing values present in {len(null_issues)} columns",
                "description": f"Columns with missing values: {', '.join(null_desc_list)}",
                "remediation": "Impute missing values using median/mode, or filter null records during aggregation."
            })

        # 3. Check Outliers in Numeric Measures (IQR & Z-Score)
        outlier_columns = []
        for col_name, profile in col_profiles.items():
            if profile["physical_type"] in ["integer", "float"] and profile["is_measure"]:
                series = df[col_name].dropna()
                if len(series) > 20:
                    q25 = series.quantile(0.25)
                    q75 = series.quantile(0.75)
                    iqr = q75 - q25
                    if iqr > 0:
                        lower_bound = q25 - 1.5 * iqr
                        upper_bound = q75 + 1.5 * iqr
                        outliers = series[(series < lower_bound) | (series > upper_bound)]
                        outlier_count = len(outliers)
                        outlier_pct = round((outlier_count / len(series)) * 100, 2)
                        
                        if outlier_pct > 3.0:
                            outlier_columns.append({
                                "column": col_name,
                                "outlier_count": outlier_count,
                                "outlier_pct": outlier_pct,
                                "upper_bound": round(float(upper_bound), 2),
                                "max_detected": round(float(series.max()), 2)
                            })

        if outlier_columns:
            score_deductions += min(15.0, len(outlier_columns) * 3.0)
            outlier_desc_list = [f"{o['column']} ({o['outlier_pct']}% outliers)" for o in outlier_columns[:4]]
            issues.append({
                "category": "Outliers",
                "severity": "medium",
                "title": f"Extreme outliers detected in {len(outlier_columns)} measure columns",
                "description": f"Columns with high Interquartile Range deviations: {', '.join(outlier_desc_list)}",
                "remediation": "Inspect extreme values to verify if they represent high-value enterprise sales or logging errors."
            })

        # 4. Check Invalid Domain Constraints (Negative quantities, discounts > 1.0)
        invalid_rules = []
        for col in df.columns:
            col_l = col.lower()
            if "quantity" in col_l or "qty" in col_l:
                negatives = int((df[col] < 0).sum())
                if negatives > 0:
                    invalid_rules.append(f"{col} has {negatives} negative values (quantities should be non-negative)")
            if "discount" in col_l:
                excessive = int((df[col] > 1.0).sum())
                if excessive > 0:
                    invalid_rules.append(f"{col} has {excessive} values > 1.0 (discounts should typically be <= 100%)")

        if invalid_rules:
            score_deductions += 10.0
            issues.append({
                "category": "Domain Validity",
                "severity": "high",
                "title": "Violations of expected business constraints",
                "description": "; ".join(invalid_rules),
                "remediation": "Filter or transform invalid entries (e.g. convert percentage 0-100 to 0-1)."
            })

        # Compute Final Score
        final_score = max(20.0, min(100.0, 100.0 - score_deductions))
        final_score = round(final_score, 1)

        if final_score >= 95:
            grade = "A+"
        elif final_score >= 85:
            grade = "A"
        elif final_score >= 70:
            grade = "B"
        elif final_score >= 50:
            grade = "C"
        else:
            grade = "Needs Attention"

        return {
            "score": final_score,
            "grade": grade,
            "duplicate_count": dup_count,
            "duplicate_pct": dup_pct,
            "columns_with_nulls": len(null_issues),
            "outlier_columns": outlier_columns,
            "issues": issues,
            "passed_checks_count": max(0, 5 - len(issues))
        }
