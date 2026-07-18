from pydantic import BaseModel
from typing import Optional

class Ticket(BaseModel):
    ticketId: str
    matchId: str
    matchName: str
    matchTime: str
    seat: str
    row: str
    section: str
    gate: str
    tier: str
    category: str  # General, Premium, VIP, VVIP
    parkingSpot: Optional[str] = None
