from pydantic import BaseModel
from typing import List, Optional, Dict, Any


# --- Re-usable Base Models ---

class ContentItem(BaseModel):
    """
    Represents a single item in the content list (Text or Image).
    """
    type: str
    value: str

class Message(BaseModel):
    """
    Represents a single chat message with structured content.
    """
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
    # CORRECTED: Image must be Optional, defaulting to None
    image: Optional[str] = None
    language: Optional[str] = "English"
    user_context: Optional[Dict[str, Any]] = None

# --- Title Generation Endpoints ---

class TitleRequest(BaseModel):
    messages: List[Message]

class TitleResponse(BaseModel):
    title: str