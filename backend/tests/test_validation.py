import pytest

from app.schemas.itinerary import ItineraryResponse
from app.schemas.trip import TripRequest
from app.services.validation import extract_json, validate_json


def test_extract_json_accepts_markdown_fenced_json(itinerary):
    text = f"```json\n{itinerary.model_dump_json()}\n```"

    assert extract_json(text)["summary"]["destination"] == "Tokyo"


def test_extract_json_finds_json_inside_extra_text(itinerary):
    text = f"Here is the plan:\n{itinerary.model_dump_json()}\nDone."

    assert extract_json(text)["tripHealth"]["score"] == 78


def test_validate_json_raises_value_error_for_bad_payload():
    with pytest.raises(ValueError):
        validate_json('{"summary": {"destination": "Tokyo"}}', ItineraryResponse)


def test_trip_request_normalizes_destination_and_lists():
    request = TripRequest(
        destination="  New   York  ",
        startDate="2026-06-12",
        endDate="2026-06-13",
        interests=["  food   halls  ", ""],
        constraints=["  low   walking  "],
    )

    assert request.destination == "New York"
    assert request.interests == ["food halls"]
    assert request.constraints == ["low walking"]


def test_trip_request_rejects_overlong_trip():
    with pytest.raises(ValueError, match="Trip length cannot exceed"):
        TripRequest(
            destination="Tokyo",
            startDate="2026-06-01",
            endDate="2026-06-30",
        )
