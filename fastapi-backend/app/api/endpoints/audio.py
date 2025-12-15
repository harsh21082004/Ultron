# app/api/endpoints/audio.py
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from pydantic import BaseModel

from ...services.stt_service import STTService, get_stt_service

router = APIRouter(tags=["Audio"])


class STTResponse(BaseModel):
    text: str


STTDep = Depends(get_stt_service)


@router.post(
    "/transcribe",
    response_model=STTResponse,
    summary="Transcribe speech to text using Whisper",
)
async def transcribe_audio(
    file: UploadFile = File(...),
    stt_service: STTService = STTDep,
) -> STTResponse:
    try:
        text = await stt_service.transcribe(file)
        return STTResponse(text=text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {e}",
        )
