import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ROOT_ENV)


class Settings:
    app_env: str = os.getenv("APP_ENV", "local")
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    allowed_origins: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            os.getenv("FRONTEND_ORIGIN", "*"),
        ).split(",")
        if origin.strip()
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
