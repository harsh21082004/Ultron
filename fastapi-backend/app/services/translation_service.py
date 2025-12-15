# app/services/translation_service.py
from functools import lru_cache

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from ..core.config import Settings, get_settings
from ..core.llm_factory import get_llm_factory


class TranslationService:
    """
    Simple translation using the general Groq LLM.
    """

    def __init__(self, settings: Settings):
        factory = get_llm_factory()
        self.llm = factory.get_tooling_model()

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """
            You are a professional translator.
            Translate the user's text into the target language.
            - Keep meaning accurate.
            - Keep tone natural.
            - Do NOT explain, ONLY return the translated text.
            """),
            ("human", "Target language: {target_language}\n\nText:\n{text}")
        ])

        self.chain = self.prompt | self.llm | StrOutputParser()

    async def translate(self, text: str, target_language: str) -> str:
        return await self.chain.ainvoke(
            {"text": text, "target_language": target_language}
        )


@lru_cache()
def get_translation_service() -> TranslationService:
    settings = get_settings()
    return TranslationService(settings)
