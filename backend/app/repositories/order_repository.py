from app.models.order import Order
from app.repositories.base import BaseRepository

class OrderRepository(BaseRepository[Order]):
    def __init__(self):
        super().__init__("orders", Order)
