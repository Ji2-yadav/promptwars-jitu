from typing import Literal

from pydantic import BaseModel, Field

RiskLevel = Literal["low", "medium", "high"]
CostLevel = Literal["free", "low", "medium", "high"]
GooglePlaceSource = Literal["google_places", "maps_search_fallback"]
GoogleRouteSource = Literal["google_routes"]


class GooglePlace(BaseModel):
    query: str = Field(min_length=1, max_length=240)
    placeId: str | None = Field(default=None, max_length=140)
    displayName: str | None = Field(default=None, max_length=160)
    formattedAddress: str | None = Field(default=None, max_length=240)
    latitude: float | None = None
    longitude: float | None = None
    rating: float | None = Field(default=None, ge=0, le=5)
    userRatingCount: int | None = Field(default=None, ge=0)
    googleMapsUri: str | None = Field(default=None, max_length=600)
    primaryType: str | None = Field(default=None, max_length=80)
    source: GooglePlaceSource = "maps_search_fallback"


class GoogleRouteLeg(BaseModel):
    fromTitle: str = Field(min_length=1, max_length=160)
    toTitle: str = Field(min_length=1, max_length=160)
    distanceMeters: int | None = Field(default=None, ge=0)
    durationMinutes: int | None = Field(default=None, ge=0)
    googleMapsUri: str = Field(min_length=1, max_length=1000)
    encodedPolyline: str | None = Field(default=None, max_length=10000)
    source: GoogleRouteSource = "google_routes"


class GoogleDayRoute(BaseModel):
    travelMode: str = Field(default="WALK", max_length=40)
    totalDistanceMeters: int | None = Field(default=None, ge=0)
    totalDurationMinutes: int | None = Field(default=None, ge=0)
    legs: list[GoogleRouteLeg] = Field(default_factory=list, max_length=8)


class ItineraryItem(BaseModel):
    time: str = Field(pattern=r"^\d{2}:\d{2}$")
    title: str = Field(min_length=1, max_length=160)
    type: str = Field(min_length=1, max_length=60)
    durationMinutes: int = Field(ge=15, le=720)
    estimatedCost: CostLevel
    why: str = Field(min_length=1, max_length=500)
    accessibilityNotes: str = Field(min_length=1, max_length=500)
    risk: RiskLevel
    mapQuery: str | None = Field(default=None, max_length=240)
    googleMapsUrl: str | None = Field(default=None, max_length=600)
    googlePlace: GooglePlace | None = None


class DayPlan(BaseModel):
    day: int = Field(ge=1)
    theme: str = Field(min_length=1, max_length=160)
    items: list[ItineraryItem] = Field(min_length=1, max_length=8)
    googleRoute: GoogleDayRoute | None = None


class ItinerarySummary(BaseModel):
    destination: str = Field(min_length=1, max_length=120)
    tripStyle: str = Field(min_length=1, max_length=60)
    riskLevel: RiskLevel


class TripHealth(BaseModel):
    score: int = Field(ge=0, le=100)
    issues: list[str] = Field(default_factory=list, max_length=8)
    recommendations: list[str] = Field(default_factory=list, max_length=8)


class GoogleServicesMetadata(BaseModel):
    aiProvider: str = Field(max_length=80)
    mapsConfigured: bool
    placesResolved: int = Field(ge=0)
    routeLegsResolved: int = Field(ge=0)
    services: list[str] = Field(default_factory=list, max_length=10)
    notes: list[str] = Field(default_factory=list, max_length=8)


class ItineraryResponse(BaseModel):
    summary: ItinerarySummary
    days: list[DayPlan] = Field(min_length=1, max_length=14)
    assumptions: list[str] = Field(default_factory=list, max_length=8)
    fallbacks: list[str] = Field(default_factory=list, max_length=8)
    tripHealth: TripHealth
    googleServices: GoogleServicesMetadata | None = None
