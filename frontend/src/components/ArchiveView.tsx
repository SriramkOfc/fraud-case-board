import { useState } from "react";
import { formatAmount, formatDate, type Card } from "@/lib/kanban";

type ArchiveViewProps = {
  cards: Card[];
  stageTitleOf: (cardId: string) => string;
  onRestore: (cardId: string) => void;
  onDelete: (cardId: string) => void;
};

const buttonClass =
  "rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide transition";

const ArchivedCase = ({
  card,
  stageTitle,
  onRestore,
  onDelete,
}: {
  card: Card;
  stageTitle: string;
  onRestore: () => void;
  onDelete: () => void;
}) => {
  const [confirming, setConfirming] = useState(false);

  return (
    <li
      data-testid={`archived-${card.id}`}
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--stroke)] bg-white px-5 py-4 shadow-[0_12px_24px_rgba(3,33,71,0.06)]"
    >
      <div className="min-w-0">
        <h3 className="font-display text-base font-semibold text-[var(--navy-dark)]">{card.title}</h3>
        <p className="mt-1 text-sm text-[var(--navy-dark)]">
          {card.customerName}
          <span className="text-[var(--gray-text)]"> &middot; Acct &bull;&bull;&bull;&bull; {card.accountLast4} &middot; </span>
          <span className="font-semibold text-[var(--primary-blue)]">{formatAmount(card.amount)}</span>
        </p>
        <p className="mt-1 text-xs text-[var(--gray-text)]">
          Stage: {stageTitle} &middot; Archived {formatDate(card.archivedAt!)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {confirming ? (
          <>
            <span className="text-xs font-semibold text-[var(--secondary-purple)]">
              Delete permanently? This cannot be undone.
            </span>
            <button
              type="button"
              onClick={onDelete}
              className={`${buttonClass} bg-[var(--secondary-purple)] text-white hover:brightness-110`}
            >
              Confirm delete
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={`${buttonClass} text-[var(--gray-text)] hover:text-[var(--navy-dark)]`}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onRestore}
              className={`${buttonClass} text-[var(--primary-blue)] hover:border-[var(--primary-blue)]`}
            >
              Restore
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={`${buttonClass} text-[var(--gray-text)] hover:text-[var(--navy-dark)]`}
            >
              Delete permanently
            </button>
          </>
        )}
      </div>
    </li>
  );
};

export const ArchiveView = ({ cards, stageTitleOf, onRestore, onDelete }: ArchiveViewProps) => (
  <section className="rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)]">
    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
      Archive
    </p>
    <h2 className="mt-3 font-display text-2xl font-semibold text-[var(--navy-dark)]">
      Archived cases
    </h2>
    <p className="mt-2 text-sm text-[var(--gray-text)]">
      Restore a case to return it to its stage, or delete it permanently.
    </p>
    {cards.length === 0 ? (
      <p className="mt-8 rounded-2xl border border-dashed border-[var(--stroke)] px-4 py-10 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
        No archived cases
      </p>
    ) : (
      <ul className="mt-6 space-y-3">
        {cards.map((card) => (
          <ArchivedCase
            key={card.id}
            card={card}
            stageTitle={stageTitleOf(card.id)}
            onRestore={() => onRestore(card.id)}
            onDelete={() => onDelete(card.id)}
          />
        ))}
      </ul>
    )}
  </section>
);
