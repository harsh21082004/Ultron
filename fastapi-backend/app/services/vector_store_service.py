import time
import os
from functools import lru_cache
from typing import List

# Use Google GenAI for Embeddings (Free Tier)
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

from ..core.config import Settings, get_settings

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
            print("WARNING: PINECONE_API_KEY not found. RAG will be disabled.")
            return

        # 1. Initialize Google Embeddings
        google_key = settings.GOOGLE_API_KEY
        if google_key:
            try:
                self.embeddings = GoogleGenerativeAIEmbeddings(
                    model="models/text-embedding-004", 
                    google_api_key=google_key
                )
            except Exception as e:
                print(f"Failed to init Google Embeddings: {e}")
                return
        else:
            print("ERROR: GOOGLE_API_KEY not found. Cannot initialize Embeddings.")
            return

        # 2. Initialize Pinecone
        self.pc = Pinecone(api_key=self.pinecone_api_key)
        self.index_name = settings.PINECONE_INDEX_NAME

        # 3. Auto-Create Index with Correct Dimension (768)
        try:
            indexes = [i.name for i in self.pc.list_indexes()]
            
            # If index exists but has wrong dimension (e.g. old OpenAI 1536), delete it
            if self.index_name in indexes:
                info = self.pc.describe_index(self.index_name)
                if int(info.dimension) != self.dimension:
                    print(f"⚠️ Dimension mismatch ({info.dimension} != {self.dimension}). Recreating index...")
                    self.pc.delete_index(self.index_name)
                    indexes.remove(self.index_name)
                    time.sleep(10)

            # Create if missing
            if self.index_name not in indexes:
                print(f"Creating Index '{self.index_name}' (Dim: {self.dimension})...")
                self.pc.create_index(
                    name=self.index_name,
                    dimension=self.dimension,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
                while not self.pc.describe_index(self.index_name).status['ready']:
                    time.sleep(1)
                print("Index ready.")

            # 4. Connect
            self.vector_store = PineconeVectorStore(
                index_name=self.index_name,
                embedding=self.embeddings,
                pinecone_api_key=self.pinecone_api_key
            )
        except Exception as e:
            print(f"Pinecone Connection Error: {e}")

    async def retrieve_context(self, query: str, k: int = 3) -> str:
        if not self.vector_store: return ""
        try:
            docs = self.vector_store.similarity_search(query, k=k)
            return "\n\n".join([d.page_content for d in docs])
        except Exception as e:
            print(f"RAG Error: {e}")
            return ""

    async def add_documents(self, texts: List[str]):
        if self.vector_store:
            self.vector_store.add_texts(texts)

@lru_cache()
def get_vector_store_service() -> VectorStoreService:
    return VectorStoreService(get_settings())