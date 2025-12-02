# app/api/api_router.py
from fastapi import APIRouter
from .endpoints import chat

api_router = APIRouter()

# Include the chat router
# All routes from chat.py will now be prefixed with /chat
api_router.include_router(chat.router, prefix="/chat")

# You could add more routers here later:
# from .endpoints import users
# api_router.include_router(users.router, prefix="/users", tags=["Users"])