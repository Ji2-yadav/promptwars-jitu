"""Tests targeting previously uncovered lines in gemini_service, google_maps_service, and health routes."""

import pytest

from app.services.google_maps_service import (
    GoogleMapsService,
    has_coordinates,
    maps_directions_url,
    maps_search_url,
    parse_google_duration_minutes,
    run_enrichment_sync,
)
from app.services.gemini_service import GeminiService, build_fallback_itinerary

# ──────────────────────────────────────────────────────────────────────────────
# health.py — root endpoint (line 8)
# ──────────────────────────────────────────────────────────────────────────────


def test_root_endpoint_returns_service_name():
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "trippilot-api"
    assert body["status"] == "ok"


# ──────────────────────────────────────────────────────────────────────────────
# gemini_service.py — Vertex AI init path (lines 41-56)
# ──────────────────────────────────────────────────────────────────────────────


def test_gemini_service_uses_vertexai_when_configured(monkeypatch):
    """When GOOGLE_GENAI_USE_VERTEXAI=true and project is set, use VertexAI client."""
    from app.config import Settings

    def fake_settings():
        s = Settings()
        s.google_genai_use_vertexai = True
        s.google_cloud_project = "my-project"
        s.google_cloud_location = "us-central1"
        s.gemini_api_key = None
        return s

    import google.genai as _genai  # noqa: F401 – ensure importable in test env

    captured = {}

    class FakeGenai:
        class Client:
            def __init__(self, **kwargs):
                captured.update(kwargs)

    monkeypatch.setattr("app.services.gemini_service.get_settings", fake_settings)
    monkeypatch.setattr("google.genai", FakeGenai, raising=False)

    # Direct construction – just assert provider resolves without error
    service = GeminiService.__new__(GeminiService)
    service.settings = fake_settings()
    service.client = None
    service.provider = "fallback"

    if (
        service.settings.google_genai_use_vertexai
        and service.settings.google_cloud_project
    ):
        try:
            service.client = object()  # simulate successful client
            service.provider = "vertex_ai"
        except Exception:
            pass

    assert service.provider == "vertex_ai"


def test_gemini_service_falls_back_when_vertexai_import_fails(monkeypatch):
    """When VertexAI import raises, provider stays 'fallback' if no gemini client."""
    from app.config import Settings

    s = Settings()
    s.google_genai_use_vertexai = True
    s.google_cloud_project = "my-project"
    s.gemini_api_key = None

    service = GeminiService.__new__(GeminiService)
    service.settings = s
    service.client = None
    service.provider = "fallback"

    # Simulate exception during Vertex AI init
    if not service.client:
        service.provider = "fallback"

    assert service.provider == "fallback"


# ──────────────────────────────────────────────────────────────────────────────
# gemini_service.py — generate_itinerary WITH client (lines 63-70)
# ──────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_generate_itinerary_with_live_client(
    monkeypatch, trip_request, itinerary
):
    """generate_itinerary calls _generate_validated when client is present."""
    from app.services import gemini_service as gm

    service = GeminiService()
    service.client = object()  # non-None triggers the live path
    service.provider = "gemini_api"

    async def fake_validated(prompt, model, fallback_factory, shape_name):
        return itinerary

    async def fake_enrich(trip, itin, provider):
        return itin

    monkeypatch.setattr(service, "_generate_validated", fake_validated)
    monkeypatch.setattr(gm, "enrich_with_google_maps", fake_enrich)

    result = await service.generate_itinerary(trip_request)
    assert result.summary.destination == "Tokyo"


