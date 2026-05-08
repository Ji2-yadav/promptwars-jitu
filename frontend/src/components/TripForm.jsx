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
    <form className="trip-console" onSubmit={handleSubmit}>
      <div className="console-hero">
        <div className="hero-icon">
          <Plane size={24} />
        </div>
        <div>
          <span>AI trip brief</span>
          <strong>Plan once, recover fast</strong>
        </div>
      </div>

      <label className="field-shell destination-field">
        <span>
          <MapPin size={16} />
          Destination
        </span>
        <input name="destination" defaultValue={initialTrip.destination} required />
      </label>

      <div className="date-row">
        <label className="field-shell">
          <span>
            <CalendarDays size={16} />
            Start
          </span>
          <input name="startDate" type="date" defaultValue={initialTrip.startDate} required />
        </label>
        <label className="field-shell">
          <span>
            <CalendarDays size={16} />
            End
          </span>
          <input name="endDate" type="date" defaultValue={initialTrip.endDate} required />
        </label>
      </div>

      <SegmentGroup icon={Wallet} label="Budget" name="budget" options={budgets} selected="medium" />
      <SegmentGroup icon={Users} label="Travelers" name="travelers" options={travelers} selected="family" />
      <SegmentGroup icon={Gauge} label="Pace" name="pace" options={paces} selected="balanced" />

      <label className="field-shell">
        <span>
          <Sparkles size={16} />
          Interests
        </span>
        <input name="interests" defaultValue={initialTrip.interests} />
      </label>

      <label className="field-shell">
        <span>
          <Sparkles size={16} />
          Constraints
        </span>
        <input name="constraints" defaultValue={initialTrip.constraints} />
      </label>

      <button className="primary-button launch-button" type="submit" disabled={isLoading}>
        {isLoading ? "Generating..." : "Generate Itinerary"}
      </button>
    </form>
  );
}

function SegmentGroup({ icon: Icon, label, name, options, selected }) {
  return (
    <fieldset className="segment-group">
      <legend>
        <Icon size={16} />
        {label}
      </legend>
      <div>
        {options.map((option) => (
          <label className="segment" key={option}>
            <input
              type="radio"
              name={name}
              value={option}
              defaultChecked={option === selected}
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
