import { formatAmount, type Card } from "@/lib/kanban";

// Compact case content shared by the board card and the drag preview
export const CaseSummary = ({ card }: { card: Card }) => (
  <div>
    <h4 className="font-display text-base font-semibold text-[var(--navy-dark)]">
      {card.title}
    </h4>
    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p className="text-sm font-semibold text-[var(--navy-dark)]">{card.customerName}</p>
      <p className="text-sm font-semibold text-[var(--primary-blue)]">{formatAmount(card.amount)}</p>
    </div>
    <p className="text-xs font-semibold tracking-wide text-[var(--gray-text)]">
      Acct &bull;&bull;&bull;&bull; {card.accountLast4}
    </p>
  </div>
);
