import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { TripForm } from "./TripForm";

afterEach(cleanup);

describe("TripForm", () => {
  it("renders correctly", () => {
    render(<TripForm onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByLabelText(/Trip planning form/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Generate Itinerary/i })).toBeDefined();
  });

  it("calls onSubmit when submitted", () => {
    const handleSubmit = vi.fn();
    const { container } = render(<TripForm onSubmit={handleSubmit} isLoading={false} />);
    
    fireEvent.submit(container.querySelector("form"));
    
    expect(handleSubmit).toHaveBeenCalled();
  });
});
