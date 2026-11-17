import clsx from "clsx";
import type { RiskLevel } from "@/lib/kanban";

const styles: Record<RiskLevel, string> = {
  low: "border-[var(--stroke)] text-[var(--gray-text)]",
  medium: "border-[var(--primary-blue)]/40 text-[var(--primary-blue)]",
  high: "border-[var(--accent-yellow)] bg-[var(--accent-yellow)]/15 text-[#8a6300]",
  critical: "border-[#c0392b] bg-[#c0392b] text-white",
};

export const RiskBadge = ({ risk }: { risk: RiskLevel }) => (
  <span
    className={clsx(
      "inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
      styles[risk]
    )}
  >
    {risk}
  </span>
);
