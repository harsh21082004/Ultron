from collections import defaultdict
import threading
from typing import List

# LangChain Imports
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.messages import AIMessage, HumanMessage

# Local Imports
from ..models.chat_models import Message

class SessionManager:
    """
    Manages in-memory chat sessions and handles the hydration 
    of history from the persistent database.
    """
    
    def __init__(self):
        # Thread-safe session storage
        self.session_store = defaultdict(InMemoryChatMessageHistory)
        self.store_lock = threading.Lock()

    def get_session_history(self, session_id: str) -> InMemoryChatMessageHistory:
        """Retrieves or creates a session history object."""
        return self.session_store[session_id]

    def hydrate_history(self, session_id: str, messages: List[Message]):
        """
        Restores chat history from the DB format (Pydantic models) 
        into LangChain format (HumanMessage/AIMessage).
        """
        with self.store_lock:
            history = self.get_session_history(session_id)
            history.clear()

            for msg in messages:
                content_blocks = []
                
                # Parse content blocks (Text vs Image)
                for item in msg.content:
                    if item.type == 'text':
                        content_blocks.append({"type": "text", "text": item.value})
                    elif item.type in ['image', 'image_url']:
                        content_blocks.append({"type": "image_url", "image_url": {"url": item.value}})
                
                if not content_blocks: 
                    continue

                # Add to history based on sender
                if msg.sender == 'user':
                    history.add_message(HumanMessage(content=content_blocks))
                elif msg.sender == 'ai':
                    # Simplified text reconstruction for history to save tokens context window
                    text_only = " ".join([b['text'] for b in content_blocks if b.get('type') == 'text'])
                    history.add_message(AIMessage(content=text_only))