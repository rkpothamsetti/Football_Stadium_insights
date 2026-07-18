from app.models.transport import TransportConfig
from app.repositories.base import BaseRepository

class TransportRepository(BaseRepository[TransportConfig]):
    def __init__(self):
        super().__init__("transport", TransportConfig)
