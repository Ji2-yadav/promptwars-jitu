from typing import Literal

from pydantic import BaseModel, Field


RiskLevel = Literal["low", "medium", "high"]
CostLevel = Literal["free", "low", "medium", "high"]


class ItineraryItem(BaseModel):
    time: str = Field(pattern=r"^\d{2}:\d{2}$")
    title: str
    type: str
    durationMinutes: int = Field(ge=15, le=720)
    estimatedCost: CostLevel
    why: str
    accessibilityNotes: str
    risk: RiskLevel


class DayPlan(BaseModel):
    day: int = Field(ge=1)
    theme: str
    items: list[ItineraryItem] = Field(min_length=1)


class ItinerarySummary(BaseModel):
    destination: str
    tripStyle: str
    riskLevel: RiskLevel


class TripHealth(BaseModel):
    score: int = Field(ge=0, le=100)
    issues: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


class ItineraryResponse(BaseModel):
    summary: ItinerarySummary
    days: list[DayPlan] = Field(min_length=1)
    assumptions: list[str] = Field(default_factory=list)
    fallbacks: list[str] = Field(default_factory=list)
    tripHealth: TripHealth
