import { useState, type ReactNode } from "react";
import { CaseForm } from "@/components/CaseForm";
import { Modal } from "@/components/Modal";
import { formatAmount, formatDate, type Card, type CaseInput } from "@/lib/kanban";

type CaseDialogProps = {
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

export const CaseDialog = ({ card, stageTitle, onClose, onEdit, onArchive }: CaseDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);

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
