import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { RadioTower, Sparkles, Wifi } from "lucide-react";
import { apiBaseUrl, fetchDemoUpdates, planTripStream, replanTrip } from "./api/client.js";
import { ErrorBanner } from "./components/ErrorBanner.jsx";
import { ItineraryView } from "./components/ItineraryView.jsx";
import { LoadingState } from "./components/LoadingState.jsx";
import { ReplanResult } from "./components/ReplanResult.jsx";
import { TripForm } from "./components/TripForm.jsx";
import { UpdatePanel } from "./components/UpdatePanel.jsx";
import "./styles.css";

function App() {
  const [trip, setTrip] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [replanResult, setReplanResult] = useState(null);
  const [error, setError] = useState("");
  const [planning, setPlanning] = useState(false);
  const [replanning, setReplanning] = useState(false);
  const [disruptionContext, setDisruptionContext] = useState({
    affectedDay: 1,
    disruptionTime: "14:00",
  });
  const [appliedOptionId, setAppliedOptionId] = useState("");

  useEffect(() => {
    fetchDemoUpdates()
      .then((items) => {
        setUpdates(items);
        setSelectedUpdate(items[0] || null);
      })
      .catch((err) => setError(`Could not load demo updates: ${err.message}`));
  }, []);

  const hasApi = useMemo(() => Boolean(apiBaseUrl), []);

  async function handlePlan(nextTrip) {
    setPlanning(true);
    setError("");
    setReplanResult(null);
    try {
      const fallbackPlan = await planTripStream(nextTrip, (event) => {
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
          setItinerary((current) => ({
            ...current,
            days: [...(current?.days || []), event.day],
          }));
        }

        if (event.type === "complete") {
          setItinerary((current) => ({
            ...current,
            assumptions: event.assumptions,
            fallbacks: event.fallbacks,
            tripHealth: event.tripHealth,
          }));
        }
      });

      if (fallbackPlan) {
        setItinerary(fallbackPlan);
      }

      setTrip(nextTrip);
      setDisruptionContext({ affectedDay: 1, disruptionTime: "14:00" });
      setAppliedOptionId("");
    } catch (err) {
      setError(`Planning failed: ${err.message}`);
    } finally {
      setPlanning(false);
    }
  }

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
        currentContext: "Demo mode: current traveler is mid-trip and needs an immediate adjustment.",
      });
      setReplanResult(result);
      setAppliedOptionId("");
    } catch (err) {
      setError(`Replan failed: ${err.message}`);
    } finally {
      setReplanning(false);
    }
  }

  function handleApplyOption(option) {
    if (!itinerary) return;

    const affectedTitles = new Set(replanResult?.affectedItems || []);
    const affectedDay = option.affectedDay || disruptionContext.affectedDay;
    const replaceFromTime = option.replaceFromTime || disruptionContext.disruptionTime;
    const replaceUntilTime = option.replaceUntilTime || "23:59";

    const days = itinerary.days.map((day) => {
      if (day.day !== affectedDay) return day;

      const preservedItems = day.items.filter((item) => {
        const isAffectedByTitle = affectedTitles.has(item.title);
        const isInsideReplacementWindow =
          item.time >= replaceFromTime && item.time <= replaceUntilTime;
        return !isAffectedByTitle && !isInsideReplacementWindow;
      });

      const mergedItems = [...preservedItems, ...option.replacementItems].sort((a, b) =>
        a.time.localeCompare(b.time),
      );

      return {
        ...day,
        theme: `${day.theme} (replanned)`,
        items: mergedItems,
      };
    });

    setItinerary({
      ...itinerary,
      days,
      tripHealth: {
        ...itinerary.tripHealth,
        score: Math.max(0, Math.min(100, itinerary.tripHealth.score + 4)),
        issues: itinerary.tripHealth.issues.filter(
          (issue) => !issue.toLowerCase().includes("affected"),
        ),
        recommendations: [
          option.catchUpPlan,
          ...itinerary.tripHealth.recommendations.filter(
            (recommendation) => recommendation !== option.catchUpPlan,
          ),
        ].slice(0, 4),
      },
    });
    setAppliedOptionId(option.id);
  }

  return (
    <main className="app-shell">
      <div className="backdrop-grid" />
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <Sparkles size={14} />
            TripPilot AI
          </p>
          <h1>Dynamic Travel Recovery Engine</h1>
        </div>
        <div className={hasApi ? "api-status online" : "api-status"}>
          {hasApi ? <Wifi size={15} /> : <RadioTower size={15} />}
          {hasApi ? "API connected" : "Set VITE_API_BASE_URL"}
        </div>
      </header>

      <ErrorBanner message={error} />

      <div className="workspace">
        <aside className="left-pane">
          <section className="input-panel">
            <div className="console-title">
              <div>
                <span>Trip setup</span>
                <strong>Preferences and constraints</strong>
              </div>
            </div>
            <TripForm onSubmit={handlePlan} isLoading={planning} />
          </section>
          {planning && <LoadingState label="Building structured itinerary" />}
        </aside>

        <ItineraryView itinerary={itinerary} isPlanning={planning} />

        <aside className="right-pane">
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
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
