from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, List
from app.models.transport import TransportConfig, ExitStrategy
from app.repositories.transport_repository import TransportRepository
from app.api.security_headers import verify_role
from app.core.logging import logger

router = APIRouter(prefix="/transportation", tags=["Transportation Workspace"])

class TransportStatusResponse(BaseModel):
    traffic: Dict[str, str]
    parking: Dict[str, int]
    exitPlan: Dict[str, ExitStrategy]

class ExitStrategyUpdateRequest(BaseModel):
    tier: str
    strategy: ExitStrategy

@router.get("/status", response_model=TransportStatusResponse, dependencies=[Depends(verify_role(["spectator", "vendor", "security", "operations", "transport"]))])
async def get_status(transport_repo: TransportRepository = Depends(TransportRepository)):
    logger.info("Fetching transport status metrics")
    
    config = transport_repo.get("current_status")
    if not config:
        now_str = datetime.utcnow().isoformat()
        config = TransportConfig(
            traffic={"Main Access Road": "heavy", "Expressway Exit": "moderate", "Subway Line A": "light"},
            parking={"totalSpots": 2000, "availableSpots": 850, "reservedSpots": 200},
            exitPlan={
                "VVIP": ExitStrategy(gate="Gate A VIP Bypass", allowedTiers=["VVIP", "VIP"], estimatedTime="10 mins"),
                "General": ExitStrategy(gate="Gates B, C, D", allowedTiers=["General"], estimatedTime="35 mins")
            },
            updatedAt=now_str
        )
        transport_repo.save("current_status", config)
        
    return TransportStatusResponse(
        traffic=config.traffic,
        parking=config.parking,
        exitPlan=config.exitPlan
    )

@router.put("/exit-plan", response_model=TransportConfig, dependencies=[Depends(verify_role(["transport", "operations"]))])
async def update_exit_plan(
    request: ExitStrategyUpdateRequest,
    transport_repo: TransportRepository = Depends(TransportRepository)
):
    logger.info(f"Updating exit strategy for tier: {request.tier}")
    
    config = transport_repo.get("current_status")
    if not config:
        raise HTTPException(status_code=404, detail="Transport configurations not found")
        
    config.exitPlan[request.tier] = request.strategy
    config.updatedAt = datetime.utcnow().isoformat()
    transport_repo.save("current_status", config)
    
    return config

