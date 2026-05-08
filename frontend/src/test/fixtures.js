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
        },
      ],
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
