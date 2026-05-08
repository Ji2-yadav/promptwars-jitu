from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.config import get_settings


BudgetLevel = Literal["low", "medium", "high"]
Pace = Literal["relaxed", "balanced", "packed"]
TravelerType = Literal["solo", "couple", "family", "friends", "business"]


class TripRequest(BaseModel):
    destination: str = Field(min_length=2, max_length=120)
    startDate: date
    endDate: date
    budget: BudgetLevel = "medium"
    travelers: TravelerType = "couple"
    pace: Pace = "balanced"
    interests: list[str] = Field(default_factory=list, max_length=10)
    constraints: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("destination")
    @classmethod
    def normalize_destination(cls, value: str) -> str:
        return " ".join(value.strip().split())

    @field_validator("interests", "constraints")
    @classmethod
    def normalize_short_lists(cls, values: list[str]) -> list[str]:
        normalized = []
        for value in values:
            item = " ".join(str(value).strip().split())
            if item:
                normalized.append(item[:80])
        return normalized

    @model_validator(mode="after")
    def validate_dates(self) -> "TripRequest":
        if self.endDate < self.startDate:
            raise ValueError("endDate must be on or after startDate")
        trip_days = (self.endDate - self.startDate).days + 1
        if trip_days > get_settings().max_trip_days:
            raise ValueError(f"Trip length cannot exceed {get_settings().max_trip_days} days")
        return self
