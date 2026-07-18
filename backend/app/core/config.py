import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Stadium Operating System"
    API_V1_STR: str = "/api/v1"
    
    # Security and CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Google Gemini Config
    GEMINI_API_KEY: str = ""
    USE_MOCK_GEMINI: bool = False
    
    # Firebase Config
    FIREBASE_CREDENTIALS_JSON: str = ""  # Base64 encoded or stringified credentials
    USE_MOCK_FIREBASE: bool = False
    
    # Server configuration
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
