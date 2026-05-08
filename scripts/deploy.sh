#!/usr/bin/env bash
set -euo pipefail

if ! command -v gcloud >/dev/null 2>&1; then
  for sdk_path in \
    "$HOME/google-cloud-sdk/bin" \
    "$HOME/Downloads/google-cloud-sdk/bin" \
    "/opt/homebrew/Caskroom/google-cloud-sdk/latest/google-cloud-sdk/bin"; do
    if [[ -x "${sdk_path}/gcloud" ]]; then
      export PATH="${sdk_path}:${PATH}"
      break
    fi
  done
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud is required. Install the Google Cloud CLI first." >&2
  exit 1
fi

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

PROJECT_ID="${PROJECT_ID:-promptwars-fade}"
REGION="${REGION:-us-central1}"
REPOSITORY="${REPOSITORY:-deploy-app}"
BACKEND_SERVICE="${BACKEND_SERVICE:-deploy-app-backend}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-deploy-app-frontend}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is not set." >&2
  echo "Run: PROJECT_ID=promptwars-fade ./scripts/deploy.sh" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"
BACKEND_IMAGE="${IMAGE_BASE}/${BACKEND_SERVICE}:latest"
FRONTEND_IMAGE="${IMAGE_BASE}/${FRONTEND_SERVICE}:latest"
BACKEND_ENV_VARS="APP_ENV=production,GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=${REGION}"

append_backend_env() {
  local name="$1"
  local value="$2"
  if [[ -n "${value}" ]]; then
    BACKEND_ENV_VARS="${BACKEND_ENV_VARS},${name}=${value}"
  fi
}

if [[ -n "${GEMINI_API_KEY:-}" ]]; then
  append_backend_env "GEMINI_API_KEY" "${GEMINI_API_KEY}"
elif [[ -n "${GOOGLE_API_KEY:-}" ]]; then
  append_backend_env "GEMINI_API_KEY" "${GOOGLE_API_KEY}"
fi

MAPS_SERVER_KEY="${GOOGLE_MAPS_API_KEY:-${GOOGLE_API_KEY:-}}"
MAPS_EMBED_KEY="${GOOGLE_MAPS_EMBED_API_KEY:-${VITE_GOOGLE_MAPS_EMBED_API_KEY:-${GOOGLE_MAPS_API_KEY:-}}}"
GA_MEASUREMENT_ID="${GOOGLE_ANALYTICS_ID:-${VITE_GA_MEASUREMENT_ID:-}}"

append_backend_env "GOOGLE_MAPS_API_KEY" "${MAPS_SERVER_KEY}"
append_backend_env "GOOGLE_MAPS_EMBED_API_KEY" "${MAPS_EMBED_KEY}"
append_backend_env "GOOGLE_ANALYTICS_ID" "${GA_MEASUREMENT_ID}"
append_backend_env "GOOGLE_GENAI_USE_VERTEXAI" "${GOOGLE_GENAI_USE_VERTEXAI:-}"
append_backend_env "GEMINI_MODEL" "${GEMINI_MODEL:-}"

echo "Using project: ${PROJECT_ID}"
echo "Using region: ${REGION}"
echo "Using repository: ${REPOSITORY}"

gcloud services enable \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  cloudbuild.googleapis.com \
  generativelanguage.googleapis.com \
  maps-embed-backend.googleapis.com \
  places.googleapis.com \
  run.googleapis.com \
  routes.googleapis.com \
  --project "${PROJECT_ID}"

if [[ "${GOOGLE_GENAI_USE_VERTEXAI:-}" =~ ^(1|true|yes)$ ]]; then
  PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
  DEFAULT_RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
  echo "Granting Vertex AI user role to Cloud Run default service account"
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member "serviceAccount:${DEFAULT_RUN_SA}" \
    --role "roles/aiplatform.user" \
    --quiet >/dev/null || echo "Could not update Vertex AI IAM; continue if the service account already has access." >&2
fi

if ! gcloud artifacts repositories describe "${REPOSITORY}" \
  --location "${REGION}" \
  --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "Creating Artifact Registry repository: ${REPOSITORY}"
  if ! gcloud artifacts repositories create "${REPOSITORY}" \
    --repository-format docker \
    --location "${REGION}" \
    --description "Container images for deploy-app" \
    --project "${PROJECT_ID}"; then
    echo "Repository create did not complete cleanly. Rechecking repository state..." >&2
    gcloud artifacts repositories describe "${REPOSITORY}" \
      --location "${REGION}" \
      --project "${PROJECT_ID}" >/dev/null
  fi
fi

echo "Building backend image: ${BACKEND_IMAGE}"
gcloud builds submit "${ROOT_DIR}/backend" \
  --tag "${BACKEND_IMAGE}" \
  --project "${PROJECT_ID}" \
  --verbosity info

echo "Deploying backend service: ${BACKEND_SERVICE}"
gcloud run deploy "${BACKEND_SERVICE}" \
  --image "${BACKEND_IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "${BACKEND_ENV_VARS}" \
  --project "${PROJECT_ID}"

BACKEND_URL="$(gcloud run services describe "${BACKEND_SERVICE}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format 'value(status.url)')"

echo "Building frontend image: ${FRONTEND_IMAGE}"
gcloud builds submit "${ROOT_DIR}/frontend" \
  --substitutions "_VITE_API_BASE_URL=${BACKEND_URL},_VITE_GOOGLE_MAPS_EMBED_API_KEY=${MAPS_EMBED_KEY},_VITE_GA_MEASUREMENT_ID=${GA_MEASUREMENT_ID},_IMAGE=${FRONTEND_IMAGE}" \
  --config "${ROOT_DIR}/frontend/cloudbuild.yaml" \
  --project "${PROJECT_ID}" \
  --verbosity info

echo "Deploying frontend service: ${FRONTEND_SERVICE}"
gcloud run deploy "${FRONTEND_SERVICE}" \
  --image "${FRONTEND_IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --project "${PROJECT_ID}"

FRONTEND_URL="$(gcloud run services describe "${FRONTEND_SERVICE}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format 'value(status.url)')"

FRONTEND_CANONICAL_URL="$(gcloud run services list \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --filter "metadata.name=${FRONTEND_SERVICE}" \
  --format 'value(status.url)' | head -n 1)"

ALLOWED_ORIGINS="${FRONTEND_URL}"
if [[ -n "${FRONTEND_CANONICAL_URL}" && "${FRONTEND_CANONICAL_URL}" != "${FRONTEND_URL}" ]]; then
  ALLOWED_ORIGINS="${ALLOWED_ORIGINS},${FRONTEND_CANONICAL_URL}"
fi

echo "Updating backend CORS origins"
gcloud run services update "${BACKEND_SERVICE}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --update-env-vars "^|^FRONTEND_ORIGIN=${FRONTEND_CANONICAL_URL:-${FRONTEND_URL}}|ALLOWED_ORIGINS=${ALLOWED_ORIGINS}"

echo
echo "Deploy complete."
echo "Backend:  ${BACKEND_URL}"
echo "Frontend: ${FRONTEND_URL}"
if [[ -n "${FRONTEND_CANONICAL_URL}" && "${FRONTEND_CANONICAL_URL}" != "${FRONTEND_URL}" ]]; then
  echo "Frontend canonical: ${FRONTEND_CANONICAL_URL}"
fi
