import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas.itinerary import ItineraryResponse
from app.schemas.trip import TripRequest
from app.services.gemini_service import GeminiService

router = APIRouter(prefix="/api", tags=["plan"])


@router.post("/plan", response_model=ItineraryResponse)
async def plan_trip(request: TripRequest) -> ItineraryResponse:
    return await GeminiService().generate_itinerary(request)


@router.post("/plan/stream")
async def plan_trip_stream(request: TripRequest) -> StreamingResponse:
    async def stream():
        yield encode_event({"type": "status", "message": "Sending trip brief to LLM"})
        itinerary = await GeminiService().generate_itinerary(request)
        yield encode_event(
            {
                "type": "summary",
                "summary": itinerary.summary.model_dump(mode="json"),
                "tripHealth": itinerary.tripHealth.model_dump(mode="json"),
            }
        )

        for day in itinerary.days:
            await asyncio.sleep(0.25)
            yield encode_event({"type": "day", "day": day.model_dump(mode="json")})

        yield encode_event(
            {
                "type": "complete",
                "assumptions": itinerary.assumptions,
                "fallbacks": itinerary.fallbacks,
                "tripHealth": itinerary.tripHealth.model_dump(mode="json"),
            }
        )

    return StreamingResponse(stream(), media_type="application/x-ndjson")


def encode_event(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=True) + "\n"
