from datetime import timedelta

from app.config import get_settings
from app.schemas.itinerary import (
    DayPlan,
    ItineraryItem,
    ItineraryResponse,
    ItinerarySummary,
    TripHealth,
)
from app.schemas.replan import RecoveryOption, ReplanRequest, ReplanResponse
from app.schemas.trip import TripRequest
from app.services.prompt_service import (
    build_plan_prompt,
    build_repair_prompt,
    build_replan_prompt,
)
from app.services.validation import validate_json


class GeminiService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = None
        if self.settings.gemini_api_key:
            try:
                from google import genai

                self.client = genai.Client(api_key=self.settings.gemini_api_key)
            except Exception:
                self.client = None

    async def generate_itinerary(self, trip_request: TripRequest) -> ItineraryResponse:
        if not self.client:
            return build_fallback_itinerary(trip_request)

        prompt = build_plan_prompt(trip_request)
        return await self._generate_validated(
            prompt,
            ItineraryResponse,
            lambda: build_fallback_itinerary(trip_request),
            "ItineraryResponse",
        )

    async def replan_itinerary(self, request: ReplanRequest) -> ReplanResponse:
        if not self.client:
            return build_fallback_replan(request)

        prompt = build_replan_prompt(request)
        return await self._generate_validated(
            prompt,
            ReplanResponse,
            lambda: build_fallback_replan(request),
            "ReplanResponse",
        )

    async def _generate_validated(self, prompt, model, fallback_factory, shape_name):
        try:
            text = await self._call_gemini(prompt)
            try:
                return validate_json(text, model)
            except ValueError as exc:
                repair_prompt = build_repair_prompt(text, str(exc), shape_name)
                repaired = await self._call_gemini(repair_prompt)
                return validate_json(repaired, model)
        except Exception:
            return fallback_factory()

    async def _call_gemini(self, prompt: str) -> str:
        import asyncio

        def run() -> str:
            response = self.client.models.generate_content(
                model=self.settings.gemini_model,
                contents=prompt,
            )
            return getattr(response, "text", "") or str(response)

        return await asyncio.to_thread(run)


def build_fallback_itinerary(trip_request: TripRequest) -> ItineraryResponse:
    day_count = min((trip_request.endDate - trip_request.startDate).days + 1, 5)
    interest = trip_request.interests[0] if trip_request.interests else "local highlights"
    low_walking = any("walking" in item.lower() for item in trip_request.constraints)
    days = []

    for index in range(day_count):
        current_date = trip_request.startDate + timedelta(days=index)
        days.append(
            DayPlan(
                day=index + 1,
                theme=f"{current_date:%b %d}: flexible {interest} day",
                items=[
                    ItineraryItem(
                        time="09:30",
                        title=f"{trip_request.destination} orientation loop",
                        type="neighborhood",
                        durationMinutes=90,
                        estimatedCost="low",
                        why="Starts with a flexible overview that can expand or contract around energy and weather.",
                        accessibilityNotes="Use transit between stops; keep walking segments short."
                        if low_walking
                        else "Moderate walking with cafe breaks available.",
                        risk="low",
                    ),
                    ItineraryItem(
                        time="12:30",
                        title="Constraint-friendly lunch stop",
                        type="food",
                        durationMinutes=75,
                        estimatedCost=trip_request.budget,
                        why="Creates a reliable meal anchor before the main activity block.",
                        accessibilityNotes="Pick a seated venue near transit with menu options matching constraints.",
                        risk="low",
                    ),
                    ItineraryItem(
                        time="15:00",
                        title=f"{interest.title()} experience with indoor backup",
                        type="experience",
                        durationMinutes=120,
                        estimatedCost="medium" if trip_request.budget != "low" else "low",
                        why="Matches stated interests while preserving a backup if conditions change.",
                        accessibilityNotes="Choose a venue with elevator access and nearby transit where possible.",
                        risk="medium",
                    ),
                ],
            )
        )

    return ItineraryResponse(
        summary=ItinerarySummary(
            destination=trip_request.destination,
            tripStyle=trip_request.pace,
            riskLevel="medium",
        ),
        days=days,
        assumptions=[
            "Live weather, closure, and ticket availability were not checked.",
            "Transit time is estimated and should be verified before departure.",
        ],
        fallbacks=[
            "Move outdoor blocks to indoor museums, markets, or dining districts.",
            "Reduce paid activities first if the budget changes.",
        ],
        tripHealth=TripHealth(
            score=78 if trip_request.pace == "balanced" else 70,
            issues=["Some activities need live availability checks before committing."],
            recommendations=[
                "Keep one indoor fallback per day.",
                "Place meals near transit to reduce recovery time after disruptions.",
            ],
        ),
    )


