from typing import List, Dict, Any
from langchain_core.tools import Tool
from langchain_google_community import GoogleSearchAPIWrapper
import json

from ..core.config import get_settings

class ToolsService:
    """
    Manages Google Web Search Tool.
    Returns structured data including sources.
    """

    def __init__(self):
        settings = get_settings()
        self._search_available = False
        self._search_wrapper = None
        self._error_msg = ""

        if settings.GOOGLE_API_KEY and settings.GOOGLE_CSE_ID:
            try:
                self._search_wrapper = GoogleSearchAPIWrapper(
                    google_api_key=settings.GOOGLE_API_KEY,
                    google_cse_id=settings.GOOGLE_CSE_ID
                )
                self._search_available = True
            except Exception as e:
                self._error_msg = f"Google Search Init Failed: {e}"
        else:
            self._error_msg = "Google Search keys missing (GOOGLE_API_KEY, GOOGLE_CSE_ID)."

    def get_search_tool(self) -> Tool:
        if not self._search_available:
            return Tool(
                name="web_search_disabled",
                func=lambda q: self._error_msg,
                description="Search unavailable.",
            )

        return Tool(
            name="google_search",
            func=self.perform_search_simple,
            description="Use for real-time information from Google.",
        )

    def perform_search_simple(self, query: str) -> str:
        """
        Legacy simple search returning string only.
        """
        result = self.perform_search(query)
        return result["summary"]

    def perform_search(self, query: str) -> Dict[str, Any]:
        """
        Performs a search and returns structured data:
        {
            "summary": "Combined snippets...",
            "sources": [{"title": "...", "link": "..."}]
        }
        """
        if not self._search_available:
            return {"summary": self._error_msg, "sources": []}
        
        try:
            # Get raw results (list of dicts with title, link, snippet)
            raw_results = self._search_wrapper.results(query, num_results=4)
            
            if not raw_results:
                return {"summary": "No results found.", "sources": []}

            sources = []
            snippets = []

            for res in raw_results:
                title = res.get("title", "Unknown Source")
                link = res.get("link", "#")
                snippet = res.get("snippet", "")
                
                sources.append({"title": title, "link": link})
                snippets.append(f"Source: {title}\nContent: {snippet}")

            summary = "\n\n".join(snippets)
            
            return {
                "summary": summary,
                "sources": sources
            }

        except Exception as e:
            return {"summary": f"Search Error: {e}", "sources": []}