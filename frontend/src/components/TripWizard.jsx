import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Compass,
  Gauge,
  Globe,
  Rocket,
  Sparkles,
  Star,
  Users,
  Wallet,
} from "lucide-react";

const STEPS = [
  { id: "destination", label: "Where to?", icon: Globe },
  { id: "dates", label: "When & Who", icon: CalendarDays },
  { id: "vibe", label: "Your Vibe", icon: Star },
  { id: "review", label: "Review", icon: Rocket },
];

const budgetOptions = [
  {
    value: "low",
    label: "Budget",
    desc: "Hostels, street food, local transport",
    emoji: "B",
  },
  {
    value: "medium",
    label: "Mid-range",
    desc: "Hotels, restaurants, some splurges",
    emoji: "M",
  },
  {
    value: "high",
    label: "Luxury",
    desc: "5-star, fine dining, private transfers",
    emoji: "L",
  },
];

const travelerOptions = [
  { value: "solo", label: "Solo", emoji: "1" },
  { value: "couple", label: "Couple", emoji: "2" },
  { value: "family", label: "Family", emoji: "F" },
  { value: "friends", label: "Friends", emoji: "G" },
  { value: "business", label: "Business", emoji: "W" },
];

const paceOptions = [
  {
    value: "relaxed",
    label: "Relaxed",
    desc: "Slow days, long lunches, no rush",
    icon: "R",
  },
  {
    value: "balanced",
    label: "Balanced",
    desc: "Mix of sightseeing and downtime",
    icon: "B",
  },
  {
    value: "packed",
    label: "Packed",
    desc: "See everything, maximize every hour",
    icon: "P",
  },
];

const interestChips = [
  "Food & Drink",
  "Culture",
  "History",
  "Art",
  "Shopping",
  "Nature",
  "Adventure",
  "Nightlife",
  "Architecture",
  "Photography",
  "Wellness",
  "Sports",
];

const popularDestinations = [
  { name: "Tokyo", country: "Japan", emoji: "TYO" },
  { name: "Paris", country: "France", emoji: "PAR" },
  { name: "Bali", country: "Indonesia", emoji: "DPS" },
  { name: "New York", country: "USA", emoji: "NYC" },
  { name: "Rome", country: "Italy", emoji: "ROM" },
  { name: "Bangkok", country: "Thailand", emoji: "BKK" },
];

const initialState = {
  destination: "",
  startDate: "",
  endDate: "",
  travelers: "couple",
  budget: "medium",
  pace: "balanced",
  interests: [],
  constraints: "",
};

export function TripWizard({ onSubmit, isLoading }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialState);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleInterest(interest) {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  }

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function canAdvance() {
    if (step === 0) return form.destination.trim().length > 0;
    if (step === 1) {
      return (
        form.startDate &&
        form.endDate &&
        form.endDate >= form.startDate &&
        form.travelers
      );
    }
    if (step === 2) return form.budget && form.pace;
    return true;
  }

  function handleLaunch() {
    onSubmit({
      destination: form.destination,
      startDate: form.startDate,
      endDate: form.endDate,
      budget: form.budget,
      travelers: form.travelers,
      pace: form.pace,
      interests:
        form.interests.length > 0 ? form.interests : ["culture", "food"],
      constraints: form.constraints
        ? form.constraints
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    });
  }

  const tripDays =
    form.startDate && form.endDate
      ? Math.max(
          1,
          Math.round(
            (new Date(form.endDate) - new Date(form.startDate)) / 86400000,
          ) + 1,
        )
      : null;

  return (
    <div className="wizard-shell">
      {/* Progress stepper */}
      <div
        className="wizard-stepper"
        role="navigation"
        aria-label="Trip setup steps"
      >
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const state = i < step ? "done" : i === step ? "active" : "idle";
          return (
            <div
              key={s.id}
              className={`step-pill step-pill--${state}`}
              aria-current={i === step ? "step" : undefined}
            >
              <div className="step-icon">
                <Icon size={15} />
              </div>
              <span>{s.label}</span>
              {i < STEPS.length - 1 && (
                <ChevronRight size={14} className="step-sep" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step panels */}
      <div className="wizard-body">
        {step === 0 && (
          <StepDestination
            value={form.destination}
            onChange={(v) => set("destination", v)}
          />
        )}
        {step === 1 && (
          <StepDatesAndTravelers form={form} set={set} tripDays={tripDays} />
        )}
        {step === 2 && (
          <StepVibe form={form} set={set} toggleInterest={toggleInterest} />
        )}
        {step === 3 && <StepReview form={form} tripDays={tripDays} />}
      </div>

      {/* Navigation */}
      <div className="wizard-nav">
        {step > 0 ? (
          <button
            className="wiz-btn wiz-btn--ghost"
            type="button"
            onClick={back}
          >
            <ArrowLeft size={16} /> Back
          </button>
        ) : (
          <div />
        )}

        {step < STEPS.length - 1 ? (
          <button
            className="wiz-btn wiz-btn--primary"
            type="button"
            onClick={next}
            disabled={!canAdvance()}
          >
            Continue <ArrowRight size={16} />
          </button>
        ) : (
          <button
            className="wiz-btn wiz-btn--launch"
            type="button"
            onClick={handleLaunch}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="wiz-spinner" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Generate Itinerary
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Step 1: Destination ─────────────────────────────────── */
function StepDestination({ value, onChange }) {
  return (
    <div className="step-content">
      <div className="step-hero">
        <Compass size={36} className="step-hero-icon" />
        <h2>Where are you headed?</h2>
        <p>Search a city, country, or region</p>
      </div>
      <input
        className="wiz-input wiz-input--lg"
        type="text"
        placeholder="e.g. Tokyo, Japan"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        aria-label="Destination"
      />
      <div className="quick-destinations">
        <p className="quick-label">Popular picks</p>
        <div className="dest-grid">
          {popularDestinations.map((dest) => (
            <button
              key={dest.name}
              type="button"
              className={`dest-card ${value === dest.name ? "dest-card--active" : ""}`}
              onClick={() => onChange(dest.name)}
              aria-pressed={value === dest.name}
            >
              <span className="dest-emoji" aria-hidden="true">
                {dest.emoji}
              </span>
              <span className="dest-name">{dest.name}</span>
              <span className="dest-country">{dest.country}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 2: Dates & Travelers ───────────────────────────── */
function StepDatesAndTravelers({ form, set, tripDays }) {
  return (
    <div className="step-content">
      <div className="step-hero">
        <CalendarDays size={36} className="step-hero-icon" />
        <h2>When & with who?</h2>
        <p>Pick your travel window and group type</p>
      </div>

      <div className="wiz-date-row">
        <label className="wiz-label">
          <span>Departure</span>
          <input
            className="wiz-input"
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </label>
        <label className="wiz-label">
          <span>Return</span>
          <input
            className="wiz-input"
            type="date"
            value={form.endDate}
            min={form.startDate}
            onChange={(e) => set("endDate", e.target.value)}
          />
        </label>
      </div>

      {tripDays && (
        <div className="trip-duration-badge">
          <CalendarDays size={14} /> {tripDays}{" "}
          {tripDays === 1 ? "day" : "days"} in {form.destination || "paradise"}
        </div>
      )}

      <div className="wiz-section-label">
        <Users size={15} /> Traveling as
      </div>
      <div className="traveler-grid">
        {travelerOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`traveler-card ${form.travelers === opt.value ? "traveler-card--active" : ""}`}
            onClick={() => set("travelers", opt.value)}
            aria-pressed={form.travelers === opt.value}
          >
            <span className="traveler-emoji" aria-hidden="true">
              {opt.emoji}
            </span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 3: Vibe ────────────────────────────────────────── */
function StepVibe({ form, set, toggleInterest }) {
  return (
    <div className="step-content">
      <div className="step-hero">
        <Star size={36} className="step-hero-icon" />
        <h2>Dial in your vibe</h2>
        <p>Budget, pace, and what you love</p>
      </div>

      <div className="wiz-section-label">
        <Wallet size={15} /> Budget level
      </div>
      <div className="budget-grid">
        {budgetOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`budget-card ${form.budget === opt.value ? "budget-card--active" : ""}`}
            onClick={() => set("budget", opt.value)}
            aria-pressed={form.budget === opt.value}
          >
            <span className="budget-emoji" aria-hidden="true">
              {opt.emoji}
            </span>
            <strong>{opt.label}</strong>
            <span className="budget-desc">{opt.desc}</span>
          </button>
        ))}
      </div>

      <div className="wiz-section-label" style={{ marginTop: "20px" }}>
        <Gauge size={15} /> Travel pace
      </div>
      <div className="pace-grid">
        {paceOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`pace-card ${form.pace === opt.value ? "pace-card--active" : ""}`}
            onClick={() => set("pace", opt.value)}
            aria-pressed={form.pace === opt.value}
          >
            <span className="pace-icon" aria-hidden="true">
              {opt.icon}
            </span>
            <strong>{opt.label}</strong>
            <span className="pace-desc">{opt.desc}</span>
          </button>
        ))}
      </div>

      <div className="wiz-section-label" style={{ marginTop: "20px" }}>
        <Sparkles size={15} /> Interests (pick any)
      </div>
      <div className="interest-chips">
        {interestChips.map((chip) => (
          <button
            key={chip}
            type="button"
            className={`interest-chip ${form.interests.includes(chip) ? "interest-chip--active" : ""}`}
            onClick={() => toggleInterest(chip)}
            aria-pressed={form.interests.includes(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      <label className="wiz-label" style={{ marginTop: "16px" }}>
        <span>
          Any constraints? <small>(optional)</small>
        </span>
        <input
          className="wiz-input"
          type="text"
          placeholder="e.g. vegetarian, low walking, wheelchair accessible"
          value={form.constraints}
          onChange={(e) => set("constraints", e.target.value)}
        />
      </label>
    </div>
  );
}

/* ─── Step 4: Review ──────────────────────────────────────── */
function StepReview({ form, tripDays }) {
  const selectedBudget = budgetOptions.find((b) => b.value === form.budget);
  const selectedTraveler = travelerOptions.find(
    (t) => t.value === form.travelers,
  );
  const selectedPace = paceOptions.find((p) => p.value === form.pace);

  return (
    <div className="step-content">
      <div className="step-hero">
        <Rocket size={36} className="step-hero-icon" />
        <h2>Ready to launch?</h2>
        <p>Review your trip brief before TripPilot AI takes over</p>
      </div>

      <div className="review-card">
        <div className="review-hero-dest">
          <Globe size={22} />
          <div>
            <strong>{form.destination}</strong>
            {tripDays && (
              <span>
                {tripDays} days · {form.startDate} → {form.endDate}
              </span>
            )}
          </div>
        </div>

        <div className="review-grid">
          <ReviewItem
            emoji={selectedTraveler?.emoji}
            label="Travelers"
            value={selectedTraveler?.label}
          />
          <ReviewItem
            emoji={selectedBudget?.emoji}
            label="Budget"
            value={selectedBudget?.label}
          />
          <ReviewItem
            emoji={selectedPace?.icon}
            label="Pace"
            value={selectedPace?.label}
          />
          {form.interests.length > 0 && (
            <ReviewItem
              emoji="✨"
              label="Interests"
              value={
                form.interests.slice(0, 3).join(", ") +
                (form.interests.length > 3
                  ? ` +${form.interests.length - 3}`
                  : "")
              }
            />
          )}
        </div>

        {form.constraints && (
          <div className="review-constraints">
            <span>Constraints:</span> {form.constraints}
          </div>
        )}
      </div>

      <p className="review-note">
        <Sparkles size={13} />
        TripPilot will stream your personalised day-by-day itinerary in real
        time. Days appear as the AI generates them — you can browse early while
        it finishes.
      </p>
    </div>
  );
}

function ReviewItem({ emoji, label, value }) {
  return (
    <div className="review-item">
      <span className="review-emoji">{emoji}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
