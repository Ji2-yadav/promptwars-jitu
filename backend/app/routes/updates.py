from fastapi import APIRouter

from app.schemas.replan import Disruption
from app.services.mock_updates import get_demo_updates

router = APIRouter(prefix="/api", tags=["updates"])


@router.get("/live-updates/demo", response_model=list[Disruption])
def demo_updates() -> list[Disruption]:
    return get_demo_updates()
