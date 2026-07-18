from datetime import datetime
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.models.order import Order, OrderItem
from app.models.vendor import Vendor, InventoryItem
from app.repositories.order_repository import OrderRepository
from app.repositories.vendor_repository import VendorRepository
from app.core.logging import logger

router = APIRouter(prefix="/fan", tags=["Fan Workspace"])

class RouteRequest(BaseModel):
    startNode: str
    endNode: str
    accessible: bool = False

class RouteResponse(BaseModel):
    path: List[str]
    accessible: bool
    estimatedTimeSeconds: int
    instructions: List[str]

class OrderCreateRequest(BaseModel):
    userId: str
    vendorId: str
    seatNumber: str
    items: List[OrderItem]

@router.get("/navigation/route", response_model=RouteResponse)
async def get_route(startNode: str, endNode: str, accessible: bool = False):
    logger.info(f"Computing route from {startNode} to {endNode} (Accessible={accessible})")
    
    from collections import deque
    from app.core.firebase import db

    # 1. Fetch nodes from Firestore navigation_nodes collection
    try:
        docs = db.collection("navigation_nodes").stream()
        graph = {}
        for doc in docs:
            data = doc.to_dict()
            graph[doc.id] = data
    except Exception as err:
        logger.error(f"Database error reading navigation graph: {err}")
        raise HTTPException(status_code=500, detail="Wayfinding map server unavailable")

    if not graph:
        raise HTTPException(status_code=404, detail="Navigation graph node structure not found in database")

    if startNode not in graph or endNode not in graph:
        raise HTTPException(status_code=404, detail="Invalid navigation parameters: source or target node not registered")

    # 2. Run BFS to find shortest path
    queue = deque([[startNode]])
    visited = {startNode}
    found_path = None

    while queue:
        current_path = queue.popleft()
        current_node = current_path[-1]

        if current_node == endNode:
            found_path = current_path
            break

        node_data = graph.get(current_node, {})
        neighbors = node_data.get("accessibleNeighbors", []) if accessible else node_data.get("neighbors", [])

        for neighbor in neighbors:
            if neighbor not in visited and neighbor in graph:
                visited.add(neighbor)
                queue.append(current_path + [neighbor])

    if not found_path:
        raise HTTPException(status_code=404, detail="No route pathway found between specified seating sectors")

    # 3. Assemble instructions dynamically
    instructions = [f"Start navigation at {graph[startNode].get('label', startNode)}"]
    for i in range(len(found_path) - 1):
        u = found_path[i]
        v = found_path[i+1]
        step_instruction = graph[u].get("instructions", {}).get(v, f"Proceed to {graph[v].get('label', v)}")
        instructions.append(step_instruction)

    estimated_time = len(found_path) * (45 if accessible else 30)

    return RouteResponse(
        path=found_path,
        accessible=accessible,
        estimatedTimeSeconds=estimated_time,
        instructions=instructions
    )


@router.post("/orders", response_model=Order)
async def place_order(
    request: OrderCreateRequest,
    order_repo: OrderRepository = Depends(OrderRepository),
    vendor_repo: VendorRepository = Depends(VendorRepository)
):
    logger.info(f"Placing order for user {request.userId} at vendor {request.vendorId}")
    
    vendor = vendor_repo.get(request.vendorId)
    if not vendor:
        raise HTTPException(status_code=404, detail="Food vendor not found")
        
    now_str = datetime.utcnow().isoformat()
    order_id = str(uuid.uuid4())
    
    total = sum(item.price * item.quantity for item in request.items)
    
    order = Order(
        orderId=order_id,
        userId=request.userId,
        vendorId=request.vendorId,
        seatNumber=request.seatNumber,
        items=request.items,
        totalAmount=total,
        status="pending",
        createdAt=now_str,
        updatedAt=now_str
    )
    
    order_repo.save(order_id, order)
    return order

@router.get("/orders", response_model=List[Order])
async def list_orders(userId: str, order_repo: OrderRepository = Depends(OrderRepository)):
    all_orders = order_repo.list_all()
    user_orders = [o for o in all_orders if o.userId == userId]
    return user_orders

@router.get("/vendors", response_model=List[Vendor])
async def list_vendors(vendor_repo: VendorRepository = Depends(VendorRepository)):
    return vendor_repo.list_all()
