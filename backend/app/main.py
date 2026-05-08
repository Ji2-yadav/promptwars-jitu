import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


frontend_origin = os.getenv("FRONTEND_ORIGIN", "*")

app = FastAPI(title="Deploy App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin] if frontend_origin != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "backend", "status": "ok"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