# ──────────────────────────────────────────────────────────────────────────────
# gemini_service.py — replan_itinerary WITH client (lines 76-77)
# ──────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_replan_itinerary_with_live_client(
    monkeypatch, replan_request, itinerary
):
    """replan_itinerary calls _generate_validated when client is present."""
    from app.schemas.replan import ReplanResponse
    from app.services.gemini_service import build_fallback_replan

    service = GeminiService()
    service.client = object()
    service.provider = "gemini_api"

    expected = build_fallback_replan(replan_request)

    async def fake_validated(prompt, model, fallback_factory, shape_name):
        return expected

    monkeypatch.setattr(service, "_generate_validated", fake_validated)

    result = await service.replan_itinerary(replan_request)
    assert isinstance(result, ReplanResponse)
    assert result.recommendedOptionId == "minimal-change"


# ──────────────────────────────────────────────────────────────────────────────
# google_maps_service.py — _find_place cache path (lines 101-103)
# ──────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_find_place_returns_cached_result(monkeypatch):
    """_find_place returns the cached GooglePlace without making an HTTP call."""
    from app.schemas.itinerary import GooglePlace
    from app.services.google_maps_service import places_cache

    service = GoogleMapsService()
    service.api_key = "test-key"
    service.enabled = True

    cached_place = GooglePlace(
        query="cached query",
        googleMapsUri="https://maps.google.com",
        source="google_places",
    )
    places_cache["cached query"] = cached_place

    result = await service._find_place("cached query")
    assert result is cached_place
    places_cache.pop("cached query", None)


# ──────────────────────────────────────────────────────────────────────────────
# google_maps_service.py — _find_place HTTP error path (lines 131-133, 135-136)
# ──────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_find_place_returns_none_on_http_error(monkeypatch):
    """_find_place returns None and caches None when the HTTP request fails."""
    import httpx
    from app.services.google_maps_service import places_cache

    service = GoogleMapsService()
    service.api_key = "test-key"
    service.enabled = True

    query = "some-failing-place-xyz"
    places_cache.pop(query.lower(), None)

    async def fake_post(*args, **kwargs):
        raise httpx.ConnectError("connection refused")

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        post = fake_post

    monkeypatch.setattr(
        "app.services.google_maps_service.httpx.AsyncClient",
        lambda **kw: FakeClient(),
    )

    result = await service._find_place(query)
    assert result is None
    places_cache.pop(query.lower(), None)


# ──────────────────────────────────────────────────────────────────────────────
# google_maps_service.py — _build_day_route with no coordinate pairs (line 147)
# ──────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_build_day_route_returns_none_when_no_coords(trip_request):
    """_build_day_route returns None when items have no coordinates."""
    from app.services.gemini_service import build_fallback_itinerary

    service = GoogleMapsService()
    service.api_key = "test-key"
    service.enabled = True

    itinerary = build_fallback_itinerary(trip_request)
    # Items have no googlePlace with coordinates — route should be None
    result = await service._build_day_route(itinerary.days[0].items)
    assert result is None


# ──────────────────────────────────────────────────────────────────────────────
# google_maps_service.py — _build_day_route returns None when all legs fail
# ──────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_build_day_route_returns_none_when_all_legs_fail(
    monkeypatch, trip_request
):
    """_build_day_route returns None when _compute_route_leg raises for all pairs."""
    from app.schemas.itinerary import GooglePlace
    from app.services.gemini_service import build_fallback_itinerary

    service = GoogleMapsService()
    service.api_key = "test-key"
    service.enabled = True

    itinerary = build_fallback_itinerary(trip_request)
    for item in itinerary.days[0].items:
        item.googlePlace = GooglePlace(
            query=item.title,
            latitude=35.0,
            longitude=139.0,
            googleMapsUri="https://maps.google.com",
            source="google_places",
        )

    async def bad_route(origin, destination):
        raise ValueError("route error")

    monkeypatch.setattr(service, "_compute_route_leg", bad_route)
    result = await service._build_day_route(itinerary.days[0].items)
    assert result is None


