import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDemoUpdates, planTrip, planTripStream, replanTrip } from "./client.js";
import { trip } from "../test/fixtures.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("api client", () => {
  it("posts trip plans as JSON", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ summary: { destination: "Tokyo" } }),
    );

    const result = await planTrip(trip);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/plan",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(trip),
      }),
    );
    expect(result.summary.destination).toBe("Tokyo");
  });

  it("throws useful errors for failed requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Bad trip", { status: 422 }));

    await expect(planTrip(trip)).rejects.toThrow("Bad trip");
  });

  it("throws useful errors for network failures", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    await expect(fetchDemoUpdates()).rejects.toThrow("Network request failed: offline");
  });

  it("parses streamed itinerary events", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"type":"summary"}\n{"type":"complete"}\n'));
        controller.close();
      },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body, { status: 200 }));
    const onEvent = vi.fn();

    const fallback = await planTripStream(trip, onEvent);

    expect(fallback).toBeNull();
    expect(onEvent).toHaveBeenCalledWith({ type: "summary" });
    expect(onEvent).toHaveBeenCalledWith({ type: "complete" });
  });

  it("throws when streamed lines are malformed", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("not-json\n"));
        controller.close();
      },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body, { status: 200 }));

    await expect(planTripStream(trip, vi.fn())).rejects.toThrow("Invalid streaming response");
  });

  it("falls back to non-stream planning when streaming is unavailable", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ summary: { destination: "Tokyo" } }));

    const result = await planTripStream(trip, vi.fn());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.summary.destination).toBe("Tokyo");
  });

  it("posts replan payloads", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ recommendedOptionId: "minimal-change" }),
    );

    await replanTrip({ trip });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/replan",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("fetches demo updates", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([{ id: "rain" }]));

    await expect(fetchDemoUpdates()).resolves.toEqual([{ id: "rain" }]);
  });
});
