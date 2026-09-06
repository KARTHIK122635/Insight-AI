import io
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_executive_briefing_and_opportunities():
    # Synthetic transactional dataset with temporal, dimensions, and financial metrics
    sample_csv = "Transaction_Date,Region,Product_Category,Revenue,Profit,Discount\n"
    for i in range(1, 30):
        reg = "North" if i % 2 == 0 else "South"
        cat = "Enterprise Software" if i % 3 == 0 else ("Hardware" if i % 3 == 1 else "Consulting")
        rev = 5000 + i * 250
        prof = -200 if (i == 4 or i == 8) else (rev * 0.28) # Inject leakage for leakage radar
        disc = 0.25 if (i % 5 == 0) else 0.05
        sample_csv += f"2025-{(i%12)+1:02d}-10,{reg},{cat},{rev},{prof},{disc}\n"

    upload_res = client.post(
        "/api/datasets/upload",
        files={"file": ("commercial_sales.csv", io.BytesIO(sample_csv.encode("utf-8")), "text/csv")}
    )
    assert upload_res.status_code == 200
    ds_id = upload_res.json()["dataset_id"]

    # 1. Test Executive Briefing Endpoint
    briefing_res = client.get(f"/api/insights/executive_briefing/{ds_id}")
    assert briefing_res.status_code == 200
    briefing = briefing_res.json()

    assert "health_score" in briefing
    assert 20 <= briefing["health_score"] <= 96
    assert "health_label" in briefing
    assert "health_status" in briefing
    assert briefing["health_status"] in ["healthy", "stable", "warning", "critical"]
    assert "summary" in briefing
    assert isinstance(briefing["strategic_takeaways"], list)
    assert len(briefing["strategic_takeaways"]) == 3
    assert isinstance(briefing["action_items"], list)
    assert len(briefing["action_items"]) == 3
    assert "metrics" in briefing
    assert briefing["metrics"]["total_revenue"] > 0
    assert "margin_pct" in briefing["metrics"]

    # 2. Test Business Opportunities & Leakage Radar Endpoint
    opps_res = client.get(f"/api/insights/business_opportunities/{ds_id}")
    assert opps_res.status_code == 200
    opps = opps_res.json()

    assert "opportunities" in opps
    assert isinstance(opps["opportunities"], list)
    assert len(opps["opportunities"]) >= 1
    top_opp = opps["opportunities"][0]
    assert "title" in top_opp
    assert "strategic_play" in top_opp
    assert "potential" in top_opp

    assert "leakage" in opps
    assert isinstance(opps["leakage"], list)
    # Our synthetic dataset has negative profit injected at i=4 and i=8
    assert len(opps["leakage"]) >= 1
    leak = opps["leakage"][0]
    assert "severity" in leak
    assert leak["severity"] in ["critical", "warning", "info"]
    assert "estimated_leakage" in leak
    assert "remedy" in leak

def test_executive_briefing_fallback_and_404():
    # 404 test for non-existent dataset
    res_404 = client.get("/api/insights/executive_briefing/non_existent_dataset_99999")
    assert res_404.status_code == 404

    opp_404 = client.get("/api/insights/business_opportunities/non_existent_dataset_99999")
    assert opp_404.status_code == 404

    # Non-temporal dataset
    csv_simple = "Department,Employees,Budget\nSales,50,500000\nR&D,80,1200000\nMarketing,30,300000\n"
    up_res = client.post(
        "/api/datasets/upload",
        files={"file": ("departments.csv", io.BytesIO(csv_simple.encode("utf-8")), "text/csv")}
    )
    assert up_res.status_code == 200
    ds_id = up_res.json()["dataset_id"]

    briefing_res = client.get(f"/api/insights/executive_briefing/{ds_id}")
    assert briefing_res.status_code == 200
    briefing = briefing_res.json()
    assert briefing["health_score"] > 0
    assert len(briefing["strategic_takeaways"]) == 3

def test_chatbot_profit_concentration_advice():
    # Dataset containing high-cardinality customer_id and meaningful sales_channel
    csv_text = "customer_id,sales_channel,profit,sales\n"
    for i in range(1, 40):
        ch = "Online Website" if i % 2 == 0 else "Retail Store"
        prof = 500 if i % 2 == 0 else -100
        csv_text += f"CUST-{i:05d},{ch},{prof},{1000 + i * 50}\n"

    up_res = client.post(
        "/api/datasets/upload",
        files={"file": ("omnichannel.csv", io.BytesIO(csv_text.encode("utf-8")), "text/csv")}
    )
    assert up_res.status_code == 200
    ds_id = up_res.json()["dataset_id"]

    # Test question asking how to increase profits
    chat_res = client.post(
        "/api/chat",
        json={
            "question": "💡 How can I increase profits?",
            "dataset_id": ds_id
        }
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    ans = chat_data["answer"]

    # Must give explicit concentration guidance
    assert "Where to Concentrate" in ans or "concentrate" in ans.lower()
    assert "Online Website" in ans
    assert "Retail Store" in ans
    # High-cardinality customer_id must NOT be chosen as the concentration field
    assert "CUST-" not in ans

