# app/services/chat_service.py
import os
from functools import lru_cache
from typing import List
from collections import defaultdict
import threading # For thread-safe session store

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.messages import AIMessage, HumanMessage

from ..core.config import Settings, get_settings
from ..models.chat_models import Message, ContentItem # Import our Pydantic model

class ChatService:
    """
    Encapsulates all AI logic and state management for the chatbot.
    This class is intended to be used as a singleton dependency.
    """

    def __init__(self, settings: Settings):
        """
        Initializes the service, loading models and prompts once.
        """
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not found in settings.")
            
        # --- 1. Initialize the AI Model ---
        self.model = ChatGroq(
            groq_api_key=settings.GROQ_API_KEY,
            model_name="llama-3.3-70b-versatile", 
            temperature=0.7
        )

        # --- 2. Define Core Prompt ---
        self.core_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful AI assistant named Ultron. Your goal is to be friendly, informative, and provide accurate answers based on the conversation history. Format tables using markdown with clear separators."),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
        ])

        # --- 3. Define Title Generation Prompt ---
        self.title_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful assistant. Your task is to generate a concise, 2-5 word title for the following conversation. Do not add any prefix like 'Title:'. Do not use quotes. Just return the plain text title."),
            ("user", "{conversation_history}")
        ])

        # --- 4. Create Chains ---
        self.title_chain = self.title_prompt | self.model
        
        # The core runnable chain
        runnable = self.core_prompt | self.model

        # --- 5. Initialize Thread-Safe Session Store ---
        # A simple global dict is NOT production-ready.
        # It's not thread-safe and won't work with multiple server workers.
        # A defaultdict is a cleaner in-memory store.
        # For true production, this should be a Redis or SQL backend.
        self.session_store = defaultdict(InMemoryChatMessageHistory)
        self.store_lock = threading.Lock() # To safely clear history

        # --- 6. Create the main chain with history ---
        self.chain_with_history = RunnableWithMessageHistory(
            runnable,
            self.get_session_history, # Pass the *method* as the factory
            input_messages_key="input",
            history_messages_key="chat_history",
        )

    def get_session_history(self, session_id: str) -> InMemoryChatMessageHistory:
        """
        Retrieves the message history for a given session ID.
        Uses defaultdict to automatically create a new history if one doesn't exist.
        """
        return self.session_store[session_id]

    async def hydrate_chat_history(self, session_id: str, messages: List[Message]):
        """
        Loads a chat history from the frontend into the AI's session memory.
        """
        with self.store_lock:
            history = self.get_session_history(session_id)
            history.clear()

            for msg in messages:
                # --- CHANGED: Extract simple text from the content list ---
                text_content = ""
                for item in msg.content:
                    if item.type == 'text':
                        text_content = item.value
                        break # Found the text, stop looking
                
                if not text_content:
                    continue # Skip messages with no text content

                if msg.sender == 'user':
                    history.add_message(HumanMessage(content=text_content))
                elif msg.sender == 'ai':
                    history.add_message(AIMessage(content=text_content))

    def get_chat_history(self, session_id: str) -> List[Message]:
        """
        Retrieves the message history and formats it using our Pydantic model.
        """
        history = self.get_session_history(session_id)
        formatted_messages = []
        for msg in history.messages:
            
            # --- CHANGED: Wrap the simple string back into the complex List[ContentItem] ---
            # This is the reverse of hydrate_chat_history
            content_list = [ContentItem(type="text", value=msg.content)]
            
            if isinstance(msg, HumanMessage):
                formatted_messages.append(Message(sender="user", content=content_list))
            elif isinstance(msg, AIMessage):
                formatted_messages.append(Message(sender="ai", content=content_list))
        return formatted_messages

    async def stream_groq_message(self, message: str, session_id: str):
        """
        Streams the Groq response token by token.
        """
        config = {"configurable": {"session_id": session_id}}
        
        async for chunk in self.chain_with_history.astream({"input": message}, config=config):
            # chunk is an AIMessageChunk object
            if chunk.content:
                yield chunk.content

    async def generate_chat_title(self, messages: List[Message]) -> str:
        """
        Generates a concise title for a chat history.
        """
        print(messages)
        
        # --- CHANGED: Extract simple text for the prompt string ---
        conversation_parts = []
        for msg in messages:
            text_content = ""
            for item in msg.content:
                if item.type == 'text':
                    text_content = item.value
                    break
            
            if text_content:
                conversation_parts.append(f"{msg.sender}: {text_content}")
        
        conversation_str = "\n".join(conversation_parts)
        # --- End of change ---
        
        if not conversation_str.strip():
            return "New Chat"

        try:
            response_message = await self.title_chain.ainvoke({"conversation_history": conversation_str})
            title = response_message.content.strip().replace('"', '').split('\n')[0]
            return title if title else "New Chat"
        except Exception as e:
            print(f"Error generating title: {e}")
            return "New Chat"

# --- Singleton Dependency ---
# This part is crucial for FastAPI.
# We create one instance of the service when the app starts.

@lru_cache()
def get_chat_service() -> ChatService:
    """
    Dependency injector function.
    
    Using lru_cache ensures that ChatService is initialized only ONCE,
    creating a singleton instance.
    """
    settings = get_settings()
    return ChatService(settings)