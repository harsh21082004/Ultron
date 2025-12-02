# app/api/endpoints/chat.py
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from typing import List

from ...models.chat_models import (
    Message, StreamRequest, TitleRequest, TitleResponse,
    HydrateRequest, StatusResponse
)
# Import the service *dependency function*
from ...services.chat_service import ChatService, get_chat_service

router = APIRouter()

# --- Dependency ---
# This defines a common dependency for all routes in this file
# 'chat_service' will be an instance of the ChatService class
ChatServiceDep = Depends(get_chat_service)


@router.get(
    "/{session_id}",
    response_model=List[Message],
    summary="Get Chat History",
    tags=["Chat"]
)
async def handle_get_chat_history(
    session_id: str,
    chat_service: ChatService = ChatServiceDep # Inject the service
) -> List[Message]:
    """
    Retrieves the message history for a specific chat session.
    """
    try:
        # Call the service method
        return chat_service.get_chat_history(session_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"History not found for session {session_id}: {e}"
        )

@router.post(
    "/stream",
    summary="Stream Chat Response",
    tags=["Chat"]
)
async def handle_chat_stream(
    request: StreamRequest,
    chat_service: ChatService = ChatServiceDep # Inject the service
):
    """
    Receives a user's message and streams the response back.
    """
    try:
        return StreamingResponse(
            chat_service.stream_groq_message(request.message, request.chatId),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error initiating stream: {e}"
        )

@router.post(
    "/generate-title",
    response_model=TitleResponse,
    summary="Generate Chat Title",
    tags=["Chat"]
)
async def generate_title_route(
    request: TitleRequest,
    chat_service: ChatService = ChatServiceDep # Inject the service
) -> TitleResponse:
    """
    Receives a chat history and returns an AI-generated title.
    """
    print(request)
    try:
        # Pass the Pydantic models directly to the service
        print(request)
        title = await chat_service.generate_chat_title(request.messages)
        return TitleResponse(title=title)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate title: {e}"
        )

@router.post(
    "/hydrate-history",
    response_model=StatusResponse,
    summary="Hydrate Session Memory",
    tags=["Chat"]
)
async def hydrate_history_route(
    request: HydrateRequest,
    chat_service: ChatService = ChatServiceDep # Inject the service
) -> StatusResponse:
    """
    Loads a full chat history from the frontend into the AI's session memory.
    """
    try:
        # Pass the Pydantic models directly to the service
        await chat_service.hydrate_chat_history(request.chatId, request.messages)
        return StatusResponse(
            status="success",
            message="History hydrated successfully"
        )
    except Exception as e:
        print(f"Error hydrating history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to hydrate history: {e}"
        )