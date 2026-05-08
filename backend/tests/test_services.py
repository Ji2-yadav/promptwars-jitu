import pytest

from app.schemas.itinerary import ItineraryResponse
from app.schemas.replan import ReplanResponse
from app.services.gemini_service import (
    GeminiService,
    build_fallback_itinerary,
    build_fallback_replan,
    llm_cache,
)
from app.services.prompt_service import build_plan_prompt, build_repair_prompt, build_replan_prompt


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
    assert "Validation error" in build_repair_prompt("bad", "missing field", "ItineraryResponse")


@pytest.mark.asyncio
async def test_generate_validated_repairs_invalid_first_response(monkeypatch, itinerary):
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
async def test_generate_validated_falls_back_after_repair_failure(monkeypatch, itinerary):
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
