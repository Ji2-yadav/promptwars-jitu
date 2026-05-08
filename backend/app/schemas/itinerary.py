from typing import Literal

from pydantic import BaseModel, Field


RiskLevel = Literal["low", "medium", "high"]
CostLevel = Literal["free", "low", "medium", "high"]


class ItineraryItem(BaseModel):
    time: str = Field(pattern=r"^\d{2}:\d{2}$")
    title: str = Field(min_length=1, max_length=160)
    type: str = Field(min_length=1, max_length=60)
    durationMinutes: int = Field(ge=15, le=720)
    estimatedCost: CostLevel
    why: str = Field(min_length=1, max_length=500)
    accessibilityNotes: str = Field(min_length=1, max_length=500)
    risk: RiskLevel


class DayPlan(BaseModel):
    day: int = Field(ge=1)
    theme: str = Field(min_length=1, max_length=160)
    items: list[ItineraryItem] = Field(min_length=1, max_length=8)


class ItinerarySummary(BaseModel):
    destination: str = Field(min_length=1, max_length=120)
    tripStyle: str = Field(min_length=1, max_length=60)
    riskLevel: RiskLevel


class TripHealth(BaseModel):
    score: int = Field(ge=0, le=100)
    issues: list[str] = Field(default_factory=list, max_length=8)
    recommendations: list[str] = Field(default_factory=list, max_length=8)


class ItineraryResponse(BaseModel):
    summary: ItinerarySummary
    days: list[DayPlan] = Field(min_length=1, max_length=14)
    assumptions: list[str] = Field(default_factory=list, max_length=8)
    fallbacks: list[str] = Field(default_factory=list, max_length=8)
    tripHealth: TripHealth
