from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Any, List
from app.repositories.incident_repository import IncidentRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.vendor_repository import VendorRepository
from app.api.security_headers import verify_role
from app.core.logging import logger

router = APIRouter(prefix="/operations", tags=["Operations Workspace"])

class DashboardSummaryResponse(BaseModel):
    activeIncidentsCount: int
    criticalIncidentsCount: int
    totalOrdersCount: int
    queueWaitTimesMinutes: Dict[str, int]
    utilityStatuses: Dict[str, str]
    geminiSummary: str

@router.get("/dashboard-summary", response_model=DashboardSummaryResponse, dependencies=[Depends(verify_role(["operations"]))])
async def get_dashboard_summary(
    incident_repo: IncidentRepository = Depends(IncidentRepository),
    order_repo: OrderRepository = Depends(OrderRepository),
    vendor_repo: VendorRepository = Depends(VendorRepository)
):

    logger.info("Generating Operations Dashboard summary metrics")
    
    all_incidents = incident_repo.list_all()
    active_incidents = [i for i in all_incidents if i.status != "resolved"]
    critical_incidents = [i for i in active_incidents if i.severity in ["high", "critical"]]
    
    all_orders = order_repo.list_all()
    
    from app.core.firebase import db
    from app.core.gemini import generate_stadium_response

    # 1. Fetch live gate wait times
    queue_times = {}
    try:
        gate_docs = db.collection("gates").stream()
        for doc in gate_docs:
            queue_times[doc.id] = int(doc.to_dict().get("waitTimeMinutes", 0))
    except Exception as err:
        logger.error(f"Error fetching gate metrics: {err}")

    # 2. Fetch live utility statuses
    utilities = {}
    try:
        util_docs = db.collection("utilities").stream()
        for doc in util_docs:
            utilities[doc.id] = str(doc.to_dict().get("status", "nominal"))
    except Exception as err:
        logger.error(f"Error fetching utility metrics: {err}")

    # 3. Call Gemini dynamically to get the summary
    summary_prompt = f"""
    You are the Operations Control Director. Synthesize the stadium operational health summary.
    Active Incidents Count: {len(active_incidents)}
    Critical Incidents Count: {len(critical_incidents)}
    Total Orders Count: {len(all_orders)}
    Gate wait times: {queue_times}
    Utility statuses: {utilities}
    Provide a concise, professional operational report summary.
    """
    try:
        gemini_res = generate_stadium_response(summary_prompt)
        llm_summary = gemini_res.get("content", "Telemetry metrics parsed.")
    except Exception as gem_err:
        logger.error(f"Gemini summary generation failed: {gem_err}")
        raise HTTPException(status_code=502, detail="Operational summary service failed to respond")

    return DashboardSummaryResponse(
        activeIncidentsCount=len(active_incidents),
        criticalIncidentsCount=len(critical_incidents),
        totalOrdersCount=len(all_orders),
        queueWaitTimesMinutes=queue_times,
        utilityStatuses=utilities,
        geminiSummary=llm_summary
    )
