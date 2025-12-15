# app/api/endpoints/translate.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ...services.translation_service import (
    TranslationService,
    get_translation_service,
)

router = APIRouter(tags=["Translate"])


class TranslationRequest(BaseModel):
    text: str
    target_language: str  # e.g. "Hindi", "English", "Spanish"


class TranslationResponse(BaseModel):
    translated_text: str


TranslateDep = Depends(get_translation_service)


@router.post(
    "",
    response_model=TranslationResponse,
    summary="Translate text to a target language",
)
async def translate_text(
    request: TranslationRequest,
    translation_service: TranslationService = TranslateDep,
) -> TranslationResponse:
    try:
        translated = await translation_service.translate(
            request.text, request.target_language
        )
        return TranslationResponse(translated_text=translated)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {e}",
        )
