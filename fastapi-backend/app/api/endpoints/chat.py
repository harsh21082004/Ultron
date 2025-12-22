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
    This significantly reduces the token count/string length for the LLM.
    """
    try:
        # 1. Strip existing header if present (e.g., data:image/png;base64,...)
        if "," in base64_str:
            header, encoded = base64_str.split(",", 1)
        else:
            encoded = base64_str

        # 2. Decode the base64 string
        try:
            image_data = base64.b64decode(encoded)
        except Exception:
            # If standard decode fails, try fixing padding
            encoded += "=" * ((4 - len(encoded) % 4) % 4)
            image_data = base64.b64decode(encoded)

        # 3. Open image with Pillow
        img = Image.open(io.BytesIO(image_data))

        # 4. Convert to RGB (Required for JPEG, handles PNG transparency)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # 5. Resize if needed (Maintain aspect ratio)
        # Use safe attribute access for newer/older Pillow versions
        resample_method = getattr(Image, "Resampling", Image).LANCZOS
        img.thumbnail(max_size, resample_method)

        # 6. Save as JPEG to buffer
        buffered = io.BytesIO()
        img.save(buffered, format="JPEG", quality=quality)
        
        # 7. Re-encode to Base64
        new_encoded = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        # Log the compression ratio for debugging
        original_len = len(base64_str)
        new_len = len(new_encoded)
        print(f"Vision: Compressed image from {original_len} chars to {new_len} chars")

        # 8. Return with strict JPEG Data URI header
        # This is CRITICAL for the LLM to recognize it as an image URL
        return f"data:image/jpeg;base64,{new_encoded}"

    except Exception as e:
        print(f"Error compressing image: {e}")
        # Fallback: Return original string if compression fails, 
        # but try to ensure it has a header if it was missing.
        if "," not in base64_str:
             return f"data:image/jpeg;base64,{base64_str}"
        return base64_str


@router.get(
    "/{session_id}",
    response_model=List[Message],
    summary="Get Chat History",
)
async def handle_get_chat_history(
    session_id: str,
    chat_service: ChatService = ChatServiceDep,
) -> List[Message]:
    try:
        return await chat_service.get_chat_history(session_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"History not found for session {session_id}: {e}",
        )


@router.post(
    "/stream",
    summary="Stream Chat Response",
)
async def handle_chat_stream(
    request: StreamRequest,
    chat_service: ChatService = ChatServiceDep,
):
    async def event_generator(): 
        try:
            final_image = request.image
            
            # Process image if it exists and is not empty
            if final_image and len(final_image.strip()) > 0:
                final_image = compress_base64_image(final_image)
            else:
                final_image = None

            # Stream response from service
            async for chunk in chat_service.stream_groq_message(
                request.message, request.chatId, final_image, request.language, request.user_context
            ):
                yield chunk
        except Exception as e:
            # Yield error as a text chunk so frontend sees it
            yield f"[Error] {str(e)}"

    return StreamingResponse(event_generator(), media_type="text/plain")


@router.post(
    "/generate-title",
    response_model=TitleResponse,
    summary="Generate Chat Title",
)
async def generate_title_route(
    request: TitleRequest,
    chat_service: ChatService = ChatServiceDep,
) -> TitleResponse:
    try:
        title = await chat_service.generate_chat_title(request.messages)
        return TitleResponse(title=title)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate title: {e}",
        )


@router.post(
    "/hydrate-history",
    response_model=StatusResponse,
    summary="Hydrate Session Memory",
)
async def hydrate_history_route(
    request: HydrateRequest,
    chat_service: ChatService = ChatServiceDep,
) -> StatusResponse:
    try:
        await chat_service.hydrate_chat_history(request.chatId, request.messages)
        return StatusResponse(
            status="success",
            message="History hydrated successfully",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to hydrate history: {e}",
        )