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
        <p>Pick the disruption moment and TripPilot will suggest the smallest useful itinerary changes.</p>
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
          catchUpPlan: "Resume the original itinerary after the replacement block.",
          tradeoffs: [],
          confidence: result.confidence,
          nextActions: result.nextActions,
        },
      ];

  return (
    <section className="replan-result">
      <div className="replan-head">
        <span>
          <GitBranch size={16} />
          Recovery plan
        </span>
        <strong>{Math.round(result.confidence * 100)}%</strong>
      </div>
      <h2>{result.changeSummary}</h2>
      <p>{result.reasoningSummary}</p>

      <div className="affected-strip">
        <span>
          <ListChecks size={15} />
          Affected
        </span>
        {result.affectedItems.map((item) => (
          <em key={item}>{item}</em>
        ))}
      </div>

      <div className="option-list">
        {options.map((option) => (
          <article
            className={
              option.id === result.recommendedOptionId
                ? "recovery-option recommended"
                : "recovery-option"
            }
            key={option.id}
          >
            <div className="option-header">
              <div>
                <strong>{option.label}</strong>
                {option.id === result.recommendedOptionId && (
                  <span>
                    <ShieldCheck size={12} />
                    Best fit
                  </span>
                )}
              </div>
              <small>{Math.round(option.confidence * 100)}%</small>
            </div>
            <p>{option.strategy}</p>

            {option.replacementItems.map((item) => (
              <div className="replacement" key={`${option.id}-${item.time}-${item.title}`}>
                <CornerDownRight size={16} />
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
              <CheckCircle2 size={16} />
              <div>
                <strong>Catch up</strong>
                <p>{option.catchUpPlan}</p>
              </div>
            </div>

            {option.tradeoffs?.length > 0 && (
              <div className="tradeoff-row">
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
            >
              {appliedOptionId === option.id ? "Applied To Itinerary" : "Apply This Option"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
