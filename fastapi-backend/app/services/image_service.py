import base64
import logging
from google import genai
from google.genai import types
from langchain_core.tools import StructuredTool

from ..core.config import get_settings

logger = logging.getLogger("uvicorn.error")

class ImageService:
    def __init__(self):
        settings = get_settings()
        if settings.GOOGLE_API_KEY:
            self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        else:
            logger.error("GOOGLE_API_KEY is missing. Image generation will fail.")
            self.client = None

    def get_tool(self):
        """Returns the LangChain Tool for image generation."""
        return StructuredTool.from_function(
            func=self._sync_placeholder,   # Placeholder for validation
            coroutine=self.generate_image, # <--- The ACTUAL async function used by the agent
            name="generate_image",
            description=(
                "Generates an image based on a text prompt. "
                "Use this when the user asks to 'draw', 'paint', 'generate an image', "
                "or when you want to visually illustrate a concept. "
                "Input: A detailed image description. Output: A markdown string."
            )
        )

    def _sync_placeholder(self, prompt: str) -> str:
        """Sync placeholder to satisfy StructuredTool validation. Never called in async graph."""
        raise NotImplementedError("This tool is async-only.")

    async def generate_image(self, prompt: str, aspect_ratio: str = "16:9") -> str:
        """
        Generates an image and returns a Markdown string.
        """
        if not self.client:
            return "Error: Google API Key is missing."

        try:
            logger.info(f"[ImageService] Generating image for: {prompt}")
            
            response = await self.client.aio.models.generate_images(
                model='imagen-4.0-generate-001',
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio=aspect_ratio,
                    safety_filter_level="block_low_and_above",
                    person_generation="allow_adult"
                )
            )

            if response.generated_images:
                image_bytes = response.generated_images[0].image.image_bytes
                b64_string = base64.b64encode(image_bytes).decode("utf-8")
                print("Generated Image Base64:", b64_string[:50] + "...")
                # Return the Markdown image
                return f"![Generated Image](data:image/jpeg;base64,{b64_string})"
            
            return "Error: No image returned."

        except Exception as e:
            logger.error(f"[ImageService] Error: {e}")
            return f"Image generation failed: {str(e)}"