from datetime import datetime
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import User, Profile, UserPreferences
from app.models.session import Session
from app.repositories.user_repository import UserRepository
from app.repositories.ticket_repository import TicketRepository
from app.repositories.session_repository import SessionRepository
from app.core.logging import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    role: str  # spectator, vendor, security, operations, transport
    ticketId: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    name: Optional[str] = None

class LoginResponse(BaseModel):
    token: str
    user: User
    sessionId: str

@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    user_repo: UserRepository = Depends(UserRepository),
    ticket_repo: TicketRepository = Depends(TicketRepository),
    session_repo: SessionRepository = Depends(SessionRepository)
):
    logger.info(f"Login request received for role: {request.role}")
    
    user_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat()
    
    if request.role == "spectator":
        if not request.ticketId:
            raise HTTPException(status_code=400, detail="Ticket ID is required for spectators")
        
        # Verify ticket
        ticket = ticket_repo.get(request.ticketId)
        if not ticket:
            # For hackathon/MVP ease, let's auto-generate a ticket if it doesn't exist to prevent blocking tests,
            # but let's log a warning or enforce validation.
            # We'll support standard validation, but fallback to a simulated check.
            logger.warning(f"Ticket {request.ticketId} not found, mock seeding ticket.")
            raise HTTPException(status_code=401, detail="Invalid Ticket ID")
        
        # Create user profile
        user_name = request.name or f"Fan-{request.ticketId[-4:]}"
        user_profile = Profile(name=user_name, email=request.email)
        user = User(
            id=user_id,
            role="spectator",
            profile=user_profile,
            ticketId=request.ticketId,
            createdAt=now_str
        )
    
    else:  # staff roles
        if not request.email or not request.password:
            raise HTTPException(status_code=400, detail="Email and password are required for staff")
        
        # Validate credentials from Firestore credentials collection
        from app.core.firebase import db
        cred_ref = db.collection("credentials").document(request.email).get()
        if not cred_ref.exists:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        stored_password = cred_ref.to_dict().get("password")
        if request.password != stored_password:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
            
        # Check if user already exists by email
        existing_user = user_repo.get_by_email(request.email)
        if existing_user:
            user = existing_user
            user_id = user.id
        else:
            user_name = request.name or request.email.split("@")[0].capitalize()
            user_profile = Profile(name=user_name, email=request.email)
            user = User(
                id=user_id,
                role=request.role,
                profile=user_profile,
                createdAt=now_str
            )
            
    # Save user to DB
    user_repo.save(user.id, user)
    
    # Initialize workspace session
    session = Session(
        sessionId=session_id,
        userId=user.id,
        role=user.role,
        activeAgentId="master",
        createdAt=now_str,
        updatedAt=now_str
    )
    session_repo.save(session_id, session)
    
    return LoginResponse(
        token=f"mock-jwt-token-{user.id}",
        user=user,
        sessionId=session_id
    )
