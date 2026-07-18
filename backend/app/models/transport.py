from pydantic import BaseModel, Field
from typing import Dict, List

class ExitStrategy(BaseModel):
    gate: str
    allowedTiers: List[str] = Field(default_factory=list)
    estimatedTime: str

class TransportConfig(BaseModel):
    traffic: Dict[str, str] = Field(default_factory=dict)  # Zone Name -> Traffic Level
    parking: Dict[str, int] = Field(default_factory=dict)  # spots count
    exitPlan: Dict[str, ExitStrategy] = Field(default_factory=dict)
    updatedAt: str
