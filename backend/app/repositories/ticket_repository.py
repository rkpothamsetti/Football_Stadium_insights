from app.models.ticket import Ticket
from app.repositories.base import BaseRepository

class TicketRepository(BaseRepository[Ticket]):
    def __init__(self):
        super().__init__("tickets", Ticket)
