from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator


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

    @model_validator(mode="after")
    def validate_dates(self) -> "TripRequest":
        if self.endDate < self.startDate:
            raise ValueError("endDate must be on or after startDate")
        return self
