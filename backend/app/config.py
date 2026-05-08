import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ROOT_ENV)


class Settings:
    app_env: str = os.getenv("APP_ENV", "local")
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY") or os.getenv(
        "GOOGLE_API_KEY"
    )
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    gemini_timeout_seconds: float = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "25"))
    google_genai_use_vertexai: bool = os.getenv(
        "GOOGLE_GENAI_USE_VERTEXAI", ""
    ).lower() in {
        "1",
        "true",
        "yes",
    }
    google_cloud_project: str | None = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv(
        "PROJECT_ID"
    )
    google_cloud_location: str = os.getenv("GOOGLE_CLOUD_LOCATION") or os.getenv(
        "REGION", "us-central1"
    )
    google_maps_api_key: str | None = os.getenv("GOOGLE_MAPS_API_KEY")
    google_maps_timeout_seconds: float = float(
        os.getenv("GOOGLE_MAPS_TIMEOUT_SECONDS", "4")
    )
    google_maps_max_places_per_day: int = int(
        os.getenv("GOOGLE_MAPS_MAX_PLACES_PER_DAY", "6")
    )
    google_maps_enrichment_enabled: bool = os.getenv(
        "GOOGLE_MAPS_ENRICHMENT_ENABLED",
        "true",
    ).lower() not in {"0", "false", "no"}
    google_maps_embed_api_key_configured: bool = bool(
        os.getenv("GOOGLE_MAPS_EMBED_API_KEY")
        or os.getenv("VITE_GOOGLE_MAPS_EMBED_API_KEY")
    )
    google_analytics_configured: bool = bool(
        os.getenv("GOOGLE_ANALYTICS_ID") or os.getenv("VITE_GA_MEASUREMENT_ID")
    )
    max_trip_days: int = int(os.getenv("MAX_TRIP_DAYS", "14"))
    allowed_origins: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            os.getenv("FRONTEND_ORIGIN", "http://localhost:5173,http://localhost:3000"),
        ).split(",")
        if origin.strip()
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
