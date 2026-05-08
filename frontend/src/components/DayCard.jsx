import { Accessibility, ChevronDown, Clock3, Coins, MapPin, ShieldAlert } from "lucide-react";
import { useState } from "react";

export function DayCard({ day, defaultOpen = false, isStreaming = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <article className={isStreaming ? "day-accordion streaming-in" : "day-accordion"}>
      <button className="day-summary" type="button" onClick={() => setOpen((value) => !value)}>
        <div className="day-badge">Day {day.day}</div>
        <div className="day-title">
          <strong>{day.theme}</strong>
          <span>{day.items.length} planned stops</span>
        </div>
        <ChevronDown className={open ? "chevron open" : "chevron"} size={22} />
      </button>

      {open && (
        <div className="day-details">
          {day.items.map((item, index) => (
            <div className="timeline-item" key={`${item.time}-${item.title}-${index}`}>
              <div className="time-node">
                <span>{item.time}</span>
              </div>
              <div className="activity">
                <div className="activity-title">
                  <strong>{item.title}</strong>
                  <span className={`risk risk-${item.risk}`}>
                    <ShieldAlert size={13} />
                    {item.risk}
                  </span>
                </div>
                <p>{item.why}</p>
                <div className="activity-meta">
                  <span>
                    <MapPin size={13} />
                    {item.type}
                  </span>
                  <span>
                    <Clock3 size={13} />
                    {item.durationMinutes} min
                  </span>
                  <span>
                    <Coins size={13} />
                    {item.estimatedCost}
                  </span>
                </div>
                <p className="note">
                  <Accessibility size={14} />
                  {item.accessibilityNotes}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
