import json
from functools import lru_cache
from typing import List, AsyncGenerator

# LangChain Imports
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory

# Local Imports
from ..core.config import Settings, get_settings
from ..models.chat_models import Message
from ..core.llm_factory import get_llm_factory

# Feature Services
from .intent_service import IntentService
from .tools_service import ToolsService
from .vector_store_service import get_vector_store_service

# NEW: Modular Components
from .regulations import SafetyRegulations
from .session_manager import SessionManager

class ChatService:
    """
    Final Agentic Chat Service.
    Orchestrates the workflow by delegating to specialized managers.
    """

    def __init__(self, settings: Settings):
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not found in settings.")
            
        # --- Initialize Core Components ---
        self.llm_factory = get_llm_factory()
        self.intent_service = IntentService()
        self.tools_service = ToolsService()
        self.vector_store = get_vector_store_service()
        
        # --- Initialize Helpers ---
        self.regulations = SafetyRegulations()
        self.session_manager = SessionManager()

    async def hydrate_chat_history(self, session_id: str, messages: List[Message]):
        """Delegates hydration to SessionManager"""
        self.session_manager.hydrate_history(session_id, messages)

    async def stream_groq_message(self, message: str, session_id: str, image_data: str = None) -> AsyncGenerator[str, None]:
        """
        Orchestration Loop:
        1. Status -> 2. Reasoning -> 3. Tool/Search -> 4. Answer
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
            system_prompt = self.regulations.vision_prompt
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
            classification = await self.intent_service.classify_intent(message)
            intent = classification["intent"]
            dynamic_status = classification["status"]

            yield f"__STATUS__:{dynamic_status}"
            yield f"__THOUGHT__: Intent identified as '{intent.upper()}'. Routing to appropriate agent."

            # B. RAG Retrieval
            rag_context = ""
            try:
                rag_context = await self.vector_store.retrieve_context(message)
            except Exception:
                pass 

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
                
                formatted_search_context = ""

                if sources:
                    yield f"__THOUGHT__: Found {len(sources)} relevant sources."
                    yield f"__SOURCES__:{json.dumps(sources)}"

                    snippets = search_summary.split("\n\n")
                    numbered_results = []
                    for i, snippet in enumerate(snippets):
                        numbered_results.append(f"[{i+1}] {snippet}")
                    
                    formatted_search_context = "\n\n".join(numbered_results)
                else:
                    yield "__THOUGHT__: No direct external sources found."
                    formatted_search_context = "No results found."
                
                selected_model = self.llm_factory.get_tooling_model()
                system_prompt = self.regulations.search_prompt + rag_instruction
                input_payload = f"User Question: {message}\n\n[Live Search Results]:\n{formatted_search_context}\n\nAnswer:"

            elif intent == 'reasoning':
                yield f"__THOUGHT__: Activating Chain-of-Thought processing for complex query."
                selected_model = self.llm_factory.get_reasoning_model()
                system_prompt = self.regulations.reasoning_prompt + rag_instruction
                input_payload = message

            else:
                yield f"__THOUGHT__: Generating conversational response."
                selected_model = self.llm_factory.get_tooling_model()
                system_prompt = self.regulations.general_prompt + rag_instruction
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
            self.session_manager.get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
        )

        config = {"configurable": {"session_id": session_id}}

        yield "__ANSWER__:" 

        try:
            async for chunk in chain.astream({"input": input_payload}, config=config):
                if chunk.content:
                    yield chunk.content
        except Exception as e:
            print(f"Streaming Error: {e}")
            yield f"[System Error: {str(e)}]"

    async def generate_chat_title(self, messages: List[Message]) -> str:
        """Generates a concise title using the fast model."""
        try:
            text_parts = []
            for msg in messages[-4:]: 
                for item in msg.content:
                    if item.type == 'text': 
                        text_parts.append(item.value)
            
            conversation_summary = " ".join(text_parts)[:1000]
            if not conversation_summary: return "New Chat"

            model = self.llm_factory.get_tooling_model()
            
            # Note: Title generation is purely functional, doesn't need strict safety regulations injected
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