# app/models/chat_models.py
from pydantic import BaseModel
from typing import List, Dict, Any

# --- Re-usable Base Models ---

class ContentItem(BaseModel):
    """
    Represents a single item in the content list.
    (Assuming this structure based on your request)
    """
    type: str
    value: str

class Message(BaseModel):
    """
    Represents a single chat message.
    (Assuming this structure based on your request)
    """
    sender: str
    content: List[ContentItem]

class StatusResponse(BaseModel):
    """
    A generic response for operations that report success/failure.
    """
    status: str
    message: str

# --- Root Endpoint ---

class RootResponse(BaseModel):
    message: str

# --- Chat History Endpoints ---

class HydrateRequest(BaseModel):
    chatId: str
    messages: List[Message] # Use the Message model for strong typing

# --- Chat Streaming Endpoints ---

class StreamRequest(BaseModel):
    message: str
    chatId: str

# --- Title Generation Endpoints ---

class TitleRequest(BaseModel):
    messages: List[Message] # Use the Message model

class TitleResponse(BaseModel):
    title: str