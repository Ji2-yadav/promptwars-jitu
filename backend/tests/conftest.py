from datetime import date

import pytest

from app.schemas.itinerary import (
    DayPlan,
    ItineraryItem,
    ItineraryResponse,
    ItinerarySummary,
    TripHealth,
)
from app.schemas.replan import Disruption, ReplanRequest
from app.schemas.trip import TripRequest


@pytest.fixture
def trip_request() -> TripRequest:
    return TripRequest(
        destination="Tokyo",
        startDate=date(2026, 6, 12),
        endDate=date(2026, 6, 14),
        budget="medium",
        travelers="family",
        pace="balanced",
        interests=["food", "culture"],
        constraints=["low walking"],
    )


@pytest.fixture
def itinerary() -> ItineraryResponse:
    return ItineraryResponse(
        summary=ItinerarySummary(
            destination="Tokyo",
            tripStyle="balanced",
            riskLevel="medium",
        ),
        days=[
            DayPlan(
                day=1,
                theme="Arrival and neighborhoods",
                items=[
                    ItineraryItem(
                        time="09:30",
                        title="Breakfast market",
                        type="food",
                        durationMinutes=60,
                        estimatedCost="low",
                        why="Keeps the morning flexible.",
                        accessibilityNotes="Flat route and seating nearby.",
                        risk="low",
                    ),
                    ItineraryItem(
                        time="14:00",
                        title="Outdoor garden",
                        type="nature",
                        durationMinutes=120,
                        estimatedCost="medium",
                        why="Matches the nature interest.",
                        accessibilityNotes="Use transit to reduce walking.",
                        risk="medium",
                    ),
                ],
            )
        ],
        assumptions=["Live details need verification."],
        fallbacks=["Use an indoor stop if weather changes."],
        tripHealth=TripHealth(
            score=78, issues=["Weather risk"], recommendations=["Keep backup stops"]
        ),
    )


@pytest.fixture
def disruption() -> Disruption:
    return Disruption(
        id="heavy-rain",
        label="Heavy rain",
        category="weather",
        severity="high",
        description="Outdoor block is risky.",
    )


@pytest.fixture
def replan_request(trip_request, itinerary, disruption) -> ReplanRequest:
    return ReplanRequest(
        trip=trip_request,
        itinerary=itinerary,
        disruption=disruption,
        affectedDay=1,
        disruptionTime="13:00",
        minimizeChanges=True,
    )
