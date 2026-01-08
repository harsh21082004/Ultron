# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List

class Settings(BaseSettings):
    """
    Manages application settings loaded from environment variables.
    """
    # --- App Config ---
    PROJECT_NAME: str = "Ultron AI Chatbot API"
    PROJECT_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/py"

    # --- CORS Config ---
    # Inside fastapi-backend/.env
    CORS_ORIGINS: List[str] = ["http://localhost:4200", "http://localhost:3000"]

    # --- Pydantic Settings Config ---
    # This tells pydantic-settings to load from a .env file
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        case_sensitive=False,
        extra='ignore' # Ignore extra fields in .env
    )

    # --- API Keys ---
    GROQ_API_KEY: str
    OPENAI_API_KEY: str | None = None
    PINECONE_API_KEY: str | None = None
    PINECONE_INDEX_NAME: str = "ultron-memory"
    GOOGLE_API_KEY: str | None = None
    GOOGLE_CSE_ID: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        case_sensitive=False,
        extra='ignore'
    )

@lru_cache()
def get_settings() -> Settings:
    """
    Returns a cached instance of the Settings object.
    Using lru_cache ensures the .env file is read only once.
    """
    return Settings()