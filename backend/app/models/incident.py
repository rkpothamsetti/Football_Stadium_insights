from pydantic import BaseModel
from typing import Optional

class IncidentLocation(BaseModel):
    section: str
    gate: str
    label: str
    x: Optional[float] = None
    y: Optional[float] = None

class Incident(BaseModel):
    incidentId: str
    severity: str  # low, medium, high, critical
    location: IncidentLocation
    description: str
    status: str  # reported, assigned, resolving, resolved
    assignedTeam: Optional[str] = None
    reportedBy: str
    createdAt: str
    updatedAt: str
