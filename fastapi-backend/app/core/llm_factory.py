from functools import lru_cache
from langchain_groq import ChatGroq
from .config import Settings, get_settings

class LLMFactory:
    """
    Factory class to provide specific LLM configurations.
    """

    def __init__(self, settings: Settings):
        self.api_key = settings.GROQ_API_KEY
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is missing")

    def get_vision_model(self) -> ChatGroq:
        """
        Vision Capable Model
        """
        return ChatGroq(
            groq_api_key=self.api_key,
            model_name="meta-llama/llama-4-scout-17b-16e-instruct", # Or llama-3.2-90b-vision-preview if available
            temperature=0.2,
            max_tokens=1024,
        )

    def get_reasoning_model(self) -> ChatGroq:
        """
        High Reasoning / Coding Model
        """
        return ChatGroq(
            groq_api_key=self.api_key,
            model_name="meta-llama/llama-4-scout-17b-16e-instruct", # Low temp for precision
            temperature=0.3,
        )

    def get_tooling_model(self) -> ChatGroq:
        """
        General Chat / Search Integration Model
        """
        return ChatGroq(
            groq_api_key=self.api_key,
            model_name="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.7, # Higher temp for creativity/conversation
        )

@lru_cache()
def get_llm_factory() -> LLMFactory:
    settings = get_settings()
    return LLMFactory(settings)