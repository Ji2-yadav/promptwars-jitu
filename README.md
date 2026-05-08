# React + Python Google Cloud Deploy Starter

This repo is ready to deploy a React frontend and Python backend to Google Cloud Run with one command.

## What it creates

- `backend`: FastAPI service deployed to Cloud Run.
- `frontend`: Vite React app served by nginx on Cloud Run.
- `scripts/deploy.sh`: one-command deploy that enables required APIs, creates an Artifact Registry repo, builds both containers, deploys both services, and wires the frontend to the backend URL.

## Prerequisites

Install and authenticate the Google Cloud CLI:

```sh
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

You also need billing enabled on the Google Cloud project.

## Deploy

```sh
./scripts/deploy.sh
```

Optional environment variables:

```sh
PROJECT_ID=your-project \
REGION=us-central1 \
REPOSITORY=deploy-app \
BACKEND_SERVICE=deploy-app-backend \
FRONTEND_SERVICE=deploy-app-frontend \
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

## Replace With Your App

- Put your Python backend inside `backend/app`.
- Keep `backend/app/main.py` exposing `app`, or update `backend/Dockerfile`.
- Put your React app inside `frontend`.
- Keep `npm run build` producing `frontend/dist`, or update `frontend/Dockerfile`.

