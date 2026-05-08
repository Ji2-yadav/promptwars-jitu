import pytest

from app.schemas.itinerary import ItineraryResponse
from app.schemas.replan import ReplanResponse
from app.services.gemini_service import (
    GeminiService,
    build_fallback_itinerary,
    build_fallback_replan,
    llm_cache,
)
from app.services.google_maps_service import (
    GoogleMapsService,
    parse_google_duration_minutes,
)
from app.services.prompt_service import (
    build_plan_prompt,
    build_repair_prompt,
    build_replan_prompt,
)


def test_build_fallback_itinerary_respects_trip_length_and_constraints(trip_request):
    itinerary = build_fallback_itinerary(trip_request)

    assert len(itinerary.days) == 3
    assert "Use transit" in itinerary.days[0].items[0].accessibilityNotes
    assert itinerary.summary.destination == "Tokyo"


def test_build_fallback_replan_preserves_completed_items(replan_request):
    response = build_fallback_replan(replan_request)

    assert response.recommendedOptionId == "minimal-change"
    assert response.affectedItems == ["Outdoor garden"]
    assert response.options[0].replaceFromTime == "14:00"


def test_prompt_builders_include_json_payloads(trip_request, replan_request):
    assert '"destination":"Tokyo"' in build_plan_prompt(trip_request)
    assert '"disruption"' in build_replan_prompt(replan_request)
    assert "Validation error" in build_repair_prompt(
        "bad", "missing field", "ItineraryResponse"
    )


def test_parse_google_duration_minutes():
    assert parse_google_duration_minutes("61s") == 2
    assert parse_google_duration_minutes("bad") is None


@pytest.mark.asyncio
async def test_google_maps_enrichment_adds_fallback_links_without_key(trip_request):
    service = GoogleMapsService()
    service.api_key = None
    service.enabled = False

    response = await service.enrich_itinerary(
        trip_request,
        build_fallback_itinerary(trip_request),
        "fallback",
    )

    first_item = response.days[0].items[0]
    assert first_item.mapQuery == "Tokyo orientation loop, Tokyo"
    assert first_item.googleMapsUrl.startswith("https://www.google.com/maps/search/")
    assert response.googleServices.mapsConfigured is False


@pytest.mark.asyncio
async def test_google_maps_enrichment_attaches_places_and_route(
    monkeypatch, trip_request
):
    service = GoogleMapsService()
    service.api_key = "maps-key"
    service.enabled = True

    async def fake_find_place(query):
        from app.schemas.itinerary import GooglePlace

        return GooglePlace(
            query=query,
            placeId=f"place-{query[:5]}",
            displayName=query.split(",")[0],
            formattedAddress="Tokyo, Japan",
            latitude=35.0,
            longitude=139.0,
            rating=4.6,
            googleMapsUri="https://maps.google.com/example",
            source="google_places",
        )

    async def fake_route_leg(origin, destination):
        from app.schemas.itinerary import GoogleRouteLeg

        return GoogleRouteLeg(
            fromTitle=origin.title,
            toTitle=destination.title,
            distanceMeters=900,
            durationMinutes=12,
            googleMapsUri="https://www.google.com/maps/dir/?api=1",
            source="google_routes",
        )

    monkeypatch.setattr(service, "_find_place", fake_find_place)
    monkeypatch.setattr(service, "_compute_route_leg", fake_route_leg)

    response = await service.enrich_itinerary(
        trip_request,
        build_fallback_itinerary(trip_request),
        "gemini_api",
    )

    assert response.days[0].items[0].googlePlace.source == "google_places"
    assert response.days[0].googleRoute.totalDurationMinutes == 24
    assert response.googleServices.placesResolved == 9
    assert response.googleServices.routeLegsResolved == 6


@pytest.mark.asyncio
async def test_generate_validated_repairs_invalid_first_response(
    monkeypatch, itinerary
):
    service = GeminiService()
    calls = iter(["not json", itinerary.model_dump_json()])

    async def fake_call(prompt):
        return next(calls)

    monkeypatch.setattr(service, "_call_gemini", fake_call)

    response = await service._generate_validated(
        "prompt",
        ItineraryResponse,
        lambda: None,
        "ItineraryResponse",
    )

    assert response.summary.destination == "Tokyo"


@pytest.mark.asyncio
async def test_generate_validated_falls_back_after_repair_failure(
    monkeypatch, itinerary
):
    service = GeminiService()

    async def fake_call(prompt):
        return "not json"

    monkeypatch.setattr(service, "_call_gemini", fake_call)

    response = await service._generate_validated(
        "prompt",
        ItineraryResponse,
        lambda: itinerary,
        "ItineraryResponse",
    )

    assert response is itinerary


@pytest.mark.asyncio
async def test_call_gemini_uses_cache(monkeypatch):
    llm_cache.clear()
    service = GeminiService()
    service.client = object()
    service.settings.gemini_model = "test-model"

    class Models:
        calls = 0

        @classmethod
        def generate_content(cls, model, contents):
            cls.calls += 1
            return type("Response", (), {"text": f"response for {contents}"})()

    service.client = type("Client", (), {"models": Models})()

    first = await service._call_gemini("same prompt")
    second = await service._call_gemini("same prompt")

    assert first == second
    assert Models.calls == 1


@pytest.mark.asyncio
async def test_replan_itinerary_uses_fallback_without_client(replan_request):
    service = GeminiService()
    service.client = None

    response = await service.replan_itinerary(replan_request)

    assert isinstance(response, ReplanResponse)
    assert response.options
