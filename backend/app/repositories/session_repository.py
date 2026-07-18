from app.models.session import Session
from app.repositories.base import BaseRepository

class SessionRepository(BaseRepository[Session]):
    def __init__(self):
        super().__init__("sessions", Session)
