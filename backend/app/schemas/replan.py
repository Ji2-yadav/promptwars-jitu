from pydantic import BaseModel, Field

from app.schemas.itinerary import ItineraryItem, ItineraryResponse
from app.schemas.trip import TripRequest


class Disruption(BaseModel):
    id: str
    label: str
    category: str
    severity: str = "medium"
    description: str


class ReplanRequest(BaseModel):
    trip: TripRequest
    itinerary: ItineraryResponse
    disruption: Disruption
    affectedDay: int = Field(default=1, ge=1)
    disruptionTime: str = Field(default="14:00", pattern=r"^\d{2}:\d{2}$")
    minimizeChanges: bool = True
    currentContext: str | None = None


class RecoveryOption(BaseModel):
    id: str
    label: str
    strategy: str
    affectedDay: int = Field(ge=1)
    replaceFromTime: str = Field(pattern=r"^\d{2}:\d{2}$")
    replaceUntilTime: str = Field(pattern=r"^\d{2}:\d{2}$")
    replacementItems: list[ItineraryItem] = Field(min_length=1)
    catchUpPlan: str
    tradeoffs: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    nextActions: list[str] = Field(default_factory=list)


class ReplanResponse(BaseModel):
    changeSummary: str
    affectedItems: list[str] = Field(default_factory=list)
    replacementItems: list[ItineraryItem] = Field(default_factory=list)
    reasoningSummary: str
    confidence: float = Field(ge=0, le=1)
    nextActions: list[str] = Field(default_factory=list)
    recommendedOptionId: str | None = None
    options: list[RecoveryOption] = Field(default_factory=list)
