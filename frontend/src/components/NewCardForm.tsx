import { useState } from "react";
import { CaseForm } from "@/components/CaseForm";
import { Modal } from "@/components/Modal";
import type { CaseInput } from "@/lib/kanban";

type NewCardFormProps = {
  stageTitle: string;
  onAdd: (input: CaseInput) => void;
};

export const NewCardForm = ({ stageTitle, onAdd }: NewCardFormProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full rounded-full border border-dashed border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--primary-blue)] transition hover:border-[var(--primary-blue)]"
      >
        Add a card
      </button>
      {isOpen && (
        <Modal eyebrow={stageTitle} title="New case" onClose={() => setIsOpen(false)}>
          <CaseForm
            submitLabel="Add card"
            onSubmit={(input) => {
              onAdd(input);
              setIsOpen(false);
            }}
            onCancel={() => setIsOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};
