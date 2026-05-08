# TripPilot AI

TripPilot AI is a dynamic travel recovery demo: generate a structured trip plan, simulate a real-world disruption, and replan around traveler constraints.

## What it creates

- `backend`: FastAPI service with `/api/plan`, `/api/replan`, `/api/live-updates/demo`, and `/health`.
- `frontend`: Vite React one-screen workflow for trip setup, itinerary review, disruption simulation, and recovery results.
- `scripts/deploy.sh`: one-command deploy that enables required APIs, creates an Artifact Registry repo, builds both containers, deploys both services, and wires the frontend to the backend URL.

The backend uses Gemini when `GEMINI_API_KEY` is set. Without a key, it returns deterministic fallback plans so the demo still works locally and in judging environments.

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
./scripts/deploy.sh
```

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
