from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import get_settings
from app.routes import google, health, plan, replan, updates

settings = get_settings()
allow_origins = settings.allowed_origins or [
    "http://localhost:5173",
    "http://localhost:3000",
]
allow_credentials = "*" not in allow_origins

limiter = Limiter(key_func=get_remote_address, default_limits=["20/minute"])

app = FastAPI(title="TripPilot AI API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(google.router)
app.include_router(plan.router)
app.include_router(replan.router)
app.include_router(updates.router)
