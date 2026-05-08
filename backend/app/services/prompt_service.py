import json

from app.schemas.replan import ReplanRequest
from app.schemas.trip import TripRequest


PLAN_PROMPT = """You are TripPilot AI, a dynamic travel recovery engine.
Create a practical itinerary from the trip request.
Return JSON only, without markdown.
Do not invent real-time facts, opening hours, weather, live prices, or booking availability.
Include assumptions when live facts would normally be needed.
Use risk labels: low, medium, high.
Use estimatedCost labels: free, low, medium, high.
Include accessibility and budget notes inside each item.
Favor location names that can be opened in Google Maps, but mark any live details as assumptions unless supplied.
Return exactly this JSON shape:
{
  "summary": {"destination": string, "tripStyle": string, "riskLevel": "low|medium|high"},
  "days": [{"day": number, "theme": string, "items": [{"time": "HH:MM", "title": string, "type": string, "durationMinutes": number, "estimatedCost": "free|low|medium|high", "why": string, "accessibilityNotes": string, "risk": "low|medium|high"}]}],
  "assumptions": [string],
  "fallbacks": [string],
  "tripHealth": {"score": number, "issues": [string], "recommendations": [string]}
}
Trip request:
"""


REPLAN_PROMPT = """You are TripPilot AI, a dynamic travel recovery engine.
Replan from the exact disruption day and time.
Determine which itinerary items are affected because they are currently happening, start after the disruption time, or are made risky by the disruption.
Preserve completed earlier items.
Minimize changes and show how the traveler can catch up to the original itinerary when possible.
Return 2 or 3 concrete recovery options. One option should be recommended.
Return JSON only, without markdown.
Do not invent real-time facts, opening hours, weather, live prices, or booking availability.
Explain why each replacement is better under the disruption and user constraints.
Return exactly this JSON shape:
{
  "changeSummary": string,
  "affectedItems": [string],
  "replacementItems": [{"time": "HH:MM", "title": string, "type": string, "durationMinutes": number, "estimatedCost": "free|low|medium|high", "why": string, "accessibilityNotes": string, "risk": "low|medium|high"}],
  "reasoningSummary": string,
  "confidence": number,
  "nextActions": [string],
  "recommendedOptionId": string,
  "options": [
    {
      "id": string,
      "label": string,
      "strategy": string,
      "affectedDay": number,
      "replaceFromTime": "HH:MM",
      "replaceUntilTime": "HH:MM",
      "replacementItems": [{"time": "HH:MM", "title": string, "type": string, "durationMinutes": number, "estimatedCost": "free|low|medium|high", "why": string, "accessibilityNotes": string, "risk": "low|medium|high"}],
      "catchUpPlan": string,
      "tradeoffs": [string],
      "confidence": number,
      "nextActions": [string]
    }
  ]
}
Replan request:
"""


def build_plan_prompt(trip_request: TripRequest) -> str:
    return PLAN_PROMPT + trip_request.model_dump_json()


def build_replan_prompt(request: ReplanRequest) -> str:
    return REPLAN_PROMPT + json.dumps(request.model_dump(mode="json"), ensure_ascii=True)


def build_repair_prompt(raw_text: str, validation_error: str, target_shape: str) -> str:
    return (
        "Repair the following model output into valid JSON only. "
        "No markdown, no commentary. Target shape: "
        f"{target_shape}\nValidation error: {validation_error}\nOutput:\n{raw_text}"
    )
