# TripPilot AI — Dynamic Travel Planning & Experience Engine

TripPilot AI answers the hackathon challenge **"Plan trips dynamically with preferences, constraints, and real-time updates"**.

It lets travellers describe their trip in a step-by-step wizard, streams a personalised day-by-day itinerary powered by **Google Gemini AI**, enriches every activity with live **Google Maps** place data, then lets the traveller simulate a real disruption (weather, closure, fatigue, budget cut) and instantly generate **AI-powered recovery options**.

See also: [`docs/google-services.md`](google-services.md) for the full Google services matrix.

## What it creates

- `backend`: FastAPI service with `/api/plan`, `/api/plan/stream`, `/api/replan`, `/api/live-updates/demo`, `/api/google/status`, and `/health`.
- `frontend`: Vite React one-screen workflow for trip setup, itinerary review, disruption simulation, and recovery results.
- `scripts/deploy.sh`: one-command deploy that enables required APIs, creates an Artifact Registry repo, builds both containers, deploys both services, and wires the frontend to the backend URL.

The backend uses Gemini when `GEMINI_API_KEY` or `GOOGLE_API_KEY` is set. It can also use Vertex AI Gemini when `GOOGLE_GENAI_USE_VERTEXAI=true`, `GOOGLE_CLOUD_PROJECT`, and `GOOGLE_CLOUD_LOCATION` are configured. Without model credentials, it returns deterministic fallback plans so the demo still works locally and in judging environments.

## Google Services Used

- Gemini API or Vertex AI Gemini API for itinerary and disruption recovery generation.
- Places API (New) to resolve itinerary stops into Google place IDs, addresses, ratings, and map URLs.
- Routes API to estimate walking legs between itinerary stops for accessibility-aware route context.
- Maps Embed API to render day-by-day itinerary maps with pins and waypoints in the UI.
- Google Analytics 4 can track itinerary generation and replanning events when a measurement ID is provided.
- Cloud Run, Cloud Build, and Artifact Registry power the deployment pipeline.

## Prerequisites

Install and authenticate the Google Cloud CLI:

```sh
gcloud auth login
gcloud auth application-default login
gcloud config set project promptwars-fade
```

You also need billing enabled on the Google Cloud project.

## Deploy

```sh
./scripts/deploy.sh
```

Optional environment variables:

```sh
PROJECT_ID=promptwars-fade \
REGION=us-central1 \
REPOSITORY=deploy-app \
BACKEND_SERVICE=deploy-app-backend \
FRONTEND_SERVICE=deploy-app-frontend \
GEMINI_API_KEY=your_key_here \
GOOGLE_MAPS_API_KEY=server_maps_key_here \
GOOGLE_MAPS_EMBED_API_KEY=browser_restricted_embed_key_here \
./scripts/deploy.sh
```

Optional Vertex AI mode:

```sh
GOOGLE_GENAI_USE_VERTEXAI=true \
GOOGLE_CLOUD_PROJECT=promptwars-fade \
GOOGLE_CLOUD_LOCATION=us-central1 \
./scripts/deploy.sh
```

For browser maps, prefer a restricted `GOOGLE_MAPS_EMBED_API_KEY` allowed only for the deployed frontend origin and the Maps Embed API. The server-side `GOOGLE_MAPS_API_KEY` is used only by the backend for Places and Routes enrichment.

At the end, the script prints the backend and frontend URLs.

## Local Development

Backend:

```sh
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

Frontend:

```sh
cd frontend
npm install
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

Open:

```text
http://localhost:5173
```

## Running Tests

Backend (Python / pytest):

```sh
cd backend
source .venv/bin/activate
pytest tests/ -v            # run all 40+ tests
pytest tests/ --cov=app --cov-report=term-missing  # with coverage
```

Frontend (Vitest):

```sh
cd frontend
npm test                    # run all component tests
npm run test:coverage       # with V8 coverage report
```

## Accessibility

All interactive elements have descriptive `aria-label` attributes, and the UI is keyboard-navigable. ARIA live regions announce streaming status updates to screen readers.
