"""Trip planning endpoints – synchronous and streaming variants.

Exposes two routes under ``/api``:

- ``POST /api/plan`` – returns a complete :class:`ItineraryResponse` in one JSON body.
- ``POST /api/plan/stream`` – streams the same response as newline-delimited JSON
  (NDJSON) so the UI can render days progressively as they arrive.
"""
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
    """Generate a full day-by-day itinerary and return it as a single JSON response."""
    return await GeminiService().generate_itinerary(request)


@router.post("/plan/stream")
async def plan_trip_stream(request: TripRequest) -> StreamingResponse:
    """Stream the itinerary as NDJSON, emitting status, summary, day, and complete events."""

    async def stream():
        yield encode_event({"type": "status", "message": "Sending trip brief to LLM"})
        itinerary = await GeminiService().generate_itinerary(request)
        yield encode_event(
            {
                "type": "summary",
                "summary": itinerary.summary.model_dump(mode="json"),
                "tripHealth": itinerary.tripHealth.model_dump(mode="json"),
                "googleServices": (
                    itinerary.googleServices.model_dump(mode="json")
                    if itinerary.googleServices
                    else None
                ),
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
                "googleServices": (
                    itinerary.googleServices.model_dump(mode="json")
                    if itinerary.googleServices
                    else None
                ),
            }
        )

    return StreamingResponse(stream(), media_type="application/x-ndjson")


def encode_event(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=True) + "\n"
