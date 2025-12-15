from functools import lru_cache
from typing import Optional
from groq import Groq

from ..core.config import Settings, get_settings

class VisionService:
    """
    Uses Groq Llama 3.2 Vision to analyze images.
    """

    def __init__(self, settings: Settings):
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is required for Vision.")
        
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model_name = "llama-3.2-90b-vision-preview"

    async def analyze_image(self, image_url: str, prompt: Optional[str] = None) -> str:
        """
        Analyzes an image (Base64 URL or HTTP URL).
        """
        if not image_url:
            raise ValueError("image_url is required.")

        question = prompt or "Describe this image in detail."

        try:
            completion = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": question},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_url
                                }
                            }
                        ]
                    }
                ],
                temperature=0.2,
                max_tokens=1024,
                top_p=1,
                stream=False,
                stop=None,
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Groq Vision Error: {e}")
            raise e

@lru_cache()
def get_vision_service() -> VisionService:
    return VisionService(get_settings())