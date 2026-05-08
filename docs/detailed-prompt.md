Challange - 
Travel Planning & Experience Engine :
Plan trips dynamically with preferences, constraints, and real-time update`s

Build **TripPilot AI: Dynamic Travel Recovery Engine**.

Not a generic travel planner. The app should prove one thing clearly:

> “When travel conditions change, this system intelligently replans the trip around user constraints.”

That fits the problem statement better than just itinerary generation.

**Backend Architecture**

```txt
backend/
  main.py
  routes/
    plan.py
    replan.py
    health.py
  services/
    gemini_service.py
    prompt_service.py
    mock_updates.py
    validation.py
  schemas/
    trip.py
    itinerary.py
    replan.py
  config.py
```

Core endpoints:

```txt
GET  /health
POST /api/plan
POST /api/replan
GET  /api/live-updates/demo
```

`/api/plan`:
- Takes destination, dates, budget, traveler profile, interests, constraints.
- Returns structured itinerary JSON.

`/api/replan`:
- Takes original itinerary + disruption/update.
- Returns changed itinerary items, explanation, confidence, next actions.

`/api/live-updates/demo`:
- Returns simulated updates like weather, closure, delay, budget change.
- This lets us demo “real-time” behavior without depending on fragile external APIs.

**Frontend Architecture**

```txt
frontend/
  src/
    App.jsx
    api/client.js
    components/
      TripForm.jsx
      ItineraryView.jsx
      DayCard.jsx
      UpdatePanel.jsx
      ReplanResult.jsx
      LoadingState.jsx
      ErrorBanner.jsx
    styles/
```

One-screen UI:

```txt
Left/top:
  Trip input form

Center:
  Generated itinerary cards

Right/bottom:
  Real-time update simulator
  Replan result
  Explanation + next actions
```

No auth. No dashboard. No booking. No complex map.

**Core Workflow**

1. User enters:
   - destination
   - dates
   - trip style
   - budget
   - traveler type
   - interests
   - constraints

2. Backend calls Gemini and returns structured itinerary.

3. User clicks a disruption:
   - “Heavy rain”
   - “Flight delayed”
   - “Attraction closed”
   - “Too tired”
   - “Budget reduced”

4. Backend calls Gemini again with:
   - original plan
   - user constraints
   - disruption
   - current day/time context

5. Frontend shows:
   - what changed
   - why it changed
   - replacement activities
   - risk/confidence
   - next actions

**Data Models**

Trip request:

```json
{
  "destination": "Tokyo",
  "startDate": "2026-06-12",
  "endDate": "2026-06-14",
  "budget": "medium",
  "travelers": "family",
  "pace": "balanced",
  "interests": ["food", "culture", "shopping"],
  "constraints": ["low walking", "vegetarian options"]
}
```

Itinerary response:

```json
{
  "summary": {
    "destination": "Tokyo",
    "tripStyle": "balanced",
    "riskLevel": "low"
  },
  "days": [
    {
      "day": 1,
      "theme": "Arrival and neighborhood exploration",
      "items": [
        {
          "time": "10:00",
          "title": "Visit Asakusa",
          "type": "attraction",
          "durationMinutes": 120,
          "estimatedCost": "low",
          "why": "Cultural highlight with flexible pacing.",
          "accessibilityNotes": "Mostly flat walking area.",
          "risk": "medium"
        }
      ]
    }
  ],
  "assumptions": [],
  "fallbacks": []
}
```

Replan response:

```json
{
  "changeSummary": "Day 2 outdoor activities were replaced due to heavy rain.",
  "affectedItems": ["Ueno Park walk"],
  "replacementItems": [],
  "reasoningSummary": "Indoor cultural activities better match weather and low-walking constraints.",
  "confidence": 0.86,
  "nextActions": [
    "Book museum tickets",
    "Use subway route instead of walking route"
  ]
}
```

**AI Integration**

Use Gemini only from backend. Do not expose API keys to React.

Python service shape:

```python
class GeminiService:
    async def generate_itinerary(self, trip_request: TripRequest) -> ItineraryResponse:
        ...

    async def replan_itinerary(self, request: ReplanRequest) -> ReplanResponse:
        ...
```

Important implementation detail: even if Gemini returns invalid JSON, backend should recover.

Validation flow:

```txt
Gemini text output
  -> extract JSON
  -> validate with Pydantic
  -> if invalid, retry once with repair prompt
  -> if still invalid, return graceful fallback
```

That’s a good judging point: production-minded AI handling.

**Prompt Strategy**

Use two prompts only:

1. `PLAN_PROMPT`
2. `REPLAN_PROMPT`

Both should demand:

- JSON only
- no markdown
- no invented real-time facts
- confidence scores
- assumptions
- risk labels
- accessibility/budget notes

This keeps the AI feature reliable.

**Google Cloud Fit**

Since deployment is already handled, we should keep runtime simple:

```txt
React build
FastAPI backend
Environment variables:
  GEMINI_API_KEY
  ALLOWED_ORIGINS
  APP_ENV
```

Likely deployment options:

- FastAPI on Cloud Run
- React static build on Cloud Run, Firebase Hosting, or Cloud Storage/CDN
- Or single Cloud Run service serving frontend build + API

For competition speed, I’d prefer:

> Single deployable backend service serving FastAPI API and React static assets.

Unless your repo already separates frontend/backend cleanly.

**MVP Priority**

Build in this order:

1. FastAPI schemas and `/health`
2. React one-screen UI with mock itinerary
3. `/api/plan` using Gemini
4. Itinerary rendering
5. `/api/replan` using Gemini
6. Disruption buttons
7. Loading/error/fallback states
8. Polish labels and demo data
9. Confirm Google Cloud deploy works

**One High-Scoring Feature**

Add **Trip Risk Score**.

Example:

```json
{
  "tripHealth": {
    "score": 78,
    "issues": [
      "Day 2 has too much outdoor activity for rainy conditions.",
      "Lunch gap is too long for family travel."
    ],
    "recommendations": [
      "Move museum visit earlier.",
      "Add rest stop after lunch."
    ]
  }
}
```

This makes the product feel like an engine, not just a generator.

**What I Would Build**

Final app concept:

**TripPilot**
AI-powered dynamic travel planner for real-world disruptions.

Core demo:
1. Plan a trip.
2. Simulate a disruption.
3. Replan intelligently.
4. Show why the new plan is better.

That is the strongest version for Python + FastAPI + React + Google Cloud under competition constraints.