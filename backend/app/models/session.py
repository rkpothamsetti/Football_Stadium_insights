from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ActionItem(BaseModel):
    type: str  # navigate | order_food | play_audio | trigger_sos | update_ui
    payload: Dict[str, Any] = Field(default_factory=dict)

class Message(BaseModel):
    messageId: str
    sender: str  # user | orchestrator | agent
    agentId: Optional[str] = None
    content: str
    timestamp: str
    suggestedActions: Optional[List[ActionItem]] = None

class CoordinateLocation(BaseModel):
    x: float
    y: float
    level: str
    label: str

class SessionContext(BaseModel):
    currentLocation: Optional[CoordinateLocation] = None
    destination: Optional[CoordinateLocation] = None
    currentOrderId: Optional[str] = None
    emergencySOS: Optional[bool] = False
    lastIntent: Optional[str] = None

class Session(BaseModel):
    sessionId: str
    userId: str
    role: str
    activeAgentId: str  # master, fan, security, vendor, operations, transportation, accessibility
    messages: List[Message] = Field(default_factory=list)
    context: SessionContext = Field(default_factory=SessionContext)
    createdAt: str
    updatedAt: str
