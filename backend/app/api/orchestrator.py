from datetime import datetime
import uuid
import re
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.models.session import Session, Message, ActionItem, CoordinateLocation
from app.repositories.session_repository import SessionRepository
from app.repositories.user_repository import UserRepository
from app.core.gemini import generate_stadium_response
from app.core.logging import logger

router = APIRouter(prefix="/orchestrator", tags=["Master Orchestrator"])

class MessageRequest(BaseModel):
    sessionId: str
    message: str
    currentLocation: Optional[CoordinateLocation] = None
    language: Optional[str] = "en"

class MessageResponse(BaseModel):
    sessionId: str
    responseMessage: str
    activeAgent: str
    suggestedActions: List[ActionItem] = Field(default_factory=list)

class SpeechToTextResponse(BaseModel):
    text: str
    language: str

class TextToSpeechRequest(BaseModel):
    text: str
    language: str

class TextToSpeechResponse(BaseModel):
    audioContent: str  # Base64 audio representation

def sanitize_input(text: str) -> str:
    # Remove HTML tags and javascript hrefs
    clean = re.sub(r'<[^>]*?>', '', text)
    clean = re.sub(r'javascript:', '', clean, flags=re.IGNORECASE)
    return clean.strip()

def check_prompt_injection(text: str) -> bool:
    injection_patterns = [
        r"ignore\s+(?:all\s+)?previous\s+instructions",
        r"ignore\s+(?:all\s+)?system\s+directives",
        r"ignore\s+(?:all\s+)?instructions",
        r"system\s+directive:",
        r"forget\s+(?:everything|what\s+i\s+said)",
        r"you\s+are\s+now\s+a",
        r"override\s+system"
    ]
    lowered = text.lower()
    for pattern in injection_patterns:
        if re.search(pattern, lowered):
            return True
    return False

@router.post("/message", response_model=MessageResponse)
async def process_message(
    request: MessageRequest,
    session_repo: SessionRepository = Depends(SessionRepository),
    user_repo: UserRepository = Depends(UserRepository)
):
    logger.info(f"Processing message for session: {request.sessionId}")
    
    session = session_repo.get(request.sessionId)
    if not session:
        raise HTTPException(status_code=404, detail="Active conversation session not found")
        
    user = user_repo.get(session.userId)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")
        
    # 1. Check prompt injection and sanitize input
    if check_prompt_injection(request.message):
        logger.warning(f"Prompt injection attempt intercepted from user={user.id} in session={request.sessionId}")
        raise HTTPException(status_code=400, detail="Security Warning: Potential prompt injection or system override attempt detected.")
        
    sanitized_message = sanitize_input(request.message)
    if not sanitized_message:
        raise HTTPException(status_code=400, detail="Sanitization Error: Input message cannot be empty or contain only HTML tags.")
        
    now_str = datetime.utcnow().isoformat()
    
    # Append user message
    user_msg = Message(
        messageId=str(uuid.uuid4()),
        sender="user",
        content=sanitized_message,
        timestamp=now_str
    )
    session.messages.append(user_msg)
    
    # 2. Invoke Gemini Orchestration Retry Pipeline
    gemini_result = generate_stadium_response(sanitized_message)
    
    bot_content = gemini_result.get("content", "I encountered an issue processing your request.")
    active_agent = gemini_result.get("next_agent_id", "master")
    
    # Parse suggested actions
    actions = []
    raw_actions = gemini_result.get("suggested_actions", [])
    for action in raw_actions:
        actions.append(ActionItem(type=action["type"], payload=action.get("payload", {})))
        
    # Update Session Context
    updated_context = gemini_result.get("updated_context", {})
    if updated_context:
        for k, v in updated_context.items():
            if k == "emergencySOS":
                session.context.emergencySOS = bool(v)
            elif k == "lastIntent":
                session.context.lastIntent = str(v)
            elif k == "currentOrderId":
                session.context.currentOrderId = str(v)
                
    # Update current location if provided
    if request.currentLocation:
        session.context.currentLocation = request.currentLocation
        
    # Append orchestrator response
    bot_msg = Message(
        messageId=str(uuid.uuid4()),
        sender="orchestrator",
        agentId=active_agent,
        content=bot_content,
        timestamp=now_str,
        suggestedActions=actions
    )
    session.messages.append(bot_msg)
    session.activeAgentId = active_agent
    session.updatedAt = now_str
    
    # Save session
    session_repo.save(session.sessionId, session)
    
    return MessageResponse(
        sessionId=session.sessionId,
        responseMessage=bot_content,
        activeAgent=active_agent,
        suggestedActions=actions
    )

@router.post("/speech-to-text", response_model=SpeechToTextResponse)
async def speech_to_text(audio_base64: Dict[str, str]):
    # Mock translation/STT response
    return SpeechToTextResponse(
        text="Mock transcription of speech audio data",
        language="en"
    )

@router.post("/text-to-speech", response_model=TextToSpeechResponse)
async def text_to_speech(request: TextToSpeechRequest):
    # Mock TTS audio byte output (Base64 placeholder)
    return TextToSpeechResponse(
        audioContent="SGVsbG8sIHRoaXMgaXMgYSBtb2NrIGF1ZGlvIGZpbGUu"
    )

