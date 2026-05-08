from fastapi.testclient import TestClient
from app.main import app
from app.services.gemini_service import build_fallback_itinerary, build_fallback_replan

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_plan_rejects_end_date_before_start_date():
    response = client.post(
        "/api/plan",
        json={
            "destination": "Tokyo",
            "startDate": "2026-06-14",
            "endDate": "2026-06-12",
            "budget": "medium",
            "travelers": "couple",
            "pace": "balanced",
            "interests": ["food"],
            "constraints": [],
        },
    )

    assert response.status_code == 422


def test_plan_returns_fallback_without_gemini_key(monkeypatch):
    from app.services.gemini_service import GeminiService

    def use_fallback(self):
        self.client = None

    monkeypatch.setattr(GeminiService, "__init__", use_fallback)

    response = client.post(
        "/api/plan",
        json={
            "destination": "  Tokyo   Japan  ",
            "startDate": "2026-06-12",
            "endDate": "2026-06-13",
            "budget": "medium",
            "travelers": "family",
            "pace": "balanced",
            "interests": ["food"],
            "constraints": ["low walking"],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["destination"] == "Tokyo Japan"
    assert len(body["days"]) == 2
    assert body["tripHealth"]["score"] >= 0


def test_demo_updates_returns_disruption_catalog():
    response = client.get("/api/live-updates/demo")

    assert response.status_code == 200
    body = response.json()
    assert {item["category"] for item in body} >= {"weather", "transport", "closure"}


def test_plan_endpoint_uses_service_result(monkeypatch, trip_request):
    from app.services.gemini_service import GeminiService

    expected = build_fallback_itinerary(trip_request)

    async def fake_generate(self, request):
        return expected

    monkeypatch.setattr(GeminiService, "generate_itinerary", fake_generate)

    response = client.post("/api/plan", json=trip_request.model_dump(mode="json"))

    assert response.status_code == 200
    assert response.json()["summary"]["destination"] == "Tokyo"


def test_plan_stream_returns_ndjson(monkeypatch, trip_request):
    from app.routes import plan
    from app.services.gemini_service import GeminiService

    expected = build_fallback_itinerary(trip_request)

    async def fake_generate(self, request):
        return expected

    async def no_sleep(seconds):
        return None

    monkeypatch.setattr(GeminiService, "generate_itinerary", fake_generate)
    monkeypatch.setattr(plan.asyncio, "sleep", no_sleep)

    response = client.post("/api/plan/stream", json=trip_request.model_dump(mode="json"))

    assert response.status_code == 200
    lines = [line for line in response.text.splitlines() if line]
    assert lines[0].startswith('{"type": "status"')
    assert '"type": "summary"' in lines[1]
    assert '"type": "complete"' in lines[-1]


def test_replan_endpoint_uses_service_result(monkeypatch, replan_request):
    from app.services.gemini_service import GeminiService

    expected = build_fallback_replan(replan_request)

    async def fake_replan(self, request):
        return expected

    monkeypatch.setattr(GeminiService, "replan_itinerary", fake_replan)

    response = client.post("/api/replan", json=replan_request.model_dump(mode="json"))

    assert response.status_code == 200
    assert response.json()["recommendedOptionId"] == "minimal-change"


def test_replan_rejects_invalid_time(replan_request):
    payload = replan_request.model_dump(mode="json")
    payload["disruptionTime"] = "9am"

    response = client.post("/api/replan", json=payload)

    assert response.status_code == 422
