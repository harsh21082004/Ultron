import json
import asyncio
import logging
import re
from functools import lru_cache
from typing import List, AsyncGenerator

# [CRITICAL FIX] Added ToolMessage to imports
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.prompts.chat import ChatPromptTemplate

from ..core.config import Settings, get_settings
from ..models.chat_models import Message
from ..core.llm_factory import get_llm_factory
from .vector_store_service import get_vector_store_service
from .session_manager import SessionManager
from ..core.agent_graph import AgentGraphFactory
from ..services.image_service import ImageService
from ..services.youtube_service import YoutubeService

logger = logging.getLogger("uvicorn.error")

class ChatService:
    def __init__(self, settings: Settings):
        self.llm_factory = get_llm_factory()
        self.vector_store = get_vector_store_service()
        self.session_manager = SessionManager()
        self.agent_factory = AgentGraphFactory()
        self.image_service = ImageService()
        self.youtube_service = YoutubeService()

    async def get_chat_history(self, session_id: str) -> List[Message]:
        return []

    async def hydrate_chat_history(self, session_id: str, messages: List[Message]):
        self.session_manager.hydrate_history(session_id, messages)

    async def stream_groq_message(
        self, 
        message: str, 
        session_id: str, 
        images: List[str] = [],
        language: str = "English",
        user_context: dict = None
    ) -> AsyncGenerator[str, None]:
        
        full_ai_response = ""
        
        # Context Prep
        aspect_ratio = "16:9"
        if user_context and 'screenWidth' in user_context:
            w = user_context.get('screenWidth', 1920)
            h = user_context.get('screenHeight', 1080)
            if h > w: aspect_ratio = "9:16"
        
        user_info_str = ""
        if user_context:
            name = user_context.get('name', 'User')
            prefs = user_context.get('preferences', {})
            user_info_str = f"User Name: {name}. User Preferences: {json.dumps(prefs)}."

        # 1. Vision Path
        if images and len(images) > 0 and (not message or len(message) < 50):
            yield "__STATUS__:Analyzing Visual Content..."
            yield "__ICON__:image"
            vision_model = self.llm_factory.get_vision_model()
            content_list = [{"type": "text", "text": message or "Analyze this image in detail."}]
            for img in images:
                content_list.append({"type": "image_url", "image_url": {"url": img}})
            
            user_msg = HumanMessage(content=content_list)
            yield "__ANSWER__:" 
            async for chunk in vision_model.astream([user_msg]):
                if chunk.content:
                    full_ai_response += chunk.content
                    yield chunk.content
            return

        # 2. Agent Path
        yield "__STATUS__:Orchestrating Agents..."
        yield "__ICON__:logo"
        
        try:
            graph = await self.agent_factory.create_graph()
            history = self.session_manager.get_session_history(session_id)
            
            # [FIX] SystemMessage is now correctly imported
            system_msg = SystemMessage(content=(
                f"User Language: {language}. {user_info_str}\n"
                "RULES: 1. Summarize search results. 2. Cite sources [1]. 3. Use provided web images if valid."
            ))
            
            if images and len(images) > 0:
                content_list = [{"type": "text", "text": message or "Analyze this image."}]
                for img in images: content_list.append({"type": "image_url", "image_url": {"url": img}})
                user_msg = HumanMessage(content=content_list)
            else:
                user_msg = HumanMessage(content=message)

            current_messages = [system_msg] + history.messages + [user_msg]
            
            # --- STRICT STATE MACHINE VARIABLES ---
            is_answering = False  # Have we sent the __ANSWER__ tag yet?
            buffer = ""
            thought_tag = "THOUGHT:"
            pending_image_prompt = None
            is_thought_mode = True # Start expecting a thought

            async for event in graph.astream_events({"messages": current_messages}, version="v1"):
                kind = event["event"]
                metadata = event.get("metadata") or {} 
                node_name = metadata.get("langgraph_node", "")
                name = event.get("name", "")

                # A. Supervisor Logic
                if kind == "on_chat_model_stream" and node_name == "supervisor":
                    pass

                # B. Agent Status & Icons
                elif kind == "on_chain_start" and node_name in ["researcher", "coder", "artist", "visionary", "general"]:
                    agent_display = node_name.capitalize()
                    yield f"__AGENT__:{agent_display}"
                    yield f"__STATUS__:{agent_display} is working..."
                    
                    if node_name == "coder": yield "__ICON__:code"
                    elif node_name == "artist": yield "__ICON__:image"
                    elif node_name == "researcher": yield "__ICON__:logo"
                    
                    if node_name == "artist": yield "__SKELETON_START__:"

                # C. Tool Execution Icons
                elif kind == "on_tool_start":
                    if name in ["search_youtube", "get_video_transcript", "get_video_details"]:
                        yield "__ICON__:youtube"
                        yield "__STATUS__:Accessing YouTube..."
                    elif name == "google_search":
                        yield "__ICON__:google"
                        yield "__STATUS__:Searching Google..."
                    elif name == "generate_image":
                        yield "__ICON__:image"
                        yield "__STATUS__:Generating Image..."
                        yield "__SKELETON_START__:"

                elif kind == "on_tool_end" and name == "generate_image":
                     yield "__SKELETON_END__:"
                     image_markdown = event["data"].get("output", "")
                     if "data:image" in image_markdown:
                         if not is_answering:
                             yield "__ANSWER__:"
                             is_answering = True
                         yield f"\n{image_markdown}\n"
                         full_ai_response += image_markdown

                # D. Researcher Output (Log Thoughts & Sources)
                elif kind == "on_chain_end" and node_name == "researcher":
                    try:
                        output_data = event["data"].get("output")
                        # Handle ToolMessages in history
                        if output_data and isinstance(output_data, dict) and "messages" in output_data:
                            for m in output_data["messages"]:
                                # [FIX] ToolMessage imported correctly now
                                if isinstance(m, ToolMessage):
                                    content = m.content
                                    # Extract JSON sources if present
                                    if "sources" in content:
                                        # Regex to find JSON array even if surrounded by text
                                        match = re.search(r'\[\s*\{.*?"sources".*\}\s*\]', content, re.DOTALL) 
                                        if match:
                                            # It's already json array? No, usually search returns list of dicts or a dict
                                            pass
                                        
                                        # Standard retrieval
                                        if isinstance(content, str) and "sources" in content:
                                            # Try to parse the whole thing or find the JSON part
                                            try:
                                                start = content.find("{")
                                                if start != -1:
                                                    parsed = json.loads(content[start:])
                                                    if "sources" in parsed:
                                                        yield f"__SOURCES__:{json.dumps(parsed['sources'])}"
                                            except: pass
                                
                                # Check for AIMessage thoughts
                                if isinstance(m, AIMessage):
                                    if "THOUGHT:" in m.content:
                                        thought_text = m.content.split("THOUGHT:")[1].split("\n")[0].strip()
                                        yield f"__THOUGHT__:{thought_text}"
                    except Exception as e:
                        logger.error(f"Error parsing Researcher output: {e}")

                # E. Artist Output
                elif kind == "on_chain_end" and node_name == "artist":
                    yield "__SKELETON_END__:"
                    try:
                        output = event["data"].get("output")
                        if output:
                            content = output["messages"][-1].content
                            if "THOUGHT:" in content:
                                parts = content.split("THOUGHT:")
                                if len(parts) > 1:
                                    thought_part = parts[1].split("\n")[0].strip()
                                    yield f"__THOUGHT__:{thought_part}"
                                    rest = content.replace(f"THOUGHT: {thought_part}", "").replace("THOUGHT:", "").strip()
                                    if rest:
                                        if not is_answering:
                                            yield "__ANSWER__:"
                                            is_answering = True
                                        yield f"\n{rest}\n"
                                        full_ai_response += rest
                    except: pass

                # F. GENERAL ANSWER STREAMING
                elif kind == "on_chat_model_stream" and node_name != "supervisor":
                    chunk = event["data"]["chunk"]
                    if chunk.content:
                        text_chunk = chunk.content
                        full_ai_response += text_chunk
                        buffer += text_chunk

                        # --- STATE MACHINE ---
                        if is_answering:
                            # 1. ANSWER MODE: Stream text, hide Image Tags
                            if "[[" in buffer:
                                if "]]" in buffer:
                                    match = re.search(r'\[\[GENERATE_IMAGE:\s*(.*?)\]\]', buffer)
                                    if match:
                                        pending_image_prompt = match.group(1)
                                        buffer = buffer.replace(match.group(0), "")
                                    yield buffer
                                    buffer = ""
                            else:
                                yield buffer
                                buffer = ""
                        else:
                            # 2. THOUGHT MODE: Wait for THOUGHT: line to finish
                            clean_buffer = buffer.lstrip()
                            
                            # Check if it *could* be a thought
                            if thought_tag.startswith(clean_buffer) or clean_buffer.startswith(thought_tag):
                                # If we have the full tag "THOUGHT:"
                                if clean_buffer.startswith(thought_tag):
                                    if "\n" in buffer:
                                        # Found end of thought line
                                        split_idx = buffer.find("\n") + 1
                                        thought_line = buffer[:split_idx].strip()
                                        remaining = buffer[split_idx:]
                                        
                                        # Emit Thought
                                        clean_thought = thought_line.replace(thought_tag, "").strip()
                                        yield f"__THOUGHT__:{clean_thought}"
                                        
                                        # Switch to Answer
                                        yield "__ANSWER__:"
                                        is_answering = True
                                        buffer = remaining # Process remainder in next loop or flush
                                        
                                        # If text remains, flush it immediately
                                        if buffer.strip():
                                            yield buffer
                                            buffer = ""
                                    # Else wait for newline
                                else:
                                    # Buffer is shorter than "THOUGHT:", wait for more data
                                    if len(clean_buffer) > len(thought_tag):
                                         # Started with "T..." but mismatch. Answer.
                                         yield "__ANSWER__:"
                                         is_answering = True
                                         yield buffer
                                         buffer = ""
                            else:
                                # Not a thought. Answer immediately.
                                yield "__ANSWER__:"
                                is_answering = True
                                yield buffer
                                buffer = ""

            # --- END OF STREAM ---
            if buffer:
                if not is_answering:
                    yield "__ANSWER__:"
                yield buffer

            # Post-Process Image
            if pending_image_prompt:
                yield "__ICON__:image"
                yield f"__THOUGHT__: Generating visual: {pending_image_prompt}"
                yield "__SKELETON_START__:"
                img_markdown = await self.image_service.generate_image(pending_image_prompt, aspect_ratio=aspect_ratio)
                yield "__SKELETON_END__:"
                yield f"\n{img_markdown}\n"
                
                clean_tag = f"[[GENERATE_IMAGE: {pending_image_prompt}]]"
                full_ai_response = full_ai_response.replace(clean_tag, img_markdown)

            # Save Memory
            if full_ai_response.strip() and len(full_ai_response) > 20:
                clean_memory = re.sub(r'!\[.*?\]\(data:image\/[^)]+\)', '[Generated Image]', full_ai_response)
                clean_memory = re.sub(r'\[\[GENERATE_IMAGE:.*?\]\]', '', clean_memory)
                asyncio.create_task(self.vector_store.add_documents([f"User: {message}\nUltron: {clean_memory}"]))

        except Exception as e:
            logger.error(f"Graph Error: {e}")
            yield "__ANSWER__:" 
            yield f"\n[System Error]: {str(e)}"

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
                ("system", "Generate a 3-5 word title for this chat, max words should be 10. No quotes."),
                ("user", "{context}")
            ])
            
            chain = title_prompt | model
            response = await chain.ainvoke({"context": conversation_summary})
            return response.content[:100].strip().replace('"', '')
        except Exception as e:
            print(f"Error generating title: {e}")
            return "New Chat"

@lru_cache()
def get_chat_service() -> ChatService:
    settings = get_settings()
    return ChatService(settings)