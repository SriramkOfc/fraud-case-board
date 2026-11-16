"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { CaseDialog } from "@/components/CaseDialog";
import { ArchiveView } from "@/components/ArchiveView";
import { createId, moveCard, type BoardData, type CaseInput } from "@/lib/kanban";

type KanbanBoardProps = {
  board: BoardData;
  updateBoard: (update: (prev: BoardData) => BoardData) => void;
  onLogout: () => void;
};

export const KanbanBoard = ({ board, updateBoard, onLogout }: KanbanBoardProps) => {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cardsById = useMemo(() => board.cards, [board.cards]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const cardId = active.id as string;
    updateBoard((prev) => {
      const columns = moveCard(prev.columns, cardId, over.id as string);
      const stageOf = (cols: BoardData["columns"]) =>
        cols.find((column) => column.cardIds.includes(cardId))?.id;
      if (stageOf(columns) === stageOf(prev.columns)) {
        return { ...prev, columns };
      }
      // A stage move counts as an update to the case
      return {
        ...prev,
        columns,
        cards: {
          ...prev.cards,
          [cardId]: { ...prev.cards[cardId], updatedAt: new Date().toISOString() },
        },
      };
    });
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    updateBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    }));
  };

  const handleAddCard = (columnId: string, input: CaseInput) => {
    const id = createId("card");
    const now = new Date().toISOString();
    updateBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [id]: { ...input, id, createdAt: now, updatedAt: now },
      },
      columns: prev.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    }));
  };

  const handleEditCard = (cardId: string, input: CaseInput) => {
    updateBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [cardId]: { ...prev.cards[cardId], ...input, updatedAt: new Date().toISOString() },
      },
    }));
  };

  const setArchivedAt = (cardId: string, archivedAt: string | null) => {
    const now = new Date().toISOString();
    updateBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [cardId]: { ...prev.cards[cardId], archivedAt, updatedAt: now },
      },
    }));
  };

  const handleDeleteCard = (cardId: string) => {
    updateBoard((prev) => ({
      ...prev,
      cards: Object.fromEntries(Object.entries(prev.cards).filter(([id]) => id !== cardId)),
      columns: prev.columns.map((column) => ({
        ...column,
        cardIds: column.cardIds.filter((id) => id !== cardId),
      })),
    }));
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;
  const openCard = openCardId ? board.cards[openCardId] : null;
  const openColumn = board.columns.find((column) => openCardId && column.cardIds.includes(openCardId));
  const stageTitleOf = (cardId: string) =>
    board.columns.find((column) => column.cardIds.includes(cardId))?.title ?? "";
  const archivedCards = Object.values(board.cards)
    .filter((card) => card.archivedAt)
    .sort((a, b) => b.archivedAt!.localeCompare(a.archivedAt!));

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Fraud Operations
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
                Fraud Case Board
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                Track every fraud alert from trigger to decision. Drag cases between
                stages, rename stages, and capture investigation notes.
              </p>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                  Focus
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
                  Alert to decision. Five stages.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowArchive((prev) => !prev)}
                className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--primary-blue)] transition hover:border-[var(--primary-blue)]"
              >
                {showArchive ? "Back to board" : `Archived (${archivedCards.length})`}
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
              >
                Log out
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                {column.title}
              </div>
            ))}
          </div>
        </header>

        {showArchive ? (
          <ArchiveView
            cards={archivedCards}
            stageTitleOf={stageTitleOf}
            onRestore={(cardId) => setArchivedAt(cardId, null)}
            onDelete={handleDeleteCard}
          />
        ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <section className="grid gap-6 lg:grid-cols-5">
            {board.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={column.cardIds
                  .map((cardId) => board.cards[cardId])
                  .filter((card) => !card.archivedAt)}
                onRename={handleRenameColumn}
                onAddCard={handleAddCard}
                onOpenCard={setOpenCardId}
              />
            ))}
          </section>
          <DragOverlay>
            {activeCard ? (
              <div className="w-[260px]">
                <KanbanCardPreview card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        )}
        {openCard && openColumn && (
          <CaseDialog
            key={openCard.id}
            card={openCard}
            stageTitle={openColumn.title}
            onClose={() => setOpenCardId(null)}
            onEdit={(input) => handleEditCard(openCard.id, input)}
            onArchive={() => {
              setArchivedAt(openCard.id, new Date().toISOString());
              setOpenCardId(null);
            }}
          />
        )}
      </main>
    </div>
  );
};
