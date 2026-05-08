import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Sparkles, Wifi, RadioTower } from "lucide-react";
import { apiBaseUrl, planTripStream, replanTrip, fetchDemoUpdates } from "./api/client.js";
import { ErrorBanner } from "./components/ErrorBanner.jsx";
import { TripWizard } from "./components/TripWizard.jsx";
import { StreamingItineraryView } from "./components/StreamingItineraryView.jsx";
import { UpdatePanel } from "./components/UpdatePanel.jsx";
import { ReplanResult } from "./components/ReplanResult.jsx";
import { LoadingState } from "./components/LoadingState.jsx";
import "./styles.css";

/* ── App phases ─────────────────────────────────────── */
// "wizard"   → step-by-step trip setup
// "planning" → actively streaming itinerary
// "done"     → itinerary complete, disruption panel visible

function App() {
  const [phase, setPhase] = useState("wizard"); // "wizard" | "planning" | "done"
  const [trip, setTrip] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [replanResult, setReplanResult] = useState(null);
  const [error, setError] = useState("");
  const [replanning, setReplanning] = useState(false);
  const [disruptionContext, setDisruptionContext] = useState({
    affectedDay: 1,
    disruptionTime: "14:00",
  });
  const [appliedOptionId, setAppliedOptionId] = useState("");

  const hasApi = useMemo(() => Boolean(apiBaseUrl), []);

  useEffect(() => {
    fetchDemoUpdates()
      .then((items) => {
        setUpdates(items);
        setSelectedUpdate(items[0] || null);
      })
      .catch((err) => setError(`Could not load demo updates: ${err.message}`));
  }, []);

  /* ── Plan handler ───────────────────────────────── */
  async function handlePlan(nextTrip) {
    setPhase("planning");
    setItinerary(null);
    setError("");
    setReplanResult(null);
    setTrip(nextTrip);

    try {
      const fallback = await planTripStream(nextTrip, (event) => {
        if (event.type === "summary") {
          setItinerary({
            summary: event.summary,
            days: [],
            assumptions: [],
            fallbacks: [],
            tripHealth: event.tripHealth,
          });
        }
        if (event.type === "day") {
          setItinerary((cur) => ({
            ...cur,
            days: [...(cur?.days || []), event.day],
          }));
        }
        if (event.type === "complete") {
          setItinerary((cur) => ({
            ...cur,
            assumptions: event.assumptions,
            fallbacks: event.fallbacks,
            tripHealth: event.tripHealth,
          }));
        }
      });

      if (fallback) setItinerary(fallback);
      setDisruptionContext({ affectedDay: 1, disruptionTime: "14:00" });
      setAppliedOptionId("");
    } catch (err) {
      setError(`Planning failed: ${err.message}`);
    } finally {
      setPhase("done");
    }
  }

  /* ── Replan handler ─────────────────────────────── */
  async function handleReplan() {
    if (!trip || !itinerary || !selectedUpdate) return;
    setReplanning(true);
    setError("");
    try {
      const result = await replanTrip({
        trip,
        itinerary,
        disruption: selectedUpdate,
        affectedDay: disruptionContext.affectedDay,
        disruptionTime: disruptionContext.disruptionTime,
        minimizeChanges: true,
        currentContext:
          "Demo mode: current traveler is mid-trip and needs an immediate adjustment.",
      });
      setReplanResult(result);
      setAppliedOptionId("");
    } catch (err) {
      setError(`Replan failed: ${err.message}`);
    } finally {
      setReplanning(false);
    }
  }

  /* ── Apply option ───────────────────────────────── */
  function handleApplyOption(option) {
    if (!itinerary) return;
    const affectedTitles = new Set(replanResult?.affectedItems || []);
    const affectedDay = option.affectedDay || disruptionContext.affectedDay;
    const replaceFromTime = option.replaceFromTime || disruptionContext.disruptionTime;
    const replaceUntilTime = option.replaceUntilTime || "23:59";

    const days = itinerary.days.map((day) => {
      if (day.day !== affectedDay) return day;
      const preserved = day.items.filter((item) => {
        const byTitle = affectedTitles.has(item.title);
        const inWindow = item.time >= replaceFromTime && item.time <= replaceUntilTime;
        return !byTitle && !inWindow;
      });
      const merged = [...preserved, ...option.replacementItems].sort((a, b) =>
        a.time.localeCompare(b.time),
      );
      return { ...day, theme: `${day.theme} (replanned)`, items: merged };
    });

    setItinerary({
      ...itinerary,
      days,
      tripHealth: {
        ...itinerary.tripHealth,
        score: Math.max(0, Math.min(100, itinerary.tripHealth.score + 4)),
        issues: itinerary.tripHealth.issues.filter(
          (i) => !i.toLowerCase().includes("affected"),
        ),
        recommendations: [
          option.catchUpPlan,
          ...itinerary.tripHealth.recommendations.filter(
            (r) => r !== option.catchUpPlan,
          ),
        ].slice(0, 4),
      },
    });
    setAppliedOptionId(option.id);
  }

  /* ── Render ─────────────────────────────────────── */
  const isPlanning = phase === "planning";

  return (
    <div className="app-v2">
      {/* ── Global top bar ── */}
      <header className="topbar-v2">
        <div className="topbar-v2-brand">
          <Sparkles size={16} className="brand-spark" />
          <span>TripPilot AI</span>
        </div>
        <div className={hasApi ? "api-pill api-pill--on" : "api-pill"}>
          {hasApi ? <Wifi size={13} /> : <RadioTower size={13} />}
          {hasApi ? "API connected" : "Set VITE_API_BASE_URL"}
        </div>
      </header>

      <ErrorBanner message={error} />

      {/* ── Phase: Wizard ────────────────────────── */}
      {phase === "wizard" && (
        <div className="wizard-page">
          <div className="wizard-page-left">
            <div className="wizard-page-headline">
              <h1>
                Plan your perfect trip
                <span className="headline-spark"> with AI</span>
              </h1>
              <p>
                Answer a few questions and TripPilot will stream a personalised day-by-day itinerary built for your pace, budget, and interests.
              </p>
              <div className="feature-pills">
                <span>Real-time streaming</span>
                <span>Day-by-day plan</span>
                <span>Risk-aware routing</span>
                <span>Google Maps recovery links</span>
              </div>
            </div>
          </div>
          <div className="wizard-page-right">
            <TripWizard onSubmit={handlePlan} isLoading={isPlanning} />
          </div>
        </div>
      )}

      {/* ── Phase: Planning / Done ────────────────── */}
      {(phase === "planning" || phase === "done") && (
        <div className="result-page">
          {/* Main itinerary stream */}
          <div className="result-main">
            <StreamingItineraryView
              itinerary={itinerary}
              isPlanning={isPlanning}
              trip={trip}
              onReset={() => {
                setPhase("wizard");
                setItinerary(null);
                setTrip(null);
                setReplanResult(null);
              }}
            />
          </div>

          {/* Right sidebar — disruption panel, only when done */}
          {phase === "done" && (
            <aside className="result-sidebar">
              <UpdatePanel
                updates={updates}
                selectedUpdate={selectedUpdate}
                onSelect={setSelectedUpdate}
                onReplan={handleReplan}
                disabled={!itinerary}
                isLoading={replanning}
                context={disruptionContext}
                onContextChange={setDisruptionContext}
                dayCount={itinerary?.days?.length || 1}
              />
              {replanning && <LoadingState label="Scoring disruption and generating replacements" />}
              <ReplanResult
                result={replanResult}
                onApplyOption={handleApplyOption}
                appliedOptionId={appliedOptionId}
              />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
