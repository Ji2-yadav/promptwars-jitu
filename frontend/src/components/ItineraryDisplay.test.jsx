import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DayCard } from "./DayCard.jsx";
import { ItineraryView } from "./ItineraryView.jsx";
import { StreamingItineraryView } from "./StreamingItineraryView.jsx";
import { itinerary, trip } from "../test/fixtures.js";

afterEach(cleanup);

describe("ItineraryView", () => {
  it("renders planning state", () => {
    render(<ItineraryView itinerary={null} isPlanning />);

    expect(screen.getByText(/composing day-wise itinerary/i)).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<ItineraryView itinerary={null} isPlanning={false} />);

    expect(screen.getByText(/itinerary stream appears here/i)).toBeInTheDocument();
  });

  it("renders itinerary days, health, assumptions, and streaming placeholder", () => {
    render(<ItineraryView itinerary={itinerary} isPlanning />);

    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    expect(screen.getByText("Weather risk")).toBeInTheDocument();
    expect(screen.getByText("Receiving next day from LLM...")).toBeInTheDocument();
    expect(screen.getByText("Live weather was not checked.")).toBeInTheDocument();
  });
});

describe("DayCard", () => {
  it("toggles details open and closed", () => {
    render(<DayCard day={itinerary.days[0]} defaultOpen={false} isStreaming={false} />);

    expect(screen.queryByText("Breakfast market")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Breakfast market")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText("Breakfast market")).not.toBeInTheDocument();
  });
});

describe("StreamingItineraryView", () => {
  it("renders nothing when no itinerary exists and planning is idle", () => {
    const { container } = render(
      <StreamingItineraryView itinerary={null} isPlanning={false} trip={trip} onReset={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders loading state during initial planning", () => {
    render(<StreamingItineraryView itinerary={null} isPlanning trip={trip} onReset={vi.fn()} />);

    expect(screen.getByText(/composing your itinerary/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /explore in google maps/i })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps/search"),
    );
  });

  it("renders active itinerary with maps links and reset action", () => {
    const onReset = vi.fn();
    render(
      <StreamingItineraryView
        itinerary={itinerary}
        isPlanning={false}
        trip={trip}
        onReset={onReset}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tokyo" })).toBeInTheDocument();
    expect(screen.getByText("Trip Health")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /explore in google maps/i })).toHaveAttribute(
      "href",
      expect.stringContaining("Tokyo"),
    );
    expect(screen.getAllByRole("link", { name: /maps/i })[0]).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps/search"),
    );

    fireEvent.click(screen.getByRole("button", { name: /new trip/i }));
    expect(onReset).toHaveBeenCalled();
  });

  it("toggles day details and optional photos", () => {
    render(
      <StreamingItineraryView
        itinerary={itinerary}
        isPlanning={false}
        trip={trip}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("Station architecture walk")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show photo for station architecture walk/i }));
    expect(screen.getByAltText("Station architecture walk")).toBeInTheDocument();
  });
});
