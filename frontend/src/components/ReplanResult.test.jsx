import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReplanResult } from "./ReplanResult.jsx";

afterEach(cleanup);

const item = {
  time: "14:00",
  title: "Indoor market",
  type: "food",
  durationMinutes: 90,
  estimatedCost: "low",
  why: "Keeps the plan indoors.",
  accessibilityNotes: "Transit accessible.",
  risk: "low",
};

const result = {
  changeSummary: "Rain affects the afternoon.",
  affectedItems: ["Outdoor garden"],
  replacementItems: [item],
  reasoningSummary: "Preserve the morning and replace the outdoor block.",
  confidence: 0.86,
  recommendedOptionId: "minimal-change",
  options: [
    {
      id: "minimal-change",
      label: "Minimal change",
      strategy: "Replace one block.",
      replacementItems: [item],
      catchUpPlan: "Resume at dinner.",
      tradeoffs: ["Skips one outdoor stop."],
      confidence: 0.86,
    },
  ],
};

describe("ReplanResult", () => {
  it("renders empty state", () => {
    render(
      <ReplanResult result={null} onApplyOption={vi.fn()} appliedOptionId="" />,
    );

    expect(
      screen.getByText(/recovery options appear here/i),
    ).toBeInTheDocument();
  });

  it("renders recovery options and applies selected option", () => {
    const onApplyOption = vi.fn();
    render(
      <ReplanResult
        result={result}
        onApplyOption={onApplyOption}
        appliedOptionId=""
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /apply this option/i }));

    expect(screen.getByText("Outdoor garden")).toBeInTheDocument();
    expect(screen.getByLabelText(/confidence: 86%/i)).toBeInTheDocument();
    expect(onApplyOption).toHaveBeenCalledWith(result.options[0]);
  });

  it("supports legacy single-option replan results", () => {
    render(
      <ReplanResult
        result={{ ...result, options: [], recommendedOptionId: null }}
        onApplyOption={vi.fn()}
        appliedOptionId="single-option"
      />,
    );

    expect(
      screen.getByRole("button", { name: /applied to itinerary/i }),
    ).toBeDisabled();
  });
});
