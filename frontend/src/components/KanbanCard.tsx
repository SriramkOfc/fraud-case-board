import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { CaseSummary } from "@/components/CaseSummary";
import type { Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onOpen: (cardId: string) => void;
};

export const KanbanCard = ({ card, onOpen }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "cursor-pointer rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_12px_24px_rgba(3,33,71,0.08)]",
        "transition-all duration-150 hover:border-[var(--stroke)]",
        isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
      )}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onOpen(card.id);
        }
      }}
      data-testid={`card-${card.id}`}
    >
      <CaseSummary card={card} />
    </article>
  );
};
