from datetime import datetime
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.models.incident import Incident, IncidentLocation
from app.models.security import SecurityZone
from app.repositories.incident_repository import IncidentRepository
from app.api.security_headers import verify_role
from app.core.logging import logger

router = APIRouter(prefix="/security", tags=["Security Workspace"])

class IncidentCreateRequest(BaseModel):
    severity: str
    location: IncidentLocation
    description: str
    reportedBy: str

class IncidentStatusUpdateRequest(BaseModel):
    status: str
    assignedTeam: Optional[str] = None

@router.post("/incidents", response_model=Incident, dependencies=[Depends(verify_role(["spectator", "vendor", "security", "operations", "transport"]))])
async def report_incident(
    request: IncidentCreateRequest,
    incident_repo: IncidentRepository = Depends(IncidentRepository)
):
    logger.info(f"Reporting incident severity={request.severity} by user={request.reportedBy}")
    
    incident_id = str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat()
    
    incident = Incident(
        incidentId=incident_id,
        severity=request.severity,
        location=request.location,
        description=request.description,
        status="reported",
        reportedBy=request.reportedBy,
        createdAt=now_str,
        updatedAt=now_str
    )
    
    incident_repo.save(incident_id, incident)
    return incident

@router.get("/incidents", response_model=List[Incident], dependencies=[Depends(verify_role(["security", "operations"]))])
async def list_incidents(incident_repo: IncidentRepository = Depends(IncidentRepository)):
    return incident_repo.list_all()

@router.put("/incidents/{incidentId}/status", response_model=Incident, dependencies=[Depends(verify_role(["security", "operations"]))])
async def update_incident_status(
    incidentId: str,
    request: IncidentStatusUpdateRequest,
    incident_repo: IncidentRepository = Depends(IncidentRepository)
):
    incident = incident_repo.get(incidentId)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    incident.status = request.status
    if request.assignedTeam:
        incident.assignedTeam = request.assignedTeam
    incident.updatedAt = datetime.utcnow().isoformat()
    
    incident_repo.save(incidentId, incident)
    return incident

