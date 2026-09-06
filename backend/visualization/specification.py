from typing import Dict, Any, List, Optional
import numpy as np

DARK_PALETTE = [
    "#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", 
    "#8b5cf6", "#3b82f6", "#14b8a6", "#f97316", "#a855f7"
]

COLOR_THEMES = {
    "indigo": ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"],
    "emerald": ["#10b981", "#059669", "#34d399", "#6ee7b7", "#047857", "#a7f3d0"],
    "cyberpunk": ["#ec4899", "#8b5cf6", "#06b6d4", "#f43f5e", "#d946ef", "#3b82f6"],
    "amber": ["#f59e0b", "#d97706", "#fbbf24", "#f97316", "#ea580c", "#fde68a"],
    "ocean": ["#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#0369a1", "#075985"]
}

class EChartsSpecBuilder:
    @staticmethod
    def build_option(
        chart_type: str,
        title: str,
        data: List[Dict[str, Any]],
        dimension: Optional[str] = None,
        measure: Optional[str] = None,
        color_palette: Optional[List[str]] = None,
        theme_name: Optional[str] = "indigo"
    ) -> Dict[str, Any]:
        """Convert query rows and parameters into rich Apache ECharts options."""
        colors = color_palette or COLOR_THEMES.get(theme_name, DARK_PALETTE)

        if not data:
            return {
                "title": {"text": title, "textStyle": {"color": "#94a3b8", "fontSize": 14}},
                "series": []
            }

        cols = list(data[0].keys())
        dim_col = dimension or (cols[0] if len(cols) > 0 else "x")
        meas_col = measure or (cols[1] if len(cols) > 1 else (cols[0] if len(cols) > 0 else "y"))

        x_vals = [str(r.get(dim_col, "")) for r in data]
        y_vals = []
        for r in data:
            val = r.get(meas_col)
            try:
                y_vals.append(round(float(val), 2) if val is not None else 0)
            except Exception:
                y_vals.append(0)

        base_option = {
            "title": {
                "text": title,
                "left": "left",
                "textStyle": {"color": "#f8fafc", "fontSize": 14, "fontWeight": 600}
            },
            "tooltip": {
                "trigger": "axis",
                "backgroundColor": "rgba(15, 23, 42, 0.95)",
                "borderColor": "#334155",
                "textStyle": {"color": "#f8fafc"}
            },
            "grid": {
                "left": "4%",
                "right": "4%",
                "bottom": "10%",
                "top": "18%",
                "containLabel": True
            },
            "color": colors
        }

        # 1. Bar Chart (Vertical or Horizontal)
        if chart_type in ["bar", "column"]:
            is_horizontal = len(x_vals) > 6 and any(len(str(x)) > 8 for x in x_vals)
            if is_horizontal:
                base_option["yAxis"] = {
                    "type": "category",
                    "data": x_vals[::-1],
                    "axisLine": {"lineStyle": {"color": "#475569"}},
                    "axisLabel": {"color": "#94a3b8"}
                }
                base_option["xAxis"] = {
                    "type": "value",
                    "axisLine": {"lineStyle": {"color": "#475569"}},
                    "splitLine": {"lineStyle": {"color": "#1e293b", "type": "dashed"}},
                    "axisLabel": {"color": "#94a3b8"}
                }
                base_option["series"] = [{
                    "name": meas_col.replace("_", " ").title(),
                    "type": "bar",
                    "data": y_vals[::-1],
                    "itemStyle": {"borderRadius": [0, 4, 4, 0], "color": colors[0]}
                }]
            else:
                base_option["xAxis"] = {
                    "type": "category",
                    "data": x_vals,
                    "axisLine": {"lineStyle": {"color": "#475569"}},
                    "axisLabel": {"color": "#94a3b8", "interval": 0, "rotate": 20 if len(x_vals) > 5 else 0}
                }
                base_option["yAxis"] = {
                    "type": "value",
                    "axisLine": {"lineStyle": {"color": "#475569"}},
                    "splitLine": {"lineStyle": {"color": "#1e293b", "type": "dashed"}},
                    "axisLabel": {"color": "#94a3b8"}
                }
                base_option["series"] = [{
                    "name": meas_col.replace("_", " ").title(),
                    "type": "bar",
                    "data": y_vals,
                    "itemStyle": {"borderRadius": [4, 4, 0, 0], "color": colors[0]}
                }]

        # 2. Line & Area Chart
        elif chart_type in ["line", "area"]:
            base_option["xAxis"] = {
                "type": "category",
                "data": x_vals,
                "axisLine": {"lineStyle": {"color": "#475569"}},
                "axisLabel": {"color": "#94a3b8"}
            }
            base_option["yAxis"] = {
                "type": "value",
                "axisLine": {"lineStyle": {"color": "#475569"}},
                "splitLine": {"lineStyle": {"color": "#1e293b", "type": "dashed"}},
                "axisLabel": {"color": "#94a3b8"}
            }
            series_item = {
                "name": meas_col.replace("_", " ").title(),
                "type": "line",
                "smooth": True,
                "data": y_vals,
                "lineStyle": {"width": 3, "color": colors[0]},
                "itemStyle": {"color": colors[0]}
            }
            if chart_type == "area":
                series_item["areaStyle"] = {"opacity": 0.25, "color": colors[0]}
            base_option["series"] = [series_item]

        # 3. Pie & Donut Chart
        elif chart_type in ["pie", "donut"]:
            base_option["tooltip"]["trigger"] = "item"
            pie_data = [{"name": str(x), "value": y} for x, y in zip(x_vals[:8], y_vals[:8])]
            base_option["series"] = [{
                "name": meas_col.replace("_", " ").title(),
                "type": "pie",
                "radius": ["40%", "70%"] if chart_type == "donut" else "65%",
                "avoidLabelOverlap": True,
                "itemStyle": {"borderRadius": 6, "borderColor": "#090d16", "borderWidth": 2},
                "label": {"show": True, "color": "#cbd5e1"},
                "data": pie_data
            }]

        # 4. Radar / Spider Chart
        elif chart_type == "radar":
            base_option["tooltip"]["trigger"] = "item"
            max_val = max(y_vals) if y_vals else 100
            indicators = [{"name": str(x), "max": max_val * 1.15} for x in x_vals[:6]]
            base_option["radar"] = {
                "indicator": indicators,
                "axisName": {"color": "#94a3b8"},
                "splitLine": {"lineStyle": {"color": "#334155"}},
                "splitArea": {"show": False}
            }
            base_option["series"] = [{
                "name": meas_col.replace("_", " ").title(),
                "type": "radar",
                "data": [{"value": y_vals[:6], "name": meas_col.replace("_", " ").title()}],
                "lineStyle": {"color": colors[0], "width": 2},
                "areaStyle": {"color": colors[0], "opacity": 0.3}
            }]

        # 5. Funnel Chart
        elif chart_type == "funnel":
            base_option["tooltip"]["trigger"] = "item"
            funnel_data = sorted([{"name": str(x), "value": y} for x, y in zip(x_vals[:6], y_vals[:6])], key=lambda i: i["value"], reverse=True)
            base_option["series"] = [{
                "name": meas_col.replace("_", " ").title(),
                "type": "funnel",
                "left": "10%",
                "top": 60,
                "bottom": 30,
                "width": "80%",
                "sort": "descending",
                "gap": 3,
                "label": {"show": True, "position": "inside", "color": "#ffffff"},
                "itemStyle": {"borderColor": "#090d16", "borderWidth": 2},
                "data": funnel_data
            }]

        # 6. Treemap Chart
        elif chart_type == "treemap":
            base_option["tooltip"]["trigger"] = "item"
            treemap_data = [{"name": str(x), "value": y} for x, y in zip(x_vals[:12], y_vals[:12]) if y > 0]
            base_option["series"] = [{
                "type": "treemap",
                "data": treemap_data,
                "roam": False,
                "label": {"show": True, "formatter": "{b}\n${c}" if "sale" in meas_col or "profit" in meas_col else "{b}\n{c}"},
                "itemStyle": {"borderColor": "#0f172a", "borderWidth": 2, "gapWidth": 2}
            }]

        # 7. Pareto Chart (Bar + Cumulative Line)
        elif chart_type == "pareto":
            total_sum = sum(y_vals) or 1
            sorted_pairs = sorted(zip(x_vals, y_vals), key=lambda p: p[1], reverse=True)[:10]
            sorted_x = [p[0] for p in sorted_pairs]
            sorted_y = [p[1] for p in sorted_pairs]
            
            # Cumulative percentages
            cum_vals = []
            running = 0
            for v in sorted_y:
                running += v
                cum_vals.append(round((running / total_sum) * 100, 1))

            base_option["xAxis"] = {
                "type": "category",
                "data": sorted_x,
                "axisLine": {"lineStyle": {"color": "#475569"}},
                "axisLabel": {"color": "#94a3b8", "rotate": 25}
            }
            base_option["yAxis"] = [
                {
                    "type": "value",
                    "name": meas_col.title(),
                    "splitLine": {"lineStyle": {"color": "#1e293b", "type": "dashed"}},
                    "axisLabel": {"color": "#94a3b8"}
                },
                {
                    "type": "value",
                    "name": "Cumulative %",
                    "min": 0,
                    "max": 100,
                    "splitLine": {"show": False},
                    "axisLabel": {"formatter": "{value}%", "color": "#f59e0b"}
                }
            ]
            base_option["series"] = [
                {
                    "name": meas_col.title(),
                    "type": "bar",
                    "data": sorted_y,
                    "itemStyle": {"color": colors[0], "borderRadius": [4, 4, 0, 0]}
                },
                {
                    "name": "Cumulative %",
                    "type": "line",
                    "yAxisIndex": 1,
                    "data": cum_vals,
                    "lineStyle": {"color": "#f59e0b", "width": 3},
                    "itemStyle": {"color": "#f59e0b"}
                }
            ]

        # 8. Scatter Plot
        elif chart_type == "scatter":
            base_option["tooltip"]["trigger"] = "item"
            sec_col = cols[2] if len(cols) > 2 else (cols[1] if len(cols) > 1 else cols[0])
            scatter_pts = []
            for r in data:
                try:
                    vx = float(r.get(dim_col, 0) or 0)
                    vy = float(r.get(meas_col, 0) or 0)
                    scatter_pts.append([vx, vy])
                except Exception:
                    pass

            base_option["xAxis"] = {"type": "value", "name": dim_col.title(), "splitLine": {"lineStyle": {"color": "#1e293b"}}}
            base_option["yAxis"] = {"type": "value", "name": meas_col.title(), "splitLine": {"lineStyle": {"color": "#1e293b"}}}
            base_option["series"] = [{
                "symbolSize": 10,
                "data": scatter_pts,
                "type": "scatter",
                "itemStyle": {"color": colors[1]}
            }]

        return base_option
