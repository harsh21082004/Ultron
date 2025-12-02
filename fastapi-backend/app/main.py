# app/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from .core.config import Settings, get_settings
from .api.api_router import api_router
from .models.chat_models import RootResponse

# --- App Creation ---

# Load settings using dependency injection
# Note: We depend on the *function* get_settings
settings: Settings = get_settings()

# Initialize the FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="An API for the Ultron AI Chatbot powered by Groq and LangChain.",
    openapi_url=f"{settings.API_PREFIX}/openapi.json", # Standardized OpenAPI path
    docs_url=f"{settings.API_PREFIX}/docs", # Standardized docs path
    root_path="/api/py"
)

# --- Middleware ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS, # Load from config
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Routers ---

# Include the main API router
# All routes from api_router will be prefixed with /api
app.include_router(api_router, prefix="")

# --- Root Endpoint ---

@app.get("/", response_model=RootResponse, tags=["Root"])
async def read_root() -> RootResponse:
    """
    A simple root endpoint to confirm the API is running.
    """
    return RootResponse(message=f"Welcome to the {settings.PROJECT_NAME}!")