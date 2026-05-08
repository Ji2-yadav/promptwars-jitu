# Google Services Integration

TripPilot AI is built on a **full Google Cloud stack**. The table below maps every Google product used to the source file(s) that integrate it.

## Services Matrix

| Google Service | Role | Source |
|---|---|---|
| **Google Gemini API** (`gemini-2.0-flash`) | Primary AI engine for itinerary generation and disruption replanning | `backend/app/services/gemini_service.py` |
| **Vertex AI Gemini API** | Production deployment path — same model via Vertex AI when `GOOGLE_GENAI_USE_VERTEXAI=true` | `backend/app/services/gemini_service.py` |
| **Places API (New)** | Resolves activity titles to structured place records (coordinates, ratings, canonical Maps URIs) | `backend/app/services/google_maps_service.py` |
| **Routes API** | Computes walking legs between consecutive daily stops | `backend/app/services/google_maps_service.py` |
| **Maps Embed API** | Renders interactive day-route map iframes with directions and waypoints | `frontend/src/components/StreamingItineraryView.jsx` |
| **Google Maps JS (search & directions URLs)** | Fall-back deep-links that open Google Maps in a new tab for every activity | `frontend/src/components/StreamingItineraryView.jsx` |
| **Google Cloud Run** | Hosts both the FastAPI backend and the Nginx-served React frontend as serverless containers | `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/cloudbuild.yaml` |
| **Google Cloud Build** | CI/CD pipeline — builds and pushes container images on every push | `frontend/cloudbuild.yaml`, `.github/` |
| **Artifact Registry** | Stores container images produced by Cloud Build | referenced in `frontend/cloudbuild.yaml` |
| **Google Analytics (GA4)** | Tracks key user events (`generate_itinerary`, `replan_disruption`) with IP anonymisation | `frontend/src/telemetry.js` |

## Architecture Diagram

```
Browser
  │
  ├─► React SPA (Cloud Run — Nginx)
  │     ├─ Maps Embed API  (iframe — day route maps)
  │     ├─ Google Maps deep-links (search / directions)
  │     └─ Google Analytics (gtag.js — GA4 events)
  │
  └─► FastAPI (Cloud Run — Python)
        ├─ Gemini API / Vertex AI  (itinerary + replan LLM calls)
        ├─ Places API (New)        (activity → place enrichment)
        └─ Routes API              (walking route between stops)
```

## Environment Variables

| Variable | Service |
|---|---|
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Gemini API (direct key) |
| `GOOGLE_GENAI_USE_VERTEXAI` | Enable Vertex AI path |
| `GOOGLE_CLOUD_PROJECT` / `PROJECT_ID` | Vertex AI project |
| `GOOGLE_CLOUD_LOCATION` / `REGION` | Vertex AI region (default `us-central1`) |
| `GOOGLE_MAPS_API_KEY` | Places API + Routes API |
| `GOOGLE_MAPS_EMBED_API_KEY` / `VITE_GOOGLE_MAPS_EMBED_API_KEY` | Maps Embed API |
| `GOOGLE_ANALYTICS_ID` / `VITE_GA_MEASUREMENT_ID` | Google Analytics GA4 |
| `GOOGLE_MAPS_ENRICHMENT_ENABLED` | Toggle Maps enrichment (default `true`) |

## Graceful Degradation

All Google service integrations are **optional at runtime**:

- **No Gemini key** → deterministic fallback planner generates a structured itinerary.
- **No Maps API key** → activities get Google Maps search-URL deep-links instead of resolved place data.
- **No Embed API key** → map iframes use the public `output=embed` fallback URL.
- **No Analytics ID** → telemetry calls are silently skipped.
