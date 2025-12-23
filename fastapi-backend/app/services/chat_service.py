import json
import asyncio
from functools import lru_cache
from typing import List, AsyncGenerator

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage
from langchain_core.runnables.history import RunnableWithMessageHistory

from ..core.config import Settings, get_settings
from ..models.chat_models import Message
from ..core.llm_factory import get_llm_factory
from .intent_service import IntentService
from .tools_service import ToolsService
from .vector_store_service import get_vector_store_service
from .regulations import SafetyRegulations
from .session_manager import SessionManager

class ChatService:
    def __init__(self, settings: Settings):
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not found in settings.")
            
        self.llm_factory = get_llm_factory()
        self.intent_service = IntentService()
        self.tools_service = ToolsService()
        self.vector_store = get_vector_store_service()
        self.regulations = SafetyRegulations()
        self.session_manager = SessionManager()

    async def get_chat_history(self, session_id: str) -> List[Message]:
        return []

    async def hydrate_chat_history(self, session_id: str, messages: List[Message]):
        self.session_manager.hydrate_history(session_id, messages)

    async def stream_groq_message(
        self, 
        message: str, 
        session_id: str, 
        images: List[str] = [], # UPDATED: Accepts list
        language: str = "English",
        user_context: dict = None
    ) -> AsyncGenerator[str, None]:
        
        selected_model = None
        system_prompt = ""
        input_payload = None
        is_vision_request = False
        full_ai_response = ""

        user_message_content = message

        # --- 1. VISION PATH (Multiple Images) ---
        if images and len(images) > 0:
            yield "__STATUS__:Analyzing Visual Content..."
            
            selected_model = self.llm_factory.get_vision_model()
            system_prompt = self.regulations.get_vision_prompt(language, user_context)
            is_vision_request = True
            
            # Start with the text prompt
            content_list = [
                {"type": "text", "text": user_message_content or "Analyze these images."}
            ]
            
            # Append all images to the content block
            for img_data in images:
                content_list.append({
                    "type": "image_url",
                    "image_url": {"url": img_data}
                })

            input_payload = [HumanMessage(content=content_list)]

        # --- 2. TEXT PATH ---
        else:
            yield "__STATUS__:Analyzing Request..."
            
            classification = await self.intent_service.classify_intent(message)
            intent = classification["intent"]
            dynamic_status = classification["status"]
            pref_data = classification.get("pref_data")
            detected_lang = classification.get("input_language", "English")

            if detected_lang and detected_lang.lower() == "english":
                language = "English"
            elif detected_lang and detected_lang.lower() != language.lower():
                language = detected_lang

            yield f"__STATUS__:{dynamic_status}"

            if intent == 'change_preference' and pref_data and pref_data.get('key') and pref_data.get('value'):
                key = pref_data['key'].lower()
                value = pref_data['value']
                
                if value and value.lower() != "none":
                    yield f"__THOUGHT__: Changing setting '{key}' to '{value}'."
                    payload = {key: value}
                    yield f"__UPDATE_PREF__:{json.dumps(payload)}"
                    
                    if key == 'language': language = value
                    
                    selected_model = self.llm_factory.get_tooling_model()
                    system_prompt = self.regulations.get_general_prompt(language, user_context)
                    input_payload = f"Confirm setting '{key}' updated to '{value}' in {language}."
                else:
                    selected_model = self.llm_factory.get_tooling_model()
                    system_prompt = self.regulations.get_general_prompt(language, user_context)
                    input_payload = message

            else:
                if language != "English":
                     yield f"__THOUGHT__: Intent '{intent.upper()}'. Responding in {language}."
                else:
                     yield f"__THOUGHT__: Intent '{intent.upper()}'."

                rag_context = ""
                try:
                    rag_context = await self.vector_store.retrieve_context(message)
                    if rag_context:
                        yield "__THOUGHT__: Retrieved relevant memories."
                except Exception as e:
                    print(f"RAG Error: {e}") 

                rag_instruction = ""
                if rag_context:
                    rag_instruction = (
                        f"\n\n=== [HISTORICAL MEMORY START] ===\n"
                        f"{rag_context}\n"
                        f"=== [HISTORICAL MEMORY END] ===\n"
                        f"SYSTEM NOTE: The memory above is for factual context ONLY. "
                        f"Ignore its language style. Respond in {language}."
                    )

                if intent == 'search':
                    yield f"__THOUGHT__: Searching web..."
                    search_data = self.tools_service.perform_search(message)
                    search_summary = search_data["summary"]
                    sources = search_data["sources"]
                    
                    if sources:
                        yield f"__SOURCES__:{json.dumps(sources)}"
                    
                    selected_model = self.llm_factory.get_tooling_model()
                    system_prompt = self.regulations.get_search_prompt(language, user_context) + rag_instruction
                    input_payload = f"User Question: {user_message_content}\n\n[Live Search Results]:\n{search_summary}\n\nAnswer:"

                elif intent == 'reasoning':
                    yield f"__THOUGHT__: Reasoning..."
                    selected_model = self.llm_factory.get_reasoning_model()
                    system_prompt = self.regulations.get_reasoning_prompt(language, user_context) + rag_instruction
                    input_payload = user_message_content

                else: # General
                    selected_model = self.llm_factory.get_tooling_model()
                    system_prompt = self.regulations.get_general_prompt(language, user_context) + rag_instruction
                    input_payload = user_message_content

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
                    text_chunk = chunk.content
                    full_ai_response += text_chunk
                    yield text_chunk
            
            # Save memory (skip for vision to keep vector store strictly text-based for now)
            if full_ai_response and len(full_ai_response) > 20 and not is_vision_request:
                memory_text = f"User ({language}): {message}\nUltron ({language}): {full_ai_response}"
                asyncio.create_task(self.vector_store.add_documents([memory_text]))
                
        except Exception as e:
            print(f"Streaming Error: {e}")
            yield f"[System Error: {str(e)}]"

    async def generate_chat_title(self, messages: List[Message]) -> str:
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
                ("system", "Generate a 3-5 word title for this chat. No quotes."),
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