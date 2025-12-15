# app/api/endpoints/vision.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from ...services.vision_service import VisionService, get_vision_service

router = APIRouter(tags=["Vision"])


class VisionRequest(BaseModel):
    image_url: str
    prompt: str | None = None


class VisionResponse(BaseModel):
    result: str


VisionDep = Depends(get_vision_service)


@router.post(
    "/analyze",
    response_model=VisionResponse,
    summary="Analyze an image using the vision model",
)
async def analyze_image(
    request: VisionRequest,
    vision_service: VisionService = VisionDep,
) -> VisionResponse:
    try:
        result = await vision_service.analyze_image(
            image_url=request.image_url,
            prompt=request.prompt,
        )
        return VisionResponse(result=result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vision analysis failed: {e}",
        )
