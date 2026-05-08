"""Google Maps Platform enrichment layer for TripPilot AI itineraries.

This module calls the Places API (New) to resolve activity names to structured
place data, and the Routes API to compute walking legs between daily stops.
Results are cached in-process with a 24-hour TTL to respect quota limits.
When no API key is configured, the service degrades gracefully to search-URL
fallbacks so the rest of the application remains fully functional.
"""

from __future__ import annotations

import asyncio
import math
from urllib.parse import quote_plus

import httpx
from cachetools import TTLCache

from app.config import get_settings
from app.schemas.itinerary import (
    GoogleDayRoute,
    GooglePlace,
    GoogleRouteLeg,
    GoogleServicesMetadata,
    ItineraryItem,
    ItineraryResponse,
)
from app.schemas.trip import TripRequest

PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
ROUTES_COMPUTE_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

places_cache = TTLCache(maxsize=512, ttl=60 * 60 * 24)
routes_cache = TTLCache(maxsize=512, ttl=60 * 60 * 24)


class GoogleMapsService:
    """Enriches itinerary items with live Google Maps data.

    Places API (New) is used to resolve activity titles to structured place
    records (coordinates, ratings, canonical Maps URIs).  Routes API computes
    the walking route between consecutive stops in each day.  Both caches are
    module-level TTLCache instances so they survive across request lifecycles.
    """

    def __init__(self) -> None:
        """Initialise the service using settings from the environment."""
        self.settings = get_settings()
        self.api_key = self.settings.google_maps_api_key
        self.enabled = bool(
            self.api_key and self.settings.google_maps_enrichment_enabled
        )

    async def enrich_itinerary(
        self,
        trip_request: TripRequest,
        itinerary: ItineraryResponse,
        ai_provider: str,
    ) -> ItineraryResponse:
        """Enrich every itinerary item with Google Maps place data and daily routes.

        Args:
            trip_request: The original trip request (used for destination context).
            itinerary: The AI-generated or fallback itinerary to enrich.
            ai_provider: Label for the AI source (e.g. ``"gemini_api"`` or ``"fallback"``)
                         stored in the ``googleServices`` metadata block.

        Returns:
            A deep copy of *itinerary* with ``mapQuery``, ``googleMapsUrl``,
            ``googlePlace``, and ``googleRoute`` fields populated.
        """
        enriched = itinerary.model_copy(deep=True)
        places_resolved = 0
        route_legs_resolved = 0
        notes = []

        if not self.enabled:
            notes.append(
                "Google Maps Platform enrichment is disabled or missing GOOGLE_MAPS_API_KEY."
            )

        for day in enriched.days:
            place_candidates = []
            for index, item in enumerate(day.items):
                query = self._place_query(item, trip_request.destination)
                item.mapQuery = query
                item.googleMapsUrl = maps_search_url(query)
                item.googlePlace = GooglePlace(
                    query=query,
                    googleMapsUri=item.googleMapsUrl,
                    source="maps_search_fallback",
                )

                if (
                    self.enabled
                    and index < self.settings.google_maps_max_places_per_day
                ):
                    place_candidates.append(item)

            if place_candidates:
                places = await asyncio.gather(
                    *(
                        self._find_place(item.mapQuery or item.title)
                        for item in place_candidates
                    ),
                    return_exceptions=True,
                )
                for item, place in zip(place_candidates, places):
                    if isinstance(place, GooglePlace):
                        item.googlePlace = place
                        item.googleMapsUrl = place.googleMapsUri or item.googleMapsUrl
                        places_resolved += 1

            if self.enabled:
                route = await self._build_day_route(day.items)
                if route and route.legs:
                    day.googleRoute = route
                    route_legs_resolved += len(route.legs)

        enriched.googleServices = GoogleServicesMetadata(
            aiProvider=ai_provider,
            mapsConfigured=self.enabled,
            placesResolved=places_resolved,
            routeLegsResolved=route_legs_resolved,
            services=self._service_names(ai_provider),
            notes=notes,
        )
        return enriched

    async def _find_place(self, query: str) -> GooglePlace | None:
        """Look up a single place by text query using the Places API (New).

        Results are cached by lower-cased query string.  Returns ``None`` on
        any network or parse error so callers can continue without raising.
        """
        cache_key = query.lower()
        if cache_key in places_cache:
            return places_cache[cache_key]

        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key or "",
            "X-Goog-FieldMask": ",".join(
                [
                    "places.id",
                    "places.displayName",
                    "places.formattedAddress",
                    "places.location",
                    "places.rating",
                    "places.userRatingCount",
                    "places.googleMapsUri",
                    "places.primaryType",
                ]
            ),
        }
        payload = {"textQuery": query, "maxResultCount": 1, "languageCode": "en"}

        try:
            async with httpx.AsyncClient(
                timeout=self.settings.google_maps_timeout_seconds
            ) as client:
                response = await client.post(
                    PLACES_TEXT_SEARCH_URL, headers=headers, json=payload
                )
                response.raise_for_status()
                place = self._parse_place(query, response.json())
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            place = None

        places_cache[cache_key] = place
        return place

    async def _build_day_route(
        self, items: list[ItineraryItem]
    ) -> GoogleDayRoute | None:
        """Build a walking route between all stops in a single day.

        Only consecutive pairs where both items have resolved coordinates are
        included.  Returns ``None`` if fewer than two coordinate-bearing items
        are found or if all leg computations fail.
        """
        leg_pairs = [
            (origin, destination)
            for origin, destination in zip(items, items[1:])
            if has_coordinates(origin) and has_coordinates(destination)
        ]
        if not leg_pairs:
            return None

        results = await asyncio.gather(
            *(
                self._compute_route_leg(origin, destination)
                for origin, destination in leg_pairs
            ),
            return_exceptions=True,
        )
        legs = [leg for leg in results if isinstance(leg, GoogleRouteLeg)]

        if not legs:
            return None

        total_distance = sum(leg.distanceMeters or 0 for leg in legs)
        total_duration = sum(leg.durationMinutes or 0 for leg in legs)
        return GoogleDayRoute(
            travelMode="WALK",
            totalDistanceMeters=total_distance or None,
            totalDurationMinutes=total_duration or None,
            legs=legs,
        )

    async def _compute_route_leg(
        self,
        origin: ItineraryItem,
        destination: ItineraryItem,
    ) -> GoogleRouteLeg | None:
        """Compute a single walking leg between *origin* and *destination* using Routes API.

        The result is cached by coordinate pair to avoid duplicate API calls
        within the same cache TTL.  Returns ``None`` on any failure.
        """
        origin_place = origin.googlePlace
        destination_place = destination.googlePlace
        cache_key = (
            f"{origin_place.latitude},{origin_place.longitude}:"
            f"{destination_place.latitude},{destination_place.longitude}:WALK"
        )
        if cache_key in routes_cache:
            return routes_cache[cache_key]

        payload = {
            "origin": {
                "location": {
                    "latLng": {
                        "latitude": origin_place.latitude,
                        "longitude": origin_place.longitude,
                    }
                }
            },
            "destination": {
                "location": {
                    "latLng": {
                        "latitude": destination_place.latitude,
                        "longitude": destination_place.longitude,
                    }
                }
            },
            "travelMode": "WALK",
        }
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key or "",
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        }

        try:
            async with httpx.AsyncClient(
                timeout=self.settings.google_maps_timeout_seconds
            ) as client:
                response = await client.post(
                    ROUTES_COMPUTE_URL, headers=headers, json=payload
                )
                response.raise_for_status()
                leg = self._parse_route_leg(origin, destination, response.json())
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            leg = None

        routes_cache[cache_key] = leg
        return leg

    def _parse_place(self, query: str, payload: dict) -> GooglePlace | None:
        """Parse a Places API (New) JSON response into a ``GooglePlace`` model."""
        places = payload.get("places") or []
        if not places:
            return None

        place = places[0]
        display_name = place.get("displayName") or {}
        location = place.get("location") or {}
        return GooglePlace(
            query=query,
            placeId=place.get("id"),
            displayName=display_name.get("text"),
            formattedAddress=place.get("formattedAddress"),
            latitude=location.get("latitude"),
            longitude=location.get("longitude"),
            rating=place.get("rating"),
            userRatingCount=place.get("userRatingCount"),
            googleMapsUri=place.get("googleMapsUri") or maps_search_url(query),
            primaryType=place.get("primaryType"),
            source="google_places",
        )

    def _parse_route_leg(
        self,
        origin: ItineraryItem,
        destination: ItineraryItem,
        payload: dict,
    ) -> GoogleRouteLeg | None:
        """Parse a Routes API JSON response into a ``GoogleRouteLeg`` model."""
        routes = payload.get("routes") or []
        if not routes:
            return None

        route = routes[0]
        polyline = route.get("polyline") or {}
        return GoogleRouteLeg(
            fromTitle=origin.title,
            toTitle=destination.title,
            distanceMeters=route.get("distanceMeters"),
            durationMinutes=parse_google_duration_minutes(route.get("duration")),
            googleMapsUri=maps_directions_url(origin.mapQuery, destination.mapQuery),
            encodedPolyline=polyline.get("encodedPolyline"),
            source="google_routes",
        )

    def _place_query(self, item: ItineraryItem, destination: str) -> str:
        """Build the text query string for a Places API lookup."""
        return f"{item.title}, {destination}"[:240]

    def _service_names(self, ai_provider: str) -> list[str]:
        """Return the list of Google services used, shown in the UI status strip."""
        if ai_provider == "vertex_ai":
            ai_service = "Vertex AI Gemini API"
        elif ai_provider == "gemini_api":
            ai_service = "Google Gemini API"
        else:
            ai_service = "Deterministic fallback planner"

        services = [
            ai_service,
            "Google Cloud Run",
            "Google Cloud Build",
            "Artifact Registry",
        ]
        if self.enabled:
            services.extend(["Places API (New)", "Routes API", "Maps Embed API"])
        return services[:10]


