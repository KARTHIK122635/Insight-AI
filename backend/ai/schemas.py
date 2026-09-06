from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class IntentClassification(BaseModel):
    intent: str = Field(..., description="Intent type: comparison, trend, relationship, ranking, distribution, composition, root_cause, general")
    dimension: Optional[str] = None
    measure: Optional[str] = None
    aggregation: Optional[str] = "sum"
    filters: Optional[Dict[str, Any]] = None
    time_grain: Optional[str] = None # 'month', 'year', 'day'

class QueryPlan(BaseModel):
    operation: str = "group_by" # group_by, filter, time_series, aggregate, ranking
    dimension: Optional[str] = None
    measure: Optional[str] = None
    aggregation: str = "sum"
    sort_direction: str = "desc"
    limit: Optional[int] = 10
    sql: str
    explanation: str

class AxisSpec(BaseModel):
    field: str
    label: Optional[str] = None
    aggregation: Optional[str] = None

class ChartRecommendationSpec(BaseModel):
    chart_type: str = "bar" # bar, line, scatter, pie, area, heatmap
    title: str
    subtitle: Optional[str] = None
    x_axis: Optional[AxisSpec] = None
    y_axis: Optional[AxisSpec] = None
    color_field: Optional[str] = None
    sort: Optional[Dict[str, str]] = None
    echarts_options: Optional[Dict[str, Any]] = None

class EvidenceInsight(BaseModel):
    claim: str
    evidence: str
    calculation: str
    visualization: Optional[Dict[str, Any]] = None
    explanation: str

class ChatMessage(BaseModel):
    role: str # user, assistant, system
    content: str
    metadata: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    answer: str
    intent: str
    sql: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None
    chart_spec: Optional[ChartRecommendationSpec] = None
    root_cause: Optional[Dict[str, Any]] = None
    evidence: Optional[str] = None
    suggested_followups: List[str] = []

class ExecutiveStorySection(BaseModel):
    title: str
    key_metrics: List[Dict[str, Any]] = []
    narrative: str
    takeaways: List[str] = []
    recommended_action: Optional[str] = None

class ExecutiveStory(BaseModel):
    dataset_name: str
    domain: str
    executive_summary: str
    overall_performance: str
    growth_drivers: str
    underperforming_areas: str
    anomalies: str
    risks: str
    opportunities: str
    recommended_actions: List[str]
    sections: List[ExecutiveStorySection] = []
