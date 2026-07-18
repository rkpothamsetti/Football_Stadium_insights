from app.models.incident import Incident
from app.repositories.base import BaseRepository

class IncidentRepository(BaseRepository[Incident]):
    def __init__(self):
        super().__init__("incidents", Incident)
