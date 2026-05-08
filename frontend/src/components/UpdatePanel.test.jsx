import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { UpdatePanel } from "./UpdatePanel.jsx";

afterEach(cleanup);

const updates = [
  {
    id: "rain",
    label: "Heavy rain",
    category: "weather",
    description: "Outdoor activities are risky.",
  },
  {
    id: "delay",
    label: "Flight delayed",
    category: "transport",
    description: "Arrival is delayed.",
  },
];

describe("UpdatePanel", () => {
  it("selects disruptions and updates context", () => {
    const onSelect = vi.fn();
    const onContextChange = vi.fn();

    render(
      <UpdatePanel
        updates={updates}
        selectedUpdate={updates[0]}
        onSelect={onSelect}
        onReplan={vi.fn()}
        disabled={false}
        isLoading={false}
        context={{ affectedDay: 1, disruptionTime: "14:00" }}
        onContextChange={onContextChange}
        dayCount={3}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /flight delayed/i }));
    fireEvent.change(screen.getByLabelText(/day/i), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/time/i), { target: { value: "16:30" } });

    expect(onSelect).toHaveBeenCalledWith(updates[1]);
    expect(onContextChange).toHaveBeenCalledWith({ affectedDay: 2, disruptionTime: "14:00" });
    expect(onContextChange).toHaveBeenCalledWith({ affectedDay: 1, disruptionTime: "16:30" });
  });

  it("disables replan when no update is selected", () => {
    render(
      <UpdatePanel
        updates={updates}
        selectedUpdate={null}
        onSelect={vi.fn()}
        onReplan={vi.fn()}
        disabled={false}
        isLoading={false}
        context={{ affectedDay: 1, disruptionTime: "14:00" }}
        onContextChange={vi.fn()}
        dayCount={1}
      />,
    );

    expect(screen.getByRole("button", { name: /generate recovery options/i })).toBeDisabled();
  });
});