def parse_google_duration_minutes(duration: str | None) -> int | None:
    """Convert a Google duration string (e.g. ``"180s"``) to whole minutes.

    Returns ``None`` for missing or unparseable values, and at least ``1``
    for any positive duration shorter than 60 seconds.
    """
    if not duration or not duration.endswith("s"):
        return None
    try:
        seconds = float(duration[:-1])
    except ValueError:
        return None
    return max(1, math.ceil(seconds / 60))


def has_coordinates(item: ItineraryItem) -> bool:
    """Return ``True`` if *item* has a resolved Google Place with lat/lng coordinates."""
    return bool(
        item.googlePlace
        and item.googlePlace.latitude is not None
        and item.googlePlace.longitude is not None
    )


def maps_search_url(query: str | None) -> str:
    """Build a Google Maps search URL for *query*."""
    return f"https://www.google.com/maps/search/?api=1&query={quote_plus(query or '')}"


def maps_directions_url(origin: str | None, destination: str | None) -> str:
    """Build a Google Maps walking directions URL between *origin* and *destination*."""
    return (
        "https://www.google.com/maps/dir/?api=1"
        f"&origin={quote_plus(origin or '')}"
        f"&destination={quote_plus(destination or '')}"
        "&travelmode=walking"
    )


async def enrich_with_google_maps(
    trip_request: TripRequest,
    itinerary: ItineraryResponse,
    ai_provider: str,
) -> ItineraryResponse:
    """Convenience wrapper that instantiates :class:`GoogleMapsService` and enriches *itinerary*."""
    return await GoogleMapsService().enrich_itinerary(
        trip_request, itinerary, ai_provider
    )


def run_enrichment_sync(
    trip_request: TripRequest,
    itinerary: ItineraryResponse,
    ai_provider: str,
) -> ItineraryResponse:
    """Synchronous wrapper around :func:`enrich_with_google_maps` for non-async contexts."""
    return asyncio.run(enrich_with_google_maps(trip_request, itinerary, ai_provider))
