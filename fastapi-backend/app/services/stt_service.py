import io
from functools import lru_cache
from fastapi import UploadFile
from groq import Groq  # Using Groq client directly

from ..core.config import Settings, get_settings

class STTService:
    """
    Speech-to-text using Groq's Whisper (Distil-Whisper).
    """

    def __init__(self, settings: Settings):
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is required for STT.")
        
        # Initialize Groq Client
        self.client = Groq(api_key=settings.GROQ_API_KEY)

    async def transcribe(self, file: UploadFile) -> str:
        """
        Transcribe audio using Groq API.
        """
        # Read file content
        audio_content = await file.read()
        
        # Groq expects a tuple (filename, bytes) or a file-like object
        # We wrap it in BytesIO and give it a name
        audio_file = (file.filename or "audio.wav", audio_content)

        try:
            transcription = self.client.audio.transcriptions.create(
                file=audio_file,
                model="distil-whisper-large-v3-en", # Groq's fast whisper model
                response_format="json",
                language="en",
                temperature=0.0
            )
            return transcription.text
        except Exception as e:
            print(f"Groq STT Error: {e}")
            raise e

@lru_cache()
def get_stt_service() -> STTService:
    return STTService(get_settings())