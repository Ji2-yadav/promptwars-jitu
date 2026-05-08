from app.schemas.replan import Disruption

DEMO_UPDATES = [
    Disruption(
        id="heavy-rain",
        label="Heavy rain",
        category="weather",
        severity="high",
        description="Heavy rain is expected during the main outdoor block.",
    ),
    Disruption(
        id="flight-delay",
        label="Flight delayed",
        category="transport",
        severity="medium",
        description="Arrival is delayed by three hours, compressing the first day.",
    ),
    Disruption(
        id="attraction-closed",
        label="Attraction closed",
        category="closure",
        severity="medium",
        description="A planned attraction is unexpectedly closed today.",
    ),
    Disruption(
        id="too-tired",
        label="Too tired",
        category="traveler",
        severity="medium",
        description="The traveler needs a lower-effort plan with less walking.",
    ),
    Disruption(
        id="budget-reduced",
        label="Budget reduced",
        category="budget",
        severity="high",
        description="Available spend dropped and paid activities should be reduced.",
    ),
]


def get_demo_updates() -> list[Disruption]:
    return DEMO_UPDATES
