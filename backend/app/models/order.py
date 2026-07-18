from pydantic import BaseModel
from typing import List

class OrderItem(BaseModel):
    itemId: str
    name: str
    quantity: int
    price: float

class Order(BaseModel):
    orderId: str
    userId: str
    vendorId: str
    seatNumber: str
    items: List[OrderItem]
    totalAmount: float
    status: str  # pending, preparing, delivered, cancelled
    deliveryAgent: str = ""
    createdAt: str
    updatedAt: str
