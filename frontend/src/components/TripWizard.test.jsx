import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TripWizard } from "./TripWizard.jsx";

afterEach(cleanup);

describe("TripWizard", () => {
  it("requires a destination before advancing", () => {
    render(<TripWizard onSubmit={vi.fn()} isLoading={false} />);

    const continueButton = screen.getByRole("button", { name: /continue/i });

    expect(continueButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/destination/i), {
      target: { value: "Tokyo" },
    });
    expect(continueButton).not.toBeDisabled();
  });

  it("blocks invalid date ranges", () => {
    render(<TripWizard onSubmit={vi.fn()} isLoading={false} />);

    fireEvent.change(screen.getByLabelText(/destination/i), {
      target: { value: "Tokyo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    const continueButton = screen.getByRole("button", { name: /continue/i });
    fireEvent.change(screen.getByLabelText(/departure/i), {
      target: { value: "2026-06-14" },
    });
    fireEvent.change(screen.getByLabelText(/return/i), {
      target: { value: "2026-06-12" },
    });

    expect(continueButton).toBeDisabled();
  });

  it("submits a normalized trip request", () => {
    const handleSubmit = vi.fn();
    render(<TripWizard onSubmit={handleSubmit} isLoading={false} />);

    fireEvent.change(screen.getByLabelText(/destination/i), {
      target: { value: "Tokyo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(screen.getByLabelText(/departure/i), {
      target: { value: "2026-06-12" },
    });
    fireEvent.change(screen.getByLabelText(/return/i), {
      target: { value: "2026-06-14" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /food & drink/i }));
    fireEvent.change(screen.getByPlaceholderText(/vegetarian/i), {
      target: { value: "vegetarian, low walking" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /generate itinerary/i }),
    );

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: "Tokyo",
        startDate: "2026-06-12",
        endDate: "2026-06-14",
        interests: ["Food & Drink"],
        constraints: ["vegetarian", "low walking"],
      }),
    );
  });
});
