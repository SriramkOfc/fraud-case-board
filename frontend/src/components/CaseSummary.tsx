import { RiskBadge } from "@/components/RiskBadge";
import { formatAmount, type Card } from "@/lib/kanban";

// Compact case content shared by the board card and the drag preview
export const CaseSummary = ({ card }: { card: Card }) => (
  <div>
    <div className="mb-2 flex items-center justify-between gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
        {card.alertType}
      </p>
      <RiskBadge risk={card.risk} />
    </div>
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
