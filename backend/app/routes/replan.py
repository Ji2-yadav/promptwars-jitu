from fastapi import APIRouter

from app.schemas.replan import ReplanRequest, ReplanResponse
from app.services.gemini_service import GeminiService

router = APIRouter(prefix="/api", tags=["replan"])


@router.post("/replan", response_model=ReplanResponse)
async def replan_trip(request: ReplanRequest) -> ReplanResponse:
    return await GeminiService().replan_itinerary(request)