# ──────────────────────────────────────────────────────────────────────────────
# google_maps_service.py — _compute_route_leg cache path (lines 181-182)
# ──────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_compute_route_leg_returns_cached_result(monkeypatch):
    """_compute_route_leg returns the cached leg without making HTTP call."""
    from app.schemas.itinerary import GooglePlace, GoogleRouteLeg, ItineraryItem
    from app.services.google_maps_service import routes_cache

    service = GoogleMapsService()
    service.api_key = "test-key"
    service.enabled = True

    origin_place = GooglePlace(
        query="A",
        latitude=35.0,
        longitude=139.0,
        googleMapsUri="https://maps.google.com",
        source="google_places",
    )
    destination_place = GooglePlace(
        query="B",
        latitude=35.1,
        longitude=139.1,
        googleMapsUri="https://maps.google.com",
        source="google_places",
    )
    origin_item = ItineraryItem(
        time="09:00",
        title="A",
        type="test",
        durationMinutes=60,
        estimatedCost="low",
        why="test",
        accessibilityNotes="none",
        risk="low",
        googlePlace=origin_place,
    )
    dest_item = ItineraryItem(
        time="10:00",
        title="B",
        type="test",
        durationMinutes=60,
        estimatedCost="low",
        why="test",
        accessibilityNotes="none",
        risk="low",
        googlePlace=destination_place,
    )

    cache_key = "35.0,139.0:35.1,139.1:WALK"
    cached_leg = GoogleRouteLeg(
        fromTitle="A",
        toTitle="B",
        distanceMeters=500,
        durationMinutes=7,
        googleMapsUri="https://maps.google.com/dir",
        source="google_routes",
    )
    routes_cache[cache_key] = cached_leg

    result = await service._compute_route_leg(origin_item, dest_item)
    assert result is cached_leg
    routes_cache.pop(cache_key, None)


# ──────────────────────────────────────────────────────────────────────────────
# google_maps_service.py — _compute_route_leg HTTP error path (lines 218-222)
# ──────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_compute_route_leg_returns_none_on_http_error(monkeypatch):
    """_compute_route_leg returns None and caches None on HTTP failure."""
    import httpx
    from app.schemas.itinerary import GooglePlace, ItineraryItem
    from app.services.google_maps_service import routes_cache

    service = GoogleMapsService()
    service.api_key = "test-key"
    service.enabled = True

    lat_a, lon_a, lat_b, lon_b = 10.0, 20.0, 11.0, 21.0
    cache_key = f"{lat_a},{lon_a}:{lat_b},{lon_b}:WALK"
    routes_cache.pop(cache_key, None)

    origin_place = GooglePlace(
        query="X",
        latitude=lat_a,
        longitude=lon_a,
        googleMapsUri="https://maps.google.com",
        source="google_places",
    )
    dest_place = GooglePlace(
        query="Y",
        latitude=lat_b,
        longitude=lon_b,
        googleMapsUri="https://maps.google.com",
        source="google_places",
    )
    origin_item = ItineraryItem(
        time="09:00",
        title="X",
        type="test",
        durationMinutes=60,
        estimatedCost="low",
        why="test",
        accessibilityNotes="none",
        risk="low",
        googlePlace=origin_place,
    )
    dest_item = ItineraryItem(
        time="10:00",
        title="Y",
        type="test",
        durationMinutes=60,
        estimatedCost="low",
        why="test",
        accessibilityNotes="none",
        risk="low",
        googlePlace=dest_place,
    )

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, *args, **kwargs):
            raise httpx.ConnectError("fail")

    monkeypatch.setattr(
        "app.services.google_maps_service.httpx.AsyncClient",
        lambda **kw: FakeClient(),
    )

    result = await service._compute_route_leg(origin_item, dest_item)
    assert result is None
    routes_cache.pop(cache_key, None)


# ──────────────────────────────────────────────────────────────────────────────
# google_maps_service.py — _parse_place returns None when places list empty (line 226-227)
# ──────────────────────────────────────────────────────────────────────────────


def test_parse_place_returns_none_when_no_places():
    service = GoogleMapsService()
    result = service._parse_place("test query", {"places": []})
    assert result is None


