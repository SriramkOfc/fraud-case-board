import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalProps = {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

// Window over a dimmed page. Closes on Close, backdrop click or Escape.
export const Modal = ({ eyebrow, title, onClose, children }: ModalProps) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Listen on the window: after a form submits, the focused button unmounts and focus falls to <body>
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,33,71,0.45)] px-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-8 shadow-[var(--shadow)] outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
              {eyebrow}
            </p>
            <h2 id={titleId} className="mt-2 font-display text-2xl font-semibold text-[var(--navy-dark)]">
              {title}
            </h2>
            <div className="mt-3 h-1 w-12 rounded-full bg-[var(--accent-yellow)]" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
          >
            Close
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
};
