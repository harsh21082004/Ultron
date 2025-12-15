# app/api/api_router.py
from fastapi import APIRouter
from .endpoints import chat, vision, audio, translate

api_router = APIRouter()

# Include the chat router
# All routes from chat.py will now be prefixed with /chat
api_router.include_router(chat.router, prefix="/chat")
api_router.include_router(vision.router, prefix="/vision")
api_router.include_router(audio.router, prefix="/audio")
api_router.include_router(translate.router, prefix="/translate")

# You could add more routers here later:
# from .endpoints import users
# api_router.include_router(users.router, prefix="/users", tags=["Users"])