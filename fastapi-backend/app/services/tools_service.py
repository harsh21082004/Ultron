import json
from typing import Dict, Any, List
from urllib.parse import urlparse
from langchain_core.tools import Tool
from langchain_google_community import GoogleSearchAPIWrapper
from ..core.config import get_settings

class ToolsService:
    def __init__(self):
        settings = get_settings()
        self._search_available = False
        self._search_wrapper = None
        self._error_msg = ""

        if settings.GOOGLE_API_KEY and settings.GOOGLE_CSE_ID:
            try:
                # Reduced k to 5 for speed and focus
                self._search_wrapper = GoogleSearchAPIWrapper(
                    google_api_key=settings.GOOGLE_API_KEY,
                    google_cse_id=settings.GOOGLE_CSE_ID,
                    k=5 
                )
                self._search_available = True
            except Exception as e:
                self._error_msg = f"Init Failed: {e}"
        else:
            self._error_msg = "Keys missing."

    def get_search_tool(self) -> Tool:
        return Tool(
            name="google_search",
            func=self.perform_search_full,
            description="Returns JSON with summary, sources, and found images.",
        )

    def perform_search_full(self, query: str) -> str:
        print(f"Tool executing for: {query}") 
        result = self.perform_search(query)
        # Ensure we return a STRING, not a dict
        return json.dumps(result)

    def perform_search(self, query: str) -> Dict[str, Any]:
        if not self._search_available:
            return {"summary": self._error_msg, "sources": [], "images": []}
        
        try:
            raw_results = self._search_wrapper.results(query, num_results=5)
            
            if not raw_results: 
                return {"summary": "No results found on the web.", "sources": [], "images": []}

            sources = []
            snippets = []
            found_images = []

            for i, res in enumerate(raw_results):
                title = res.get("title", "Unknown")
                link = res.get("link", "#")
                snippet = res.get("snippet", "No description available.")
                
                try:
                    domain = urlparse(link).netloc
                    icon_url = f"https://www.google.com/s2/favicons?domain={domain}"
                except: 
                    icon_url = ""

                image_url = None
                pagemap = res.get("pagemap", {})
                if "cse_image" in pagemap and len(pagemap["cse_image"]) > 0:
                    image_url = pagemap["cse_image"][0].get("src")
                elif "og:image" in pagemap and len(pagemap["og:image"]) > 0:
                    image_url = pagemap["og:image"][0].get("src")

                sources.append({"title": title, "uri": link, "icon": icon_url, "citationIndices": []})
                snippets.append(f"Source [{i+1}] {title}: {snippet}")
                
                if image_url and len(found_images) < 2:
                    found_images.append({"url": image_url, "source_index": i+1, "alt": title})

            summary_text = "\n\n".join(snippets)
            print(summary_text, sources, found_images)

            return {
                "summary": summary_text, 
                "sources": sources, 
                "images": found_images
            }
        except Exception as e:
            return {"summary": f"Search Error: {e}", "sources": [], "images": []}