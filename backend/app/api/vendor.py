from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from app.models.order import Order
from app.models.vendor import Vendor, InventoryItem
from app.repositories.order_repository import OrderRepository
from app.repositories.vendor_repository import VendorRepository
from app.api.security_headers import verify_role
from app.core.logging import logger

router = APIRouter(prefix="/vendor", tags=["Vendor Workspace"])

class StatusUpdateRequest(BaseModel):
    status: str  # pending, preparing, delivered, cancelled

class InventoryUpdateRequest(BaseModel):
    inventory: List[InventoryItem]

@router.put("/orders/{orderId}/status", response_model=Order, dependencies=[Depends(verify_role(["vendor", "operations"]))])
async def update_order_status(
    orderId: str,
    request: StatusUpdateRequest,
    order_repo: OrderRepository = Depends(OrderRepository)
):
    logger.info(f"Updating order status {orderId} -> {request.status}")
    
    order = order_repo.get(orderId)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order.status = request.status
    order.updatedAt = datetime.utcnow().isoformat()
    order_repo.save(orderId, order)
    
    return order

@router.get("/orders/{vendorId}", response_model=List[Order], dependencies=[Depends(verify_role(["vendor", "operations"]))])
async def get_vendor_orders(
    vendorId: str,
    order_repo: OrderRepository = Depends(OrderRepository)
):
    all_orders = order_repo.list_all()
    vendor_orders = [o for o in all_orders if o.vendorId == vendorId]
    return vendor_orders

@router.put("/inventory/{vendorId}", response_model=Vendor, dependencies=[Depends(verify_role(["vendor", "operations"]))])
async def update_inventory(
    vendorId: str,
    request: InventoryUpdateRequest,
    vendor_repo: VendorRepository = Depends(VendorRepository)
):
    vendor = vendor_repo.get(vendorId)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    vendor.inventory = request.inventory
    vendor.updatedAt = datetime.utcnow().isoformat()
    vendor_repo.save(vendorId, vendor)
    
    return vendor

