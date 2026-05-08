export const itinerary = {
  summary: {
    destination: "Tokyo",
    tripStyle: "balanced",
    riskLevel: "medium",
  },
  days: [
    {
      day: 1,
      theme: "Markets and gardens",
      items: [
        {
          time: "09:30",
          title: "Breakfast market",
          type: "food",
          durationMinutes: 60,
          estimatedCost: "low",
          why: "Keeps the morning flexible.",
          accessibilityNotes: "Flat route and seating nearby.",
          risk: "low",
          mapQuery: "Breakfast market, Tokyo",
          googleMapsUrl:
            "https://www.google.com/maps/search/?api=1&query=Breakfast+market%2C+Tokyo",
          googlePlace: {
            query: "Breakfast market, Tokyo",
            placeId: "tokyo-breakfast-market",
            displayName: "Breakfast Market",
            formattedAddress: "Tokyo, Japan",
            latitude: 35.6804,
            longitude: 139.769,
            rating: 4.5,
            userRatingCount: 1200,
            googleMapsUri: "https://maps.google.com/?cid=breakfast",
            primaryType: "market",
            source: "google_places",
          },
        },
        {
          time: "14:00",
          title: "Outdoor garden",
          type: "nature",
          durationMinutes: 120,
          estimatedCost: "medium",
          why: "Matches the nature interest.",
          accessibilityNotes: "Use transit to reduce walking.",
          risk: "medium",
          mapQuery: "Outdoor garden, Tokyo",
          googleMapsUrl:
            "https://www.google.com/maps/search/?api=1&query=Outdoor+garden%2C+Tokyo",
        },
      ],
      googleRoute: {
        travelMode: "WALK",
        totalDistanceMeters: 1200,
        totalDurationMinutes: 16,
        legs: [
          {
            fromTitle: "Breakfast market",
            toTitle: "Outdoor garden",
            distanceMeters: 1200,
            durationMinutes: 16,
            googleMapsUri: "https://www.google.com/maps/dir/?api=1",
            source: "google_routes",
          },
        ],
      },
    },
    {
      day: 2,
      theme: "Free neighborhoods",
      items: [
        {
          time: "10:00",
          title: "Station architecture walk",
          type: "architecture",
          durationMinutes: 90,
          estimatedCost: "free",
          why: "Adds a free cultural stop.",
          accessibilityNotes: "Use elevators in large stations.",
          risk: "low",
        },
      ],
    },
  ],
  assumptions: ["Live weather was not checked."],
  fallbacks: ["Move outdoor blocks indoors."],
  tripHealth: {
    score: 78,
    issues: ["Weather risk"],
    recommendations: ["Keep backup stops"],
  },
  googleServices: {
    aiProvider: "gemini_api",
    mapsConfigured: true,
    placesResolved: 1,
    routeLegsResolved: 1,
    services: [
      "Google Gemini API",
      "Places API (New)",
      "Routes API",
      "Maps Embed API",
    ],
    notes: [],
  },
};

export const trip = {
  destination: "Tokyo",
  startDate: "2026-06-12",
  endDate: "2026-06-14",
  budget: "medium",
  travelers: "family",
  pace: "balanced",
  interests: ["food"],
  constraints: ["low walking"],
};
