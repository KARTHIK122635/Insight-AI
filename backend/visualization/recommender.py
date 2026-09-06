from typing import Dict, Any, List, Optional

class ChartRecommender:
    """
    Algorithmic Chart Recommendation System.
    Combines:
    - Data compatibility (data types)
    - Analytical intent (comparison, trend, relationship, composition, ranking)
    - Cardinality suitability
    - Readability & business relevance
    """

    CHART_TYPES = ["bar", "line", "pie", "scatter", "area", "heatmap"]

    @classmethod
    def recommend(
        cls,
        intent: str,
        dim_type: Optional[str] = None,
        measure_type: Optional[str] = "numeric",
        cardinality: int = 5,
        num_measures: int = 1
    ) -> Dict[str, Any]:
        """
        Score and rank visualizations for a query.
        Returns top recommendation with score breakdown.
        """
        scores: Dict[str, Dict[str, int]] = {}

        for chart in cls.CHART_TYPES:
            scores[chart] = {
                "data_compatibility": 5,
                "intent_compatibility": 5,
                "cardinality_suitability": 5,
                "readability": 5,
                "total": 20
            }

        intent_lower = intent.lower()

        # Intent Rules
        if intent_lower in ["trend", "time_series", "evolution"]:
            scores["line"]["intent_compatibility"] = 10
            scores["area"]["intent_compatibility"] = 9
            scores["bar"]["intent_compatibility"] = 6
            scores["pie"]["intent_compatibility"] = 1
            scores["scatter"]["intent_compatibility"] = 3
        elif intent_lower in ["comparison", "ranking"]:
            scores["bar"]["intent_compatibility"] = 10
            scores["pie"]["intent_compatibility"] = 4
            scores["line"]["intent_compatibility"] = 4
            scores["scatter"]["intent_compatibility"] = 3
        elif intent_lower in ["composition", "share", "proportion"]:
            scores["pie"]["intent_compatibility"] = 10
            scores["bar"]["intent_compatibility"] = 8
            scores["line"]["intent_compatibility"] = 2
        elif intent_lower in ["relationship", "correlation"]:
            scores["scatter"]["intent_compatibility"] = 10
            scores["heatmap"]["intent_compatibility"] = 8
            scores["bar"]["intent_compatibility"] = 3
            scores["line"]["intent_compatibility"] = 4

        # Data Type Rules
        if dim_type == "temporal":
            scores["line"]["data_compatibility"] = 10
            scores["area"]["data_compatibility"] = 9
            scores["pie"]["data_compatibility"] = 1
        elif dim_type in ["categorical", "geographical"]:
            scores["bar"]["data_compatibility"] = 10
            scores["pie"]["data_compatibility"] = 8 if cardinality <= 6 else 2
            scores["scatter"]["data_compatibility"] = 3

        # Cardinality Rules
        if cardinality > 12:
            scores["bar"]["cardinality_suitability"] = 8 # horizontal bar or scrollable
            scores["pie"]["cardinality_suitability"] = 1 # pie unusable with > 12 slices
            scores["line"]["cardinality_suitability"] = 9
        elif cardinality <= 5:
            scores["pie"]["cardinality_suitability"] = 9
            scores["bar"]["cardinality_suitability"] = 9

        # Calculate Totals
        ranked = []
        for chart, s in scores.items():
            total = (
                s["data_compatibility"] * 2 +
                s["intent_compatibility"] * 3 +
                s["cardinality_suitability"] * 2 +
                s["readability"] * 2
            )
            s["total"] = total
            ranked.append((chart, total, s))

        ranked.sort(key=lambda x: x[1], reverse=True)
        top_chart, top_score, breakdown = ranked[0]

        return {
            "recommended_chart": top_chart,
            "score": top_score,
            "max_possible_score": 90,
            "breakdown": breakdown,
            "alternative_charts": [r[0] for r in ranked[1:3]]
        }
