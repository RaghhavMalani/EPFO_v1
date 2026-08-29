import { CheckIcon } from "@phosphor-icons/react/dist/ssr";

/** A horizontal progress map for any linear domain state sequence (advance, transfer). */
export function StateSequenceMap<TState extends string>({
  sequence,
  current,
  labels,
  ariaLabel,
}: {
  sequence: TState[];
  current: TState;
  labels: Record<TState, string>;
  ariaLabel: string;
}) {
  const currentIndex = sequence.indexOf(current);
  return (
    <ol className="sequence-map" aria-label={ariaLabel}>
      {sequence.map((state, index) => {
        const done = index < currentIndex;
        const isCurrent = index === currentIndex;
        const tone = done ? "sequence-node--done" : isCurrent ? "sequence-node--current" : "sequence-node--upcoming";
        return (
          <li key={state} className={`sequence-node ${tone}`}>
            <span className="sequence-node__marker" aria-hidden="true">
              {done ? <CheckIcon size={13} weight="bold" /> : <span className="tabular">{index + 1}</span>}
            </span>
            <span className="sequence-node__label">{labels[state]}</span>
            <span className="sr-only">{done ? "Complete" : isCurrent ? "Current stage" : "Not yet reached"}</span>
          </li>
        );
      })}
    </ol>
  );
}
