from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import health, plan, replan, updates


settings = get_settings()
allow_origins = settings.allowed_origins or ["*"]

app = FastAPI(title="TripPilot AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(plan.router)
app.include_router(replan.router)
app.include_router(updates.router)
