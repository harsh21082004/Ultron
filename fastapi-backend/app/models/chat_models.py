from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# --- Re-usable Base Models ---

class ContentItem(BaseModel):
    type: str
    value: str

class Message(BaseModel):
    sender: str
    content: List[ContentItem]

class StatusResponse(BaseModel):
    status: str
    message: str

# --- Root Endpoint ---

class RootResponse(BaseModel):
    message: str

# --- Chat History Endpoints ---

class HydrateRequest(BaseModel):
    chatId: str
    messages: List[Message]

# --- Chat Streaming Endpoints ---

class StreamRequest(BaseModel):
    message: str
    chatId: str
    # UPDATED: Now accepts a list of base64 strings
    images: List[str] = [] 
    language: Optional[str] = "English"
    user_context: Optional[Dict[str, Any]] = None

# --- Title Generation Endpoints ---

class TitleRequest(BaseModel):
    messages: List[Message]

class TitleResponse(BaseModel):
    title: str