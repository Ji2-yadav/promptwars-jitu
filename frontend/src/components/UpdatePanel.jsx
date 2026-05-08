import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CloudRain,
  Clock3,
  DoorClosed,
  Plane,
  Route,
  Zap,
} from "lucide-react";

const updateIcons = {
  weather: CloudRain,
  transport: Plane,
  closure: DoorClosed,
  traveler: Zap,
  budget: Banknote,
};

export function UpdatePanel({
  updates,
  selectedUpdate,
  onSelect,
  onReplan,
  disabled,
  isLoading,
  context,
  onContextChange,
  dayCount,
}) {
  return (
    <section className="recovery-console">
      <div className="console-title">
        <span>
          <AlertTriangle size={17} />
          Disruption lab
        </span>
        <strong>Recover the live trip</strong>
      </div>

      <div className="update-list">
        {updates.map((update) => {
          const Icon = updateIcons[update.category] || AlertTriangle;
          return (
            <button
              className={
                selectedUpdate?.id === update.id
                  ? "update-button selected"
                  : "update-button"
              }
              key={update.id}
              onClick={() => onSelect(update)}
              type="button"
            >
              <Icon size={18} />
              <span>{update.label}</span>
              <small>{update.description}</small>
            </button>
          );
        })}
      </div>

      <div className="context-panel">
        <label className="field-shell">
          <span>
            <CalendarClock size={16} />
            Day
          </span>
          <select
            value={context.affectedDay}
            onChange={(event) =>
              onContextChange({
                ...context,
                affectedDay: Number(event.target.value),
              })
            }
            disabled={disabled}
          >
            {Array.from(
              { length: Math.max(dayCount, 1) },
              (_, index) => index + 1,
            ).map((day) => (
              <option value={day} key={day}>
                Day {day}
              </option>
            ))}
          </select>
        </label>
        <label className="field-shell">
          <span>
            <Clock3 size={16} />
            Time
          </span>
          <input
            type="time"
            value={context.disruptionTime}
            onChange={(event) =>
              onContextChange({
                ...context,
                disruptionTime: event.target.value,
              })
            }
            disabled={disabled}
          />
        </label>
      </div>

      <button
        className="primary-button full replan-button"
        type="button"
        onClick={onReplan}
        disabled={disabled || isLoading || !selectedUpdate}
      >
        {isLoading ? (
          "Replanning..."
        ) : (
          <>
            <Route size={18} />
            Generate Recovery Options
          </>
        )}
      </button>
    </section>
  );
}
