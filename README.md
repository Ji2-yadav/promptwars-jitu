# TripPilot AI

## Submission

- Public GitHub repository: [https://github.com/Ji2-yadav/promptwars-jitu](https://github.com/Ji2-yadav/promptwars-jitu)
- Complete project code: included in this repository under `backend/`, `frontend/`, `scripts/`, and `docs/`
- Chosen vertical: Travel Planning & Experience Engine

The previous detailed README content has been moved to [`docs/project-guide.md`](docs/project-guide.md). Google service details are documented in [`docs/google-services.md`](docs/google-services.md), and deployment steps are in [`docs/deployment-instructions.md`](docs/deployment-instructions.md).

## Chosen Vertical

TripPilot AI targets the **Travel Planning & Experience Engine** vertical: planning trips dynamically with traveler preferences, budget, constraints, and changing real-world conditions.

The project focuses on a practical travel recovery flow rather than a static itinerary generator. A traveler can create a trip plan, receive a day-by-day itinerary, simulate a disruption, and get an updated plan that explains what changed and why.

## Approach And Logic

The solution is built around three decisions:

1. Treat the itinerary as structured data, not plain generated text.
2. Keep AI calls on the backend so API keys and validation stay server-side.
3. Make disruption recovery the main product moment, since the vertical requires dynamic replanning.

The backend validates trip inputs, prompts Gemini or Vertex AI Gemini for structured JSON, checks the result with Pydantic schemas, and falls back to deterministic plans when model credentials are unavailable. Google Maps services enrich itinerary items with place and route context when API keys are configured.

## How The Solution Works

The React frontend collects destination, dates, traveler type, pace, budget, interests, and constraints. It calls the FastAPI backend to generate an itinerary, then renders the plan with activity cards, map context, risk notes, and accessibility or budget guidance.

For dynamic updates, the frontend can send a disruption such as rain, a closure, fatigue, delay, or budget reduction. The backend compares that update against the original plan and traveler constraints, asks the AI service for recovery options, validates the response, and returns replacement activities, reasoning, confidence, and next actions.

The app is deployable as separate Cloud Run services for the backend and frontend. The deploy script builds containers, enables required Google Cloud APIs, deploys both services, and wires the frontend to the backend URL.

## Assumptions

- Demo disruptions are simulated so judging does not depend on unreliable live event feeds.
- Google API keys are supplied through environment variables and are not committed to the repository.
- Gemini or Vertex AI Gemini is preferred, but the app remains usable with deterministic fallback data when model credentials are missing.
- The product does not handle booking, payments, user accounts, or authentication.
- Maps enrichment improves the output when enabled, but itinerary generation and replanning still work without it.
