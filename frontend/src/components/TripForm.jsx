import {
  CalendarDays,
  Gauge,
  MapPin,
  Plane,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

const initialTrip = {
  destination: "Tokyo",
  startDate: "2026-06-12",
  endDate: "2026-06-14",
  budget: "medium",
  travelers: "family",
  pace: "balanced",
  interests: "food, culture, shopping",
  constraints: "low walking, vegetarian options",
};

const budgets = ["low", "medium", "high"];
const travelers = ["solo", "couple", "family", "friends", "business"];
const paces = ["relaxed", "balanced", "packed"];

export function TripForm({ onSubmit, isLoading }) {
  function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      destination: form.get("destination"),
      startDate: form.get("startDate"),
      endDate: form.get("endDate"),
      budget: form.get("budget"),
      travelers: form.get("travelers"),
      pace: form.get("pace"),
      interests: splitList(form.get("interests")),
      constraints: splitList(form.get("constraints")),
    });
  }

  return (
    <form
      className="trip-console"
      onSubmit={handleSubmit}
      aria-label="Trip planning form"
    >
      <div className="console-hero" aria-hidden="true">
        <div className="hero-icon">
          <Plane size={24} />
        </div>
        <div>
          <span>AI trip brief</span>
          <strong>Plan once, recover fast</strong>
        </div>
      </div>

      <label
        className="field-shell destination-field"
        htmlFor="destination-input"
      >
        <span>
          <MapPin size={16} aria-hidden="true" />
          Destination
        </span>
        <input
          id="destination-input"
          name="destination"
          defaultValue={initialTrip.destination}
          required
          aria-required="true"
        />
      </label>

      <div className="date-row">
        <label className="field-shell" htmlFor="start-date-input">
          <span>
            <CalendarDays size={16} aria-hidden="true" />
            Start
          </span>
          <input
            id="start-date-input"
            name="startDate"
            type="date"
            defaultValue={initialTrip.startDate}
            required
            aria-required="true"
          />
        </label>
        <label className="field-shell" htmlFor="end-date-input">
          <span>
            <CalendarDays size={16} aria-hidden="true" />
            End
          </span>
          <input
            id="end-date-input"
            name="endDate"
            type="date"
            defaultValue={initialTrip.endDate}
            required
            aria-required="true"
          />
        </label>
      </div>

      <SegmentGroup
        icon={Wallet}
        label="Budget"
        name="budget"
        options={budgets}
        selected="medium"
      />
      <SegmentGroup
        icon={Users}
        label="Travelers"
        name="travelers"
        options={travelers}
        selected="family"
      />
      <SegmentGroup
        icon={Gauge}
        label="Pace"
        name="pace"
        options={paces}
        selected="balanced"
      />

      <label className="field-shell" htmlFor="interests-input">
        <span>
          <Sparkles size={16} aria-hidden="true" />
          Interests
        </span>
        <input
          id="interests-input"
          name="interests"
          defaultValue={initialTrip.interests}
          aria-describedby="interests-help"
        />
      </label>

      <label className="field-shell" htmlFor="constraints-input">
        <span>
          <Sparkles size={16} aria-hidden="true" />
          Constraints
        </span>
        <input
          id="constraints-input"
          name="constraints"
          defaultValue={initialTrip.constraints}
          aria-describedby="constraints-help"
        />
      </label>

      <button
        className="primary-button launch-button"
        type="submit"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? "Generating..." : "Generate Itinerary"}
      </button>
    </form>
  );
}

function SegmentGroup({ icon: Icon, label, name, options, selected }) {
  const groupId = `group-${name}`;
  return (
    <fieldset className="segment-group" aria-labelledby={groupId}>
      <legend id={groupId}>
        <Icon size={16} aria-hidden="true" />
        {label}
      </legend>
      <div role="radiogroup" aria-labelledby={groupId}>
        {options.map((option) => (
          <label className="segment" key={option}>
            <input
              type="radio"
              name={name}
              value={option}
              defaultChecked={option === selected}
              aria-label={option}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
