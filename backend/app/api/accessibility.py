from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.models.user import UserPreferences, User
from app.repositories.user_repository import UserRepository
from app.core.logging import logger

router = APIRouter(prefix="/accessibility", tags=["Accessibility Workspace"])

class PreferencesUpdateRequest(BaseModel):
    userId: str
    preferences: UserPreferences
    language: str

class TranslationRequest(BaseModel):
    text: str
    targetLanguage: str

class TranslationResponse(BaseModel):
    translatedText: str
    detectedLanguage: str

@router.put("/preferences", response_model=User)
async def update_preferences(
    request: PreferencesUpdateRequest,
    user_repo: UserRepository = Depends(UserRepository)
):
    logger.info(f"Updating preferences for user: {request.userId}")
    
    user = user_repo.get(request.userId)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")
        
    user.preferences = request.preferences
    user.language = request.language
    user_repo.save(request.userId, user)
    
    return user

@router.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    logger.info(f"Translating text to: {request.targetLanguage}")
    
    from app.core.gemini import generate_stadium_response
    
    translation_prompt = (
        f"Translate the following text strictly to target ISO language code {request.targetLanguage}: "
        f"\"{request.text}\". Return only the translated string."
    )
    try:
        gemini_res = generate_stadium_response(translation_prompt)
        translated = gemini_res.get("content", request.text)
    except Exception:
        translated = request.text

    return TranslationResponse(
        translatedText=translated,
        detectedLanguage="en"
    )
