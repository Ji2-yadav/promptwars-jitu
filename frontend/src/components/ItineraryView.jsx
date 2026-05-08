import { BrainCircuit, CheckCircle2, Loader2, Route, Sparkles } from "lucide-react";
import { DayCard } from "./DayCard.jsx";

export function ItineraryView({ itinerary, isPlanning }) {
  if (isPlanning && !itinerary) {
    return (
      <section className="itinerary-stage active-generation">
        <div className="generation-panel">
          <Loader2 className="loader-icon" size={30} />
          <span>LLM response stream</span>
          <h2>Composing day-wise itinerary</h2>
          <div className="stream-lines">
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>
    );
  }

  if (!itinerary) {
    return (
      <section className="itinerary-stage empty-state">
        <div className="empty-visual">
          <BrainCircuit size={32} />
        </div>
        <h2>Itinerary stream appears here</h2>
        <p>Generate a trip and TripPilot will reveal the plan day by day with risk and recovery notes.</p>
      </section>
    );
  }

  return (
    <section className="itinerary-stage">
      <div className="itinerary-head">
        <div>
          <p className="eyebrow">
            <Sparkles size={14} />
            Streaming itinerary
          </p>
          <h2>{itinerary.summary.destination}</h2>
          <span>{itinerary.summary.tripStyle} pace</span>
        </div>
        <div className="score">
          <strong>{itinerary.tripHealth.score}</strong>
          <small>Trip health</small>
        </div>
      </div>

      <div className="health-strip">
        {itinerary.tripHealth.issues.map((issue) => (
          <span key={issue}>
            <Route size={13} />
            {issue}
          </span>
        ))}
        {itinerary.tripHealth.recommendations.map((recommendation) => (
          <span key={recommendation}>
            <CheckCircle2 size={13} />
            {recommendation}
          </span>
        ))}
      </div>

      <div className="days">
        {itinerary.days.map((day, index) => (
          <DayCard
            day={day}
            defaultOpen={index === 0}
            isStreaming={isPlanning && index === itinerary.days.length - 1}
            key={day.day}
          />
        ))}
        {isPlanning && (
          <div className="day-accordion stream-placeholder">
            <Loader2 className="loader-icon" size={18} />
            <span>Receiving next day from LLM...</span>
          </div>
        )}
      </div>

      <div className="assumptions">
        <h3>Assumptions and fallbacks</h3>
        {[...itinerary.assumptions, ...itinerary.fallbacks].map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </section>
  );
}
