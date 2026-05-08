# Deployment Instructions

This project deploys a React frontend and Python backend to Google Cloud Run with one command.

Current Google Cloud defaults:

```sh
PROJECT_ID=promptwars-fade
REGION=us-central1
REPOSITORY=deploy-app
BACKEND_SERVICE=deploy-app-backend
FRONTEND_SERVICE=deploy-app-frontend
```

## 1. Install And Authenticate Google Cloud CLI

Make sure `gcloud` works:

```sh
gcloud --version
gcloud auth login
gcloud config set project promptwars-fade
```

Check the active account and project:

```sh
gcloud auth list
gcloud config list
gcloud projects list
```

The active project should be:

```sh
promptwars-fade
```

## 2. Confirm Billing Is Enabled

Cloud Run, Cloud Build, and Artifact Registry require billing on the Google Cloud project.

Open:

```text
https://console.cloud.google.com/billing/projects
```

Confirm billing is enabled for:

```sh
promptwars-fade
```

## 3. Add Your Backend Code

Put backend code in:

```sh
backend/app
```

The current deploy setup expects FastAPI to expose an app object here:

```sh
backend/app/main.py
```

The Dockerfile runs:

```sh
uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
```

If your backend uses a different entrypoint, update:

```sh
backend/Dockerfile
```

Install backend dependencies by editing:

```sh
backend/requirements.txt
```

Cloud Run requires the backend to listen on the `PORT` environment variable. This project already uses port `8080`.

## 4. Add Your Frontend Code

Put frontend code in:

```sh
frontend
```

The current deploy setup expects:

```sh
npm install
npm run build
```

The build output should be:

```sh
frontend/dist
```

If your frontend build command or output directory is different, update:

```sh
frontend/Dockerfile
frontend/nginx.conf
```

The backend URL is passed into the React build as:

```sh
VITE_API_BASE_URL
```

In frontend code, read it with:

```js
import.meta.env.VITE_API_BASE_URL
```

## 5. Deploy

From the repo root:

```sh
./scripts/deploy.sh
```

Equivalent explicit command:

```sh
PROJECT_ID=promptwars-fade \
REGION=us-central1 \
REPOSITORY=deploy-app \
BACKEND_SERVICE=deploy-app-backend \
FRONTEND_SERVICE=deploy-app-frontend \
./scripts/deploy.sh
```

The script will:

1. Enable required Google Cloud APIs.
2. Create the Artifact Registry Docker repository if it does not exist.
3. Build and push the backend container.
4. Deploy the backend to Cloud Run.
5. Read the backend Cloud Run URL.
6. Build and push the frontend container with `VITE_API_BASE_URL` set to the backend URL.
7. Deploy the frontend to Cloud Run.
8. Update backend CORS with the frontend URL.
9. Print both service URLs.

## 6. Verify Deployment

Check services:

```sh
gcloud run services list \
  --region us-central1 \
  --project promptwars-fade
```

Check backend health:

```sh
curl -fsS https://deploy-app-backend-jp426pkdrq-uc.a.run.app/health
```

Open the frontend URL printed by the deploy script.

## 7. Common Fixes

If `gcloud` is not found, add it to your shell path:

```sh
export PATH="$HOME/Downloads/google-cloud-sdk/bin:$PATH"
```

If Cloud Build says `PERMISSION_DENIED`, retry once after a minute. New API and IAM changes can take a short time to propagate.

If the frontend cannot call the backend, check:

```sh
gcloud run services describe deploy-app-backend \
  --region us-central1 \
  --project promptwars-fade \
  --format='yaml(spec.template.spec.containers.env)'
```

Confirm `FRONTEND_ORIGIN` matches the frontend Cloud Run URL.

If the backend fails to start, inspect logs:

```sh
gcloud run services logs read deploy-app-backend \
  --region us-central1 \
  --project promptwars-fade \
  --limit 100
```

If the frontend fails to start, inspect logs:

```sh
gcloud run services logs read deploy-app-frontend \
  --region us-central1 \
  --project promptwars-fade \
  --limit 100
```

## 8. Redeploy After Code Changes

After changing frontend or backend code:

```sh
./scripts/deploy.sh
```

No manual image tagging, pushing, or Cloud Run setup is needed.

## 9. Optional Cleanup

Delete Cloud Run services:

```sh
gcloud run services delete deploy-app-frontend \
  --region us-central1 \
  --project promptwars-fade

gcloud run services delete deploy-app-backend \
  --region us-central1 \
  --project promptwars-fade
```

Delete Artifact Registry repository:

```sh
gcloud artifacts repositories delete deploy-app \
  --location us-central1 \
  --project promptwars-fade
```