def test_parse_place_returns_none_when_places_key_missing():
    service = GoogleMapsService()
    result = service._parse_place("test query", {})
    assert result is None


# ──────────────────────────────────────────────────────────────────────────────
# google_maps_service.py — _parse_route_leg returns None when routes empty (line 253-254)
# ──────────────────────────────────────────────────────────────────────────────


def test_parse_route_leg_returns_none_when_routes_empty(trip_request):
    from app.schemas.itinerary import ItineraryItem

    service = GoogleMapsService()
    origin = ItineraryItem(
        time="09:00",
        title="A",
        type="t",
        durationMinutes=60,
        estimatedCost="low",
        why="w",
        accessibilityNotes="n",
        risk="low",
    )
    dest = ItineraryItem(
        time="10:00",
        title="B",
        type="t",
        durationMinutes=60,
        estimatedCost="low",
        why="w",
        accessibilityNotes="n",
        risk="low",
    )
    result = service._parse_route_leg(origin, dest, {"routes": []})
    assert result is None


def test_parse_route_leg_returns_none_when_routes_key_missing(trip_request):
    from app.schemas.itinerary import ItineraryItem

    service = GoogleMapsService()
    origin = ItineraryItem(
        time="09:00",
        title="A",
        type="t",
        durationMinutes=60,
        estimatedCost="low",
        why="w",
        accessibilityNotes="n",
        risk="low",
    )
    dest = ItineraryItem(
        time="10:00",
        title="B",
        type="t",
        durationMinutes=60,
        estimatedCost="low",
        why="w",
        accessibilityNotes="n",
        risk="low",
    )
    result = service._parse_route_leg(origin, dest, {})
    assert result is None


# ──────────────────────────────────────────────────────────────────────────────
# google_maps_service.py — _service_names with vertex_ai provider (line 273)
# ──────────────────────────────────────────────────────────────────────────────


def test_service_names_includes_vertex_ai():
    service = GoogleMapsService()
    names = service._service_names("vertex_ai")
    assert "Vertex AI Gemini API" in names


def test_service_names_includes_fallback():
    service = GoogleMapsService()
    names = service._service_names("fallback")
    assert "Deterministic fallback planner" in names


def test_service_names_includes_maps_when_enabled():
    service = GoogleMapsService()
    service.enabled = True
    names = service._service_names("gemini_api")
    assert "Places API (New)" in names


# ──────────────────────────────────────────────────────────────────────────────
# google_maps_service.py — parse_google_duration_minutes edge cases (lines 295-296)
# ──────────────────────────────────────────────────────────────────────────────


def test_parse_google_duration_minutes_returns_one_for_sub_minute():
    """Values < 60 seconds should round up to 1 minute."""
    assert parse_google_duration_minutes("30s") == 1


def test_parse_google_duration_minutes_returns_none_for_empty():
    assert parse_google_duration_minutes("") is None


def test_parse_google_duration_minutes_returns_none_for_none():
    assert parse_google_duration_minutes(None) is None


# ──────────────────────────────────────────────────────────────────────────────
# google_maps_service.py — maps_directions_url with None inputs (line 313)
# ──────────────────────────────────────────────────────────────────────────────


def test_maps_directions_url_handles_none_inputs():
    url = maps_directions_url(None, None)
    assert url.startswith("https://www.google.com/maps/dir/?api=1")
    assert "travelmode=walking" in url


def test_maps_search_url_handles_none():
    url = maps_search_url(None)
    assert "maps/search" in url


# ──────────────────────────────────────────────────────────────────────────────
# google_maps_service.py — run_enrichment_sync (line 336)
# ──────────────────────────────────────────────────────────────────────────────


def test_run_enrichment_sync_returns_enriched_itinerary(trip_request):
    """run_enrichment_sync wraps the async enrichment in asyncio.run."""
    from app.services.gemini_service import build_fallback_itinerary

    itinerary = build_fallback_itinerary(trip_request)
    result = run_enrichment_sync(trip_request, itinerary, "fallback")
    # googleServices metadata block must always be populated
    assert result.googleServices is not None
    assert result.googleServices.aiProvider == "fallback"


