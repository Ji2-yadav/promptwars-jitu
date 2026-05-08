import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TripForm } from "./TripForm";

describe("TripForm", () => {
  it("renders correctly", () => {
    render(<TripForm onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByLabelText(/Trip planning form/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Generate Itinerary/i })).toBeDefined();
  });

  it("calls onSubmit when submitted", () => {
    const handleSubmit = vi.fn();
    render(<TripForm onSubmit={handleSubmit} isLoading={false} />);
    
    fireEvent.submit(screen.getByLabelText(/Trip planning form/i));
    
    expect(handleSubmit).toHaveBeenCalled();
  });
});
