import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ErrorBanner } from "./ErrorBanner.jsx";
import { LoadingState } from "./LoadingState.jsx";

afterEach(cleanup);

describe("status components", () => {
  it("does not render an empty error banner", () => {
    const { container } = render(<ErrorBanner message="" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders error messages", () => {
    render(<ErrorBanner message="Planning failed" />);

    expect(screen.getByText("Planning failed")).toBeInTheDocument();
  });

  it("renders loading labels", () => {
    render(<LoadingState label="Generating recovery options" />);

    expect(screen.getByText("Generating recovery options")).toBeInTheDocument();
  });
});
