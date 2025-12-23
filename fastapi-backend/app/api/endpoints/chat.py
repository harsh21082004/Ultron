from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from typing import List
import base64
import io
from PIL import Image

from ...models.chat_models import (
    Message,
    StreamRequest,
    TitleRequest,
    TitleResponse,
    HydrateRequest,
    StatusResponse,
)
from ...services.chat_service import ChatService, get_chat_service

router = APIRouter(tags=["Chat"])

ChatServiceDep = Depends(get_chat_service)


def compress_base64_image(base64_str: str, max_size=(512, 512), quality=70) -> str:
    """
    Decodes a base64 image, resizes it, converts to JPEG, and re-encodes.
    """
    try:
        if "," in base64_str:
            header, encoded = base64_str.split(",", 1)
        else:
            encoded = base64_str

        try:
            image_data = base64.b64decode(encoded)
        except Exception:
            encoded += "=" * ((4 - len(encoded) % 4) % 4)
            image_data = base64.b64decode(encoded)

        img = Image.open(io.BytesIO(image_data))

        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        resample_method = getattr(Image, "Resampling", Image).LANCZOS
        img.thumbnail(max_size, resample_method)

        buffered = io.BytesIO()
        img.save(buffered, format="JPEG", quality=quality)
        
        new_encoded = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        # Return strictly as Data URI
        return f"data:image/jpeg;base64,{new_encoded}"

    except Exception as e:
        print(f"Error compressing image: {e}")
        if "," not in base64_str:
             return f"data:image/jpeg;base64,{base64_str}"
        return base64_str


@router.get("/{session_id}", response_model=List[Message])
async def handle_get_chat_history(session_id: str, chat_service: ChatService = ChatServiceDep):
    try:
        return await chat_service.get_chat_history(session_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/stream", summary="Stream Chat Response")
async def handle_chat_stream(
    request: StreamRequest,
    chat_service: ChatService = ChatServiceDep,
):
    async def event_generator(): 
        try:
            # Process multiple images
            processed_images = []
            if request.images:
                for img_str in request.images:
                    if img_str and len(img_str.strip()) > 0:
                        processed_images.append(compress_base64_image(img_str))

            # Pass the list to the service
            async for chunk in chat_service.stream_groq_message(
                request.message, 
                request.chatId, 
                processed_images, # List[str]
                request.language, 
                request.user_context
            ):
                yield chunk
        except Exception as e:
            yield f"[Error] {str(e)}"

    return StreamingResponse(event_generator(), media_type="text/plain")


@router.post("/generate-title", response_model=TitleResponse)
async def generate_title_route(request: TitleRequest, chat_service: ChatService = ChatServiceDep):
    try:
        title = await chat_service.generate_chat_title(request.messages)
        return TitleResponse(title=title)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hydrate-history", response_model=StatusResponse)
async def hydrate_history_route(request: HydrateRequest, chat_service: ChatService = ChatServiceDep):
    try:
        await chat_service.hydrate_chat_history(request.chatId, request.messages)
        return StatusResponse(status="success", message="History hydrated")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))