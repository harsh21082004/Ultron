import json
import re
import operator
import logging
import sys
from typing import Annotated, TypedDict, List

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage
from langgraph.graph import StateGraph, END

from ..core.config import get_settings
from ..core.llm_factory import get_llm_factory
from ..services.tools_service import ToolsService
from ..services.image_service import ImageService
from ..services.youtube_service import YoutubeService
from .mcp_manager import MCPManager
from ..services.regulations import SafetyRegulations

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    next_agent: str

class AgentGraphFactory:
    def __init__(self):
        self.llm_factory = get_llm_factory()
        self.supervisor_llm = self.llm_factory.get_reasoning_model()
        self.tooling_llm = self.llm_factory.get_tooling_model()
        self.vision_llm = self.llm_factory.get_vision_model()
        
        self.tools_service = ToolsService()
        self.image_service = ImageService()
        self.youtube_service = YoutubeService()
        self.mcp_manager = MCPManager()
        self.regulations = SafetyRegulations()
        
        self.search_tool = self.tools_service.get_search_tool()
        self.yt_search_tool = self.youtube_service.get_search_tool()
        self.yt_transcript_tool = self.youtube_service.get_transcript_tool()
        self.yt_details_tool = self.youtube_service.get_details_tool()

    async def supervisor_node(self, state: AgentState):
        messages = state["messages"]
        last_message = messages[-1]
        content_text = ""
        
        if isinstance(last_message.content, str):
            content_text = last_message.content
        elif isinstance(last_message.content, list):
            content_text = next((item['text'] for item in last_message.content if item['type'] == 'text'), "")
            if any(item['type'] == 'image_url' for item in last_message.content):
                return {"next_agent": "visionary"}

        lower = content_text.lower()
        if any(x in lower for x in ["video", "youtube", "watch", "play", "transcript", "trailer", "song"]):
            return {"next_agent": "researcher"}
        if any(x in lower for x in ["generate", "draw", "paint", "imagine", "create a picture", "image of"]):
            return {"next_agent": "artist"}

        system_prompt = (
            "You are the Supervisor. Classify the user intent.\n"
            "OPTIONS: ['researcher', 'coder', 'artist', 'general']\n"
            "RULES: Facts/News -> 'researcher'. Code -> 'coder'. Image -> 'artist'. Chat -> 'general'.\n"
            "FORMAT: Output JSON only: {\"next\": \"<AGENT>\"}"
        )
        
        try:
            context = messages[-3:] if len(messages) > 3 else messages
            response = await self.supervisor_llm.ainvoke([SystemMessage(content=system_prompt)] + context)
            content = response.content.strip()
            start = content.find("{")
            end = content.rfind("}") + 1
            if start != -1 and end != -1:
                data = json.loads(content[start:end])
                next_agent = data.get("next", "general")
            else:
                next_agent = "general"
        except:
            next_agent = "general"
        
        return {"next_agent": next_agent}

    async def researcher_node(self, state: AgentState):
        messages = state["messages"]
        query = messages[-1].content
        if isinstance(query, list): query = query[0]['text']
        
        # 1. Refine Query
        refined_query = query
        if len(messages) > 2:
            try:
                history_text = "\n".join([f"{m.type.upper()}: {m.content}" for m in messages[-5:-1]])
                rw_res = await self.tooling_llm.ainvoke([HumanMessage(content=f"Rewrite '{query}' using context:\n{history_text}\nReturn ONLY query.")])
                refined_query = rw_res.content.strip().replace('"', '')
            except: pass

        # 2. Tool Selection
        tools = [self.search_tool, self.yt_search_tool, self.yt_transcript_tool, self.yt_details_tool]
        model_with_tools = self.tooling_llm.bind_tools(tools)
        
        try:
            sys_msg = "You are a Researcher. Call the best tool. Do not answer text, just call the tool."
            response = await model_with_tools.ainvoke([SystemMessage(content=sys_msg), HumanMessage(content=refined_query)])
            
            thought_prefix = f"THOUGHT: Research Strategy - Investigating '{refined_query}'."

            if response.tool_calls:
                tc = response.tool_calls[0]
                tool_name = tc["name"]
                args = tc["args"]
                tool_id = tc["id"]
                
                if tool_name == "google_search":
                    res = await self.search_tool.ainvoke(args)
                elif tool_name == "search_youtube":
                    res = await self.yt_search_tool.ainvoke(args.get("query"))
                elif tool_name == "get_video_details":
                    res = await self.yt_details_tool.ainvoke(args.get("video_id"))
                elif tool_name == "get_video_transcript":
                    res = await self.yt_transcript_tool.ainvoke(args.get("video_id"))
                else:
                    res = "Error"
                
                # IMPORTANT: Return ToolMessage to persist history
                return {
                    "messages": [
                        AIMessage(content=thought_prefix, tool_calls=[tc]),
                        ToolMessage(content=str(res), tool_call_id=tool_id, name=tool_name)
                    ]
                }

            # Fallback
            res = await self.search_tool.ainvoke(refined_query)
            return {"messages": [AIMessage(content=f"{thought_prefix}\n[WEB SEARCH DATA]\n{str(res)}", name="Researcher")]}

        except Exception as e:
            return {"messages": [AIMessage(content=json.dumps({"summary": f"Error: {e}"}), name="Researcher")]}

    async def general_node(self, state: AgentState):
        messages = state["messages"]
        core_prompt = self.regulations.get_general_prompt()
        print("Messages to General Node:", messages)
        
        system_instruction = (
            f"{core_prompt}\n\n"
            "**OUTPUT FORMAT:**\n"
            "1. Start with 'THOUGHT: <Reasoning>'.\n"
            "2. Then provide the ANSWER.\n\n"
            "**DATA RULES:**\n"
            "1. **WEB SEARCH:** Summarize. Cite inline [1]. NO reference list.\n"
            "2. **VIDEO DATA:** Format using bullet points (Title, Views, etc).\n"
            "3. **YOUTUBE:** Embed video using [[YOUTUBE: <ID>]].\n"
            "4. **IMAGE:** Only if asked, use [[GENERATE_IMAGE: <Prompt>]].\n"
        )
        
        try:
            response = await self.tooling_llm.ainvoke([SystemMessage(content=system_instruction)] + messages)
            return {"messages": [response]}
        except Exception as e:
            return {"messages": [AIMessage(content=f"THOUGHT: Error.\nSystem error: {e}")]}

    async def artist_node(self, state: AgentState):
        msg = state["messages"][-1].content
        prompt = msg if isinstance(msg, str) else msg[0]['text']
        clean_prompt = prompt.replace("generate image of", "").strip()
        res = await self.image_service.generate_image(clean_prompt)
        final = res if isinstance(res, str) else res.get('image', '')
        return {"messages": [AIMessage(content=f"THOUGHT: Generating image.\n{final}", name="Artist")]}

    async def coder_node(self, state: AgentState):
        response = await self.supervisor_llm.ainvoke([SystemMessage(content="You are a Coder. Output THOUGHT: <Plan>, then code."), state["messages"][-1]])
        return {"messages": [response]}

    async def visionary_node(self, state: AgentState):
        response = await self.vision_llm.ainvoke([state["messages"][-1]])
        return {"messages": [AIMessage(content=f"THOUGHT: Analyzing image.\n{response.content}", name="Visionary")]}

    async def create_graph(self):
        workflow = StateGraph(AgentState)
        workflow.add_node("supervisor", self.supervisor_node)
        workflow.add_node("researcher", self.researcher_node)
        workflow.add_node("coder", self.coder_node)
        workflow.add_node("artist", self.artist_node)
        workflow.add_node("visionary", self.visionary_node)
        workflow.add_node("general", self.general_node)

        workflow.set_entry_point("supervisor")
        workflow.add_conditional_edges("supervisor", lambda x: x["next_agent"], 
            {"researcher": "researcher", "coder": "coder", "general": "general", "artist": "artist", "visionary": "visionary"})

        workflow.add_edge("researcher", "general")
        workflow.add_edge("general", END)
        workflow.add_edge("coder", END)
        workflow.add_edge("artist", END)
        workflow.add_edge("visionary", END)

        return workflow.compile()