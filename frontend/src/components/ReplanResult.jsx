import {
  CheckCircle2,
  CornerDownRight,
  GitBranch,
  ListChecks,
  Route,
  ShieldCheck,
} from "lucide-react";

export function ReplanResult({ result, onApplyOption, appliedOptionId }) {
  if (!result) {
    return (
      <section className="replan-result empty-recovery">
        <Route size={28} />
        <h2>Recovery options appear here</h2>
        <p>
          Pick the disruption moment and TripPilot will suggest the smallest
          useful itinerary changes.
        </p>
      </section>
    );
  }

  const options = result.options?.length
    ? result.options
    : [
        {
          id: "single-option",
          label: "Replacement",
          strategy: result.reasoningSummary,
          replacementItems: result.replacementItems,
          catchUpPlan:
            "Resume the original itinerary after the replacement block.",
          tradeoffs: [],
          confidence: result.confidence,
          nextActions: result.nextActions,
        },
      ];

  return (
    <section className="replan-result" aria-live="polite" aria-atomic="true">
      <div className="replan-head" aria-hidden="true">
        <span>
          <GitBranch size={16} />
          Recovery plan
        </span>
        <strong>{Math.round(result.confidence * 100)}%</strong>
      </div>
      <h2>{result.changeSummary}</h2>
      <p>{result.reasoningSummary}</p>

      <div className="affected-strip" aria-label="Affected items">
        <span aria-hidden="true">
          <ListChecks size={15} />
          Affected
        </span>
        {result.affectedItems.map((item) => (
          <em key={item}>{item}</em>
        ))}
      </div>

      <div className="option-list" role="list" aria-label="Recovery options">
        {options.map((option) => (
          <article
            className={
              option.id === result.recommendedOptionId
                ? "recovery-option recommended"
                : "recovery-option"
            }
            key={option.id}
            role="listitem"
            aria-labelledby={`option-label-${option.id}`}
          >
            <div className="option-header">
              <div>
                <strong id={`option-label-${option.id}`}>{option.label}</strong>
                {option.id === result.recommendedOptionId && (
                  <span aria-label="Recommended option">
                    <ShieldCheck size={12} aria-hidden="true" />
                    Best fit
                  </span>
                )}
              </div>
              <small
                aria-label={`Confidence: ${Math.round(option.confidence * 100)}%`}
              >
                {Math.round(option.confidence * 100)}%
              </small>
            </div>
            <p>{option.strategy}</p>

            {option.replacementItems.map((item) => (
              <div
                className="replacement"
                key={`${option.id}-${item.time}-${item.title}`}
              >
                <CornerDownRight size={16} aria-hidden="true" />
                <div>
                  <strong>
                    {item.time} {item.title}
                  </strong>
                  <p>{item.why}</p>
                  <small>{item.accessibilityNotes}</small>
                </div>
              </div>
            ))}

            <div className="catch-up">
              <CheckCircle2 size={16} aria-hidden="true" />
              <div>
                <strong>Catch up</strong>
                <p>{option.catchUpPlan}</p>
              </div>
            </div>

            {option.tradeoffs?.length > 0 && (
              <div className="tradeoff-row" aria-label="Tradeoffs">
                {option.tradeoffs.map((tradeoff) => (
                  <span key={tradeoff}>{tradeoff}</span>
                ))}
              </div>
            )}

            <button
              className="secondary-button full"
              type="button"
              onClick={() => onApplyOption(option)}
              disabled={appliedOptionId === option.id}
              aria-pressed={appliedOptionId === option.id}
            >
              {appliedOptionId === option.id
                ? "Applied To Itinerary"
                : "Apply This Option"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
