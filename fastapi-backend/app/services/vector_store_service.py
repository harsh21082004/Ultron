import time
import logging
from functools import lru_cache
from typing import List

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

from ..core.config import Settings, get_settings

logger = logging.getLogger("uvicorn.error")

class VectorStoreService:
    """
    Manages RAG operations using Pinecone and Google Gemini Embeddings.
    """
    def __init__(self, settings: Settings):
        self.vector_store = None
        self.embeddings = None
        self.dimension = 768 # Gemini dimension
        
        self.pinecone_api_key = settings.PINECONE_API_KEY
        if not self.pinecone_api_key:
            logger.warning("WARNING: PINECONE_API_KEY not found. RAG will be disabled.")
            return

        # 1. Initialize Google Embeddings
        if settings.GOOGLE_API_KEY:
            try:
                self.embeddings = GoogleGenerativeAIEmbeddings(
                    model="models/text-embedding-004", 
                    google_api_key=settings.GOOGLE_API_KEY
                )
            except Exception as e:
                logger.error(f"Failed to init Google Embeddings: {e}")
                return
        else:
            logger.error("ERROR: GOOGLE_API_KEY not found. Cannot initialize Embeddings.")
            return

        # 2. Initialize Pinecone
        try:
            self.pc = Pinecone(api_key=self.pinecone_api_key)
            self.index_name = settings.PINECONE_INDEX_NAME

            # 3. Auto-Create/Validate Index
            indexes = [i.name for i in self.pc.list_indexes()]
            
            # Delete if dimension mismatch (e.g. migrating from OpenAI 1536 to Gemini 768)
            if self.index_name in indexes:
                info = self.pc.describe_index(self.index_name)
                if int(info.dimension) != self.dimension:
                    logger.warning(f"⚠️ Dimension mismatch ({info.dimension} != {self.dimension}). Recreating index...")
                    self.pc.delete_index(self.index_name)
                    while self.index_name in [i.name for i in self.pc.list_indexes()]:
                        time.sleep(1)
                    indexes.remove(self.index_name)

            # Create if missing
            if self.index_name not in indexes:
                logger.info(f"Creating Index '{self.index_name}' (Dim: {self.dimension})...")
                self.pc.create_index(
                    name=self.index_name,
                    dimension=self.dimension,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
                while not self.pc.describe_index(self.index_name).status['ready']:
                    time.sleep(1)
                logger.info("Index ready.")

            # 4. Connect
            self.vector_store = PineconeVectorStore(
                index_name=self.index_name,
                embedding=self.embeddings,
                pinecone_api_key=self.pinecone_api_key
            )
            
        except Exception as e:
            logger.error(f"Pinecone Connection Error: {e}")

    async def retrieve_context(self, query: str, k: int = 3) -> str:
        """Retrieves relevant conversation history/facts."""
        if not self.vector_store: return ""
        try:
            # Using ainvoke if available in your langchain version, otherwise sync
            docs = await self.vector_store.asimilarity_search(query, k=k)
            return "\n\n".join([d.page_content for d in docs])
        except Exception as e:
            logger.error(f"RAG Retrieval Error: {e}")
            return ""

    async def add_documents(self, texts: List[str]):
        """Adds text to the vector DB for long-term memory."""
        if self.vector_store and texts:
            try:
                await self.vector_store.aadd_texts(texts)
            except Exception as e:
                logger.error(f"RAG Add Error: {e}")

@lru_cache()
def get_vector_store_service() -> VectorStoreService:
    return VectorStoreService(get_settings())