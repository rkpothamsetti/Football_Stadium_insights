from pydantic import BaseModel, Field
from typing import List

class InventoryItem(BaseModel):
    itemId: str
    name: str
    price: float
    quantity: int
    category: str  # food, beverage, merchandise
    available: bool

class SalesSummary(BaseModel):
    todayRevenue: float = 0.0
    ordersCount: int = 0

class Vendor(BaseModel):
    vendorId: str
    name: str
    location: str
    inventory: List[InventoryItem] = Field(default_factory=list)
    salesSummary: SalesSummary = Field(default_factory=SalesSummary)
    updatedAt: str
