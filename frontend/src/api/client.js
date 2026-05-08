const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    throw new Error(`Network request failed: ${error.message}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with HTTP ${response.status}`);
  }

  return response.json();
}

export function planTrip(trip) {
  return request("/api/plan", {
    method: "POST",
    body: JSON.stringify(trip),
  });
}

export async function planTripStream(trip, onEvent) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/api/plan/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trip),
    });
  } catch {
    return planTrip(trip);
  }

  if (!response.ok || !response.body) {
    return planTrip(trip);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(parseStreamEvent(line));
    }
  }

  if (buffer.trim()) {
    onEvent(parseStreamEvent(buffer));
  }

  return null;
}

function parseStreamEvent(line) {
  try {
    return JSON.parse(line);
  } catch (error) {
    throw new Error(`Invalid streaming response: ${error.message}`);
  }
}

export function replanTrip(payload) {
  return request("/api/replan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchDemoUpdates() {
  return request("/api/live-updates/demo");
}

export function fetchGoogleStatus() {
  return request("/api/google/status");
}

export { apiBaseUrl };
