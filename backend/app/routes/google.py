from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(prefix="/api/google", tags=["google"])


@router.get("/status")
async def google_status() -> dict:
    settings = get_settings()
    vertex_ready = bool(
        settings.google_genai_use_vertexai and settings.google_cloud_project
    )
    gemini_ready = bool(settings.gemini_api_key or vertex_ready)
    maps_ready = bool(
        settings.google_maps_api_key and settings.google_maps_enrichment_enabled
    )

    return {
        "gemini": {
            "configured": gemini_ready,
            "provider": (
                "vertex_ai"
                if vertex_ready
                else "gemini_api" if settings.gemini_api_key else "fallback"
            ),
            "model": settings.gemini_model,
        },
        "maps": {
            "placesApi": maps_ready,
            "routesApi": maps_ready,
            "embedApi": settings.google_maps_embed_api_key_configured,
        },
        "analytics": {
            "googleAnalytics": settings.google_analytics_configured,
        },
        "cloud": {
            "cloudRun": True,
            "cloudBuild": True,
            "artifactRegistry": True,
            "projectConfigured": bool(settings.google_cloud_project),
            "location": settings.google_cloud_location,
        },
    }
