import { useState, type FormEvent } from "react";
import clsx from "clsx";
import type { CaseInput } from "@/lib/kanban";

type CaseFormProps = {
  initial?: CaseInput; // omitted for a new case: all fields start empty
  submitLabel: string;
  onSubmit: (input: CaseInput) => void;
  onCancel: () => void;
};

const captionClass =
  "text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]";

const inputClass =
  "w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]";

export const CaseForm = ({ initial, submitLabel, onSubmit, onCancel }: CaseFormProps) => {
  const [form, setForm] = useState(
    initial
      ? { ...initial, amount: String(initial.amount) }
      : { title: "", details: "", customerName: "", accountLast4: "", amount: "" }
  );
  const set = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.customerName.trim()) {
      return;
    }
    onSubmit({
      title: form.title.trim(),
      details: form.details.trim(),
      customerName: form.customerName.trim(),
      accountLast4: form.accountLast4,
      amount: Number(form.amount),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="block flex-1 space-y-1">
        <span className={captionClass}>Title</span>
        <input
          value={form.title}
          onChange={(event) => set("title")(event.target.value)}
          aria-label="Case title"
          placeholder="Case title"
          className={clsx(inputClass, "font-medium")}
          required
        />
      </label>
      <label className="block flex-1 space-y-1">
        <span className={captionClass}>Customer</span>
        <input
          value={form.customerName}
          onChange={(event) => set("customerName")(event.target.value)}
          aria-label="Customer name"
          placeholder="Customer name"
          className={inputClass}
          required
        />
      </label>
      <div className="flex gap-2">
        <label className="block flex-1 space-y-1">
          <span className={captionClass}>Acct last 4</span>
          <input
            value={form.accountLast4}
            onChange={(event) => set("accountLast4")(event.target.value)}
            aria-label="Account last 4 digits"
            placeholder="Acct last 4"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            title="Last 4 digits of the account"
            className={inputClass}
            required
          />
        </label>
        <label className="block flex-1 space-y-1">
          <span className={captionClass}>Amount (USD)</span>
          <input
            value={form.amount}
            onChange={(event) => set("amount")(event.target.value)}
            aria-label="Amount at risk"
            placeholder="Amount (USD)"
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            required
          />
        </label>
      </div>
      <label className="block flex-1 space-y-1">
        <span className={captionClass}>Details</span>
        <textarea
          value={form.details}
          onChange={(event) => set("details")(event.target.value)}
          aria-label="Case details"
          placeholder="Case details"
          rows={3}
          className={clsx(inputClass, "resize-none text-[var(--gray-text)]")}
        />
      </label>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