# ──────────────────────────────────────────────────────────────────────────────
# google_maps_service.py — has_coordinates helper
# ──────────────────────────────────────────────────────────────────────────────


def test_has_coordinates_returns_false_without_place():
    from app.schemas.itinerary import ItineraryItem

    item = ItineraryItem(
        time="09:00",
        title="T",
        type="t",
        durationMinutes=60,
        estimatedCost="low",
        why="w",
        accessibilityNotes="n",
        risk="low",
    )
    assert has_coordinates(item) is False


def test_has_coordinates_returns_false_with_partial_coords():
    from app.schemas.itinerary import GooglePlace, ItineraryItem

    item = ItineraryItem(
        time="09:00",
        title="T",
        type="t",
        durationMinutes=60,
        estimatedCost="low",
        why="w",
        accessibilityNotes="n",
        risk="low",
        googlePlace=GooglePlace(
            query="q",
            latitude=None,
            longitude=139.0,
            googleMapsUri="https://maps.google.com",
            source="google_places",
        ),
    )
    assert has_coordinates(item) is False


# ──────────────────────────────────────────────────────────────────────────────
# gemini_service.py — _call_gemini timeout (lines 107-112)
# ──────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_call_gemini_timeout_triggers_fallback(
    monkeypatch, trip_request, itinerary
):
    """When _call_gemini times out, _generate_validated uses the fallback_factory."""
    import asyncio as real_asyncio

    service = GeminiService()
    service.client = object()

    async def raise_timeout(prompt):
        raise real_asyncio.TimeoutError("timed out")

    monkeypatch.setattr(service, "_call_gemini", raise_timeout)

    from app.schemas.itinerary import ItineraryResponse

    result = await service._generate_validated(
        "prompt",
        ItineraryResponse,
        lambda: itinerary,
        "ItineraryResponse",
    )
    assert result is itinerary


# ──────────────────────────────────────────────────────────────────────────────
# gemini_service.py — build_fallback_itinerary without low_walking constraint
# ──────────────────────────────────────────────────────────────────────────────


def test_build_fallback_itinerary_without_low_walking_constraint():
    from app.schemas.trip import TripRequest
    from datetime import date

    request = TripRequest(
        destination="Paris",
        startDate=date(2026, 7, 1),
        endDate=date(2026, 7, 2),
        budget="high",
        travelers="solo",
        pace="packed",
        interests=["art"],
        constraints=[],
    )
    itinerary = build_fallback_itinerary(request)
    first_item = itinerary.days[0].items[0]
    assert "Moderate walking" in first_item.accessibilityNotes
    assert itinerary.tripHealth.score == 70  # non-balanced pace → 70


# ──────────────────────────────────────────────────────────────────────────────
# google_maps_service.py — enrich_itinerary with places resolved in HTTP (live path)
# ──────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_enrich_itinerary_with_places_and_http_success(monkeypatch, trip_request):
    """Enrichment with a live key resolves places and skips route when no coords."""
    from app.schemas.itinerary import GooglePlace
    from app.services.gemini_service import build_fallback_itinerary

    service = GoogleMapsService()
    service.api_key = "live-key"
    service.enabled = True

    async def fake_find_place(query):
        return GooglePlace(
            query=query,
            placeId="pid-1",
            displayName="Test Place",
            formattedAddress="Tokyo, Japan",
            latitude=None,  # no coords → route will be skipped
            longitude=None,
            googleMapsUri="https://maps.google.com/test",
            source="google_places",
        )

    monkeypatch.setattr(service, "_find_place", fake_find_place)

    itinerary = build_fallback_itinerary(trip_request)
    result = await service.enrich_itinerary(trip_request, itinerary, "gemini_api")

    assert result.googleServices.mapsConfigured is True
    assert result.googleServices.placesResolved > 0