def build_fallback_replan(request: ReplanRequest) -> ReplanResponse:
    affected_day = next(
        (day for day in request.itinerary.days if day.day == request.affectedDay),
        request.itinerary.days[0],
    )
    future_items = [
        item
        for item in affected_day.items
        if item.time >= request.disruptionTime
    ]
    affected = [item.title for item in future_items] or [affected_day.items[-1].title]
    replace_from = future_items[0].time if future_items else request.disruptionTime
    replace_until = future_items[-1].time if future_items else request.disruptionTime
    is_budget = request.disruption.category == "budget"
    is_tired = request.disruption.category == "traveler"

    option_one_items = [
        ItineraryItem(
            time=max(request.disruptionTime, replace_from),
            title="Low-risk replacement near current route"
            if not is_budget
            else "Free neighborhood and market alternative",
            type="recovery-plan",
            durationMinutes=90 if is_tired else 120,
            estimatedCost="free" if is_budget else "low",
            why=f"Reduces exposure to {request.disruption.label.lower()} while preserving the original day structure.",
            accessibilityNotes="Prioritize direct transit, seating, and short walking transfers.",
            risk="low",
        )
    ]
    option_two_items = [
        ItineraryItem(
            time=max(request.disruptionTime, replace_from),
            title="Short recovery break and nearby flexible stop",
            type="buffer",
            durationMinutes=60,
            estimatedCost="low",
            why="Adds recovery time first, then keeps the next feasible original block intact.",
            accessibilityNotes="Choose a seated stop close to the next planned area.",
            risk="low",
        )
    ]
    option_three_items = [
        ItineraryItem(
            time=max(request.disruptionTime, replace_from),
            title="Swap with an indoor fallback from later in the trip",
            type="swap",
            durationMinutes=120,
            estimatedCost="medium" if request.trip.budget != "low" else "low",
            why="Uses an existing trip intent instead of introducing a completely new activity.",
            accessibilityNotes="Verify transit access and keep transfers short.",
            risk="medium",
        )
    ]
    options = [
        RecoveryOption(
            id="minimal-change",
            label="Minimal change",
            strategy="Replace only the affected block and preserve the rest of the day.",
            affectedDay=affected_day.day,
            replaceFromTime=replace_from,
            replaceUntilTime=replace_until,
            replacementItems=option_one_items,
            catchUpPlan="Resume the original itinerary at the next unaffected timed item.",
            tradeoffs=["May skip one lower-priority planned activity."],
            confidence=0.86,
            nextActions=["Confirm the replacement is open before leaving.", "Use the closest transit-first route."],
        ),
        RecoveryOption(
            id="rest-first",
            label="Rest first",
            strategy="Protect traveler energy, then rejoin the original plan.",
            affectedDay=affected_day.day,
            replaceFromTime=replace_from,
            replaceUntilTime=replace_until,
            replacementItems=option_two_items,
            catchUpPlan="Shorten or skip the least important affected activity, then continue from the next meal or anchor stop.",
            tradeoffs=["Less sightseeing, lower fatigue risk."],
            confidence=0.8,
            nextActions=["Pick a seated location near the next planned area.", "Move optional shopping to another day."],
        ),
        RecoveryOption(
            id="swap-later",
            label="Swap later activity",
            strategy="Pull a lower-risk fallback forward and move the disrupted item later.",
            affectedDay=affected_day.day,
            replaceFromTime=replace_from,
            replaceUntilTime=replace_until,
            replacementItems=option_three_items,
            catchUpPlan="Move the original affected item into a later fallback window if conditions improve.",
            tradeoffs=["More planning overhead, but preserves more trip intent."],
            confidence=0.74,
            nextActions=["Check tomorrow's flexible windows.", "Save the disrupted item as a later fallback."],
        ),
    ]

    return ReplanResponse(
        changeSummary=f"{request.disruption.label} at {request.disruptionTime} affects Day {affected_day.day} from {replace_from}.",
        affectedItems=affected,
        replacementItems=option_one_items,
        reasoningSummary="Earlier completed items are preserved. Only the current and upcoming affected blocks are replaced, with a catch-up point at the next unaffected itinerary item.",
        confidence=0.86,
        nextActions=options[0].nextActions,
        recommendedOptionId="minimal-change",
        options=options,
    )
