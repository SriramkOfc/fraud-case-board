import { useEffect, useState, type ReactNode } from "react";
import { CaseForm } from "@/components/CaseForm";
import { Modal } from "@/components/Modal";
import { RiskBadge } from "@/components/RiskBadge";
import { getHistory, type AuditEvent } from "@/lib/api";
import { formatAmount, formatDate, type Card, type CaseInput } from "@/lib/kanban";

type CaseDialogProps = {
  username: string;
  card: Card;
  stageTitle: string;
  onClose: () => void;
  onEdit: (input: CaseInput) => void;
  onArchive: () => void;
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
      {label}
    </dt>
    <dd className="mt-1 text-sm font-semibold text-[var(--navy-dark)]">{children}</dd>
  </div>
);

const actorLabel = { analyst: "Analyst", ai: "AI, approved by analyst" };

export const CaseDialog = ({ username, card, stageTitle, onClose, onEdit, onArchive }: CaseDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [history, setHistory] = useState<AuditEvent[] | null>(null);

  // Reload after every change to the case (saves finish before the history is read)
  useEffect(() => {
    getHistory(username, card.id).then(setHistory);
  }, [username, card.id, card.updatedAt]);

  return (
    <Modal eyebrow={stageTitle} title={card.title} onClose={onClose}>
      {isEditing ? (
        <CaseForm
          initial={card}
          submitLabel="Save"
          onSubmit={(input) => {
            onEdit(input);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Alert type">{card.alertType}</Field>
            <Field label="Risk">
              <RiskBadge risk={card.risk} />
            </Field>
            <Field label="Customer">{card.customerName}</Field>
            <Field label="Account">&bull;&bull;&bull;&bull; {card.accountLast4}</Field>
            <Field label="Amount at risk">
              <span className="text-[var(--primary-blue)]">{formatAmount(card.amount)}</span>
            </Field>
            <Field label="Stage">{stageTitle}</Field>
            <Field label="Created">{formatDate(card.createdAt)}</Field>
            <Field label="Last updated">{formatDate(card.updatedAt)}</Field>
          </dl>
          <div className="mt-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
              Case notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--gray-text)]">
              {card.details || "No notes yet."}
            </p>
          </div>
          <div className="mt-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
              Audit trail
            </p>
            {history && history.length === 0 && (
              <p className="mt-1 text-sm text-[var(--gray-text)]">No changes since the case was opened.</p>
            )}
            {history && history.length > 0 && (
              <ol aria-label="Audit trail" className="mt-2 max-h-40 space-y-2 overflow-y-auto border-l-2 border-[var(--stroke)] pl-3">
                {history.map((event, index) => (
                  <li key={index} className="text-sm leading-5">
                    <p className="text-[var(--navy-dark)]">{event.detail}</p>
                    <p className="text-xs text-[var(--gray-text)]">
                      {actorLabel[event.actor]} &middot; {formatDate(event.at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="mt-8 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-full bg-[var(--secondary-purple)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
            >
              Edit case
            </button>
            <button
              type="button"
              onClick={onArchive}
              className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
            >
              Archive case
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};
