from pydantic import BaseModel, Field
from typing import List

class Alert(BaseModel):
    alertId: str
    title: str
    message: str
    severity: str  # info, warning, critical
    timestamp: str

class SecurityZone(BaseModel):
    zoneId: str
    name: str
    officers: List[str] = Field(default_factory=list)
    crowdLevel: str  # low, medium, high, overcrowded
    alerts: List[Alert] = Field(default_factory=list)
