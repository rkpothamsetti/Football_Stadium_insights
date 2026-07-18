from pydantic import BaseModel, Field
from typing import Optional

class Profile(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None

class UserPreferences(BaseModel):
    accessibilityMode: bool = False
    largeText: bool = False
    screenReader: bool = False
    wheelchairRoute: bool = False
    voiceInteraction: bool = False

class User(BaseModel):
    id: str
    role: str  # spectator, vendor, security, operations, transport
    profile: Profile
    ticketId: Optional[str] = None
    language: str = "en"
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    createdAt: str
