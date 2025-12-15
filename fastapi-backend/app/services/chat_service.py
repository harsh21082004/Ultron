import os
import json
from functools import lru_cache
from typing import List, AsyncGenerator
from collections import defaultdict
import threading

# LangChain Imports
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.messages import AIMessage, HumanMessage, BaseMessage
import asyncio

# Local Imports
from ..core.config import Settings, get_settings
from ..models.chat_models import Message
# Import Agentic Components
from ..core.llm_factory import get_llm_factory
from .intent_service import IntentService
from .tools_service import ToolsService
from .vector_store_service import VectorStoreService, get_vector_store_service

class ChatService:
    """
    Final Agentic Chat Service.
    Orchestrates the workflow:
    1. Status Updates (__STATUS__)
    2. Reasoning Steps (__THOUGHT__)
    3. Tool Execution (Search -> __SOURCES__)
    4. Final Response Streaming
    """

    def __init__(self, settings: Settings):
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not found in settings.")
            
        # --- Initialize Components ---
        self.llm_factory = get_llm_factory()
        self.intent_service = IntentService()
        self.tools_service = ToolsService()
        self.vector_store = get_vector_store_service()
        
        # Session Management
        self.session_store = defaultdict(InMemoryChatMessageHistory)
        self.store_lock = threading.Lock()

        # --- System Prompts ---
        self.system_prompt_general = (
            "You are Ultron, a highly advanced AI assistant. "
            "Answer directly, concisely, and use Markdown."
        )
        
        self.system_prompt_reasoning = (
            "You are Ultron, operating in REASONING MODE. "
            "Think step-by-step. Break down the problem logically. "
            "Use clear headings for your reasoning steps."
        )

        self.system_prompt_search = (
            "You are Ultron, connected to the live internet. "
            "Use the provided search results to answer the user's question accurately. "
            "Synthesize the information. If results are conflicting, mention that. "
            "Always cite your sources implicitly by referencing the site names in Markdown links."
        )
        
        self.system_prompt_vision = (
            "You are Ultron's Vision Module. "
            "Analyze the provided image carefully. Describe what you see, read text, "
            "and answer specific questions about the visual content."
        )

    def get_session_history(self, session_id: str) -> InMemoryChatMessageHistory:
        return self.session_store[session_id]

    async def hydrate_chat_history(self, session_id: str, messages: List[Message]):
        """
        Restores chat history from the database into memory.
        """
        with self.store_lock:
            history = self.get_session_history(session_id)
            history.clear()

            for msg in messages:
                content_blocks = []
                for item in msg.content:
                    if item.type == 'text':
                        content_blocks.append({"type": "text", "text": item.value})
                    elif item.type in ['image', 'image_url']:
                        content_blocks.append({"type": "image_url", "image_url": {"url": item.value}})
                
                if not content_blocks: continue

                if msg.sender == 'user':
                    history.add_message(HumanMessage(content=content_blocks))
                elif msg.sender == 'ai':
                    # Simplified text reconstruction for history to save tokens
                    text_only = " ".join([b['text'] for b in content_blocks if b.get('type') == 'text'])
                    history.add_message(AIMessage(content=text_only))

    async def stream_groq_message(self, message: str, session_id: str, image_data: str = None) -> AsyncGenerator[str, None]:
        """
        Orchestration Loop:
        Decides the agent path, updates status, performs tools, and streams response.
        """
        selected_model = None
        system_prompt = ""
        input_payload = None
        is_vision_request = False

        # --- 1. VISION PATH (Highest Priority) ---
        if image_data:
            yield "__STATUS__:Analyzing Visual Content..."
            yield "__THOUGHT__: Image detected. Initializing Vision Module."
            
            selected_model = self.llm_factory.get_vision_model()
            system_prompt = self.system_prompt_vision
            is_vision_request = True
            
            yield "__THOUGHT__: Processing pixel data and extracting features."
            content_list = [
                {"type": "text", "text": message or "Analyze this image."},
                {"type": "image_url", "image_url": {"url": image_data}}
            ]
            input_payload = [HumanMessage(content=content_list)]

        # --- 2. TEXT PATH (RAG + Intent + Search) ---
        else:
            yield "__STATUS__:Analyzing Request..."
            
            # A. Intent Classification
            # Get structured intent with dynamic status from LLM
            classification = await self.intent_service.classify_intent(message)
            intent = classification["intent"]
            dynamic_status = classification["status"]

            # Emit the LLM-generated status
            yield f"__STATUS__:{dynamic_status}"
            yield f"__THOUGHT__: Intent identified as '{intent.upper()}'. Routing to appropriate agent."

            # B. RAG Retrieval (Parallel-ish logic)
            rag_context = ""
            try:
                rag_context = await self.vector_store.retrieve_context(message)
                if rag_context:
                    pass
                    # yield "__THOUGHT__: Retrieved relevant long-term memory context."
            except Exception:
                pass # Fail silently on RAG

            rag_instruction = ""
            if rag_context:
                rag_instruction = f"\n\n[MEMORY]:\n{rag_context}\n"

            # C. Branching based on Intent
            if intent == 'search':
                yield f"__THOUGHT__: Initiating web search for: '{message}'"
                
                # Perform Search
                search_data = self.tools_service.perform_search(message)
                search_summary = search_data["summary"]
                sources = search_data["sources"]

                if sources:
                    yield f"__THOUGHT__: Found {len(sources)} relevant sources."
                    # Emit Sources for Frontend UI
                    yield f"__SOURCES__:{json.dumps(sources)}"
                else:
                    yield "__THOUGHT__: No direct external sources found."
                
                selected_model = self.llm_factory.get_tooling_model()
                system_prompt = self.system_prompt_search + rag_instruction
                
                # Inject search results into the prompt
                input_payload = f"User Question: {message}\n\n[Live Search Results]:\n{search_summary}\n\nAnswer:"

            elif intent == 'reasoning':
                yield f"__THOUGHT__: Activating Chain-of-Thought processing for complex query."
                
                selected_model = self.llm_factory.get_reasoning_model()
                system_prompt = self.system_prompt_reasoning + rag_instruction
                input_payload = message

            else:
                # General Chat
                yield f"__THOUGHT__: Generating conversational response."
                selected_model = self.llm_factory.get_tooling_model()
                system_prompt = self.system_prompt_general + rag_instruction
                input_payload = message

        # --- 3. EXECUTION PHASE ---
        
        if is_vision_request:
            prompt_template = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                MessagesPlaceholder(variable_name="chat_history"),
                MessagesPlaceholder(variable_name="input"),
            ])
        else:
            prompt_template = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
            ])

        chain = RunnableWithMessageHistory(
            prompt_template | selected_model,
            self.get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
        )

        config = {"configurable": {"session_id": session_id}}

        try:
            async for chunk in chain.astream({"input": input_payload}, config=config):
                if chunk.content:
                    data_to_save = chunk.content
                    with open("output.txt", "a", encoding="utf-8") as file:
                        file.write(data_to_save)
                    print(chunk.content)
                    yield chunk.content
        except Exception as e:
            print(f"Streaming Error: {e}")
            yield f"[System Error: {str(e)}]"

    async def generate_chat_title(self, messages: List[Message]) -> str:
        """
        Generates a concise title using the fast model.
        """
        try:
            text_parts = []
            for msg in messages[-4:]: 
                for item in msg.content:
                    if item.type == 'text': 
                        text_parts.append(item.value)
            
            conversation_summary = " ".join(text_parts)[:1000]
            if not conversation_summary: return "New Chat"

            model = self.llm_factory.get_tooling_model()
            
            title_prompt = ChatPromptTemplate.from_messages([
                ("system", "Generate a very concise 3-5 word title for this conversation context. Return ONLY the title."),
                ("user", "{context}")
            ])
            
            chain = title_prompt | model
            response = await chain.ainvoke({"context": conversation_summary})
            return response.content.strip().replace('"', '')
            
        except Exception as e:
            print(f"Error generating title: {e}")
            return "New Chat"

@lru_cache()
def get_chat_service() -> ChatService:
    settings = get_settings()
    return ChatService(settings)