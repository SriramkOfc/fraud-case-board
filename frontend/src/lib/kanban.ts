export type Card = {
  id: string;
  title: string;
  details: string;
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
};

export type BoardData = {
  columns: Column[];
  cards: Record<string, Card>;
};

export const initialData: BoardData = {
  columns: [
    { id: "col-alert", title: "Alert Triggered", cardIds: ["card-1", "card-2"] },
    { id: "col-review", title: "Review", cardIds: ["card-3", "card-4"] },
    { id: "col-investigation", title: "Investigation", cardIds: ["card-5"] },
    { id: "col-verification", title: "Verification", cardIds: ["card-6"] },
    { id: "col-decision", title: "Decision", cardIds: ["card-7", "card-8"] },
  ],
  cards: {
    "card-1": {
      id: "card-1",
      title: "Velocity rule: 14 card txns in 10 min",
      details:
        "Rule engine flagged rapid low-value card-not-present purchases. Auto-hold placed; assign to analyst queue by risk score.",
    },
    "card-2": {
      id: "card-2",
      title: "ML score 0.94: new device login + wire",
      details:
        "Model alert on login from unseen device followed by $18,500 outbound wire. Wire paused pending triage.",
    },
    "card-3": {
      id: "card-3",
      title: "Triage: geo-mismatch purchase",
      details:
        "Check customer profile, travel notes, and recent history. Rule out false positive before escalating.",
    },
    "card-4": {
      id: "card-4",
      title: "Triage: duplicate refund requests",
      details:
        "Confirm alert data is complete, dedupe related alerts, and link to existing case if one is open.",
    },
    "card-5": {
      id: "card-5",
      title: "Account takeover - merchant #4471",
      details:
        "Pull device fingerprints, IP logs, and linked accounts. Trace fund flow and document timeline in case notes.",
    },
    "card-6": {
      id: "card-6",
      title: "Confirm txns with cardholder",
      details:
        "Outbound call / OTP verification with customer. Validate identity (KYC) and confirm which transactions are disputed.",
    },
    "card-7": {
      id: "card-7",
      title: "Confirmed fraud - close and recover",
      details:
        "Block card, reissue, file chargeback, and submit SAR if thresholds are met. Feed outcome back to model labels.",
    },
    "card-8": {
      id: "card-8",
      title: "False positive - release hold",
      details:
        "Release funds, notify customer, and record reason code to tune the triggering rule.",
    },
  },
};

const isColumnId = (columns: Column[], id: string) =>
  columns.some((column) => column.id === id);

const findColumnId = (columns: Column[], id: string) => {
  if (isColumnId(columns, id)) {
    return id;
  }
  return columns.find((column) => column.cardIds.includes(id))?.id;
};

export const moveCard = (
  columns: Column[],
  activeId: string,
  overId: string
): Column[] => {
  const activeColumnId = findColumnId(columns, activeId);
  const overColumnId = findColumnId(columns, overId);

  if (!activeColumnId || !overColumnId) {
    return columns;
  }

  const activeColumn = columns.find((column) => column.id === activeColumnId);
  const overColumn = columns.find((column) => column.id === overColumnId);

  if (!activeColumn || !overColumn) {
    return columns;
  }

  const isOverColumn = isColumnId(columns, overId);

  if (activeColumnId === overColumnId) {
    if (isOverColumn) {
      const nextCardIds = activeColumn.cardIds.filter(
        (cardId) => cardId !== activeId
      );
      nextCardIds.push(activeId);
      return columns.map((column) =>
        column.id === activeColumnId
          ? { ...column, cardIds: nextCardIds }
          : column
      );
    }

    const oldIndex = activeColumn.cardIds.indexOf(activeId);
    const newIndex = activeColumn.cardIds.indexOf(overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return columns;
    }

    const nextCardIds = [...activeColumn.cardIds];
    nextCardIds.splice(oldIndex, 1);
    nextCardIds.splice(newIndex, 0, activeId);

    return columns.map((column) =>
      column.id === activeColumnId
        ? { ...column, cardIds: nextCardIds }
        : column
    );
  }

  const activeIndex = activeColumn.cardIds.indexOf(activeId);
  if (activeIndex === -1) {
    return columns;
  }

  const nextActiveCardIds = [...activeColumn.cardIds];
  nextActiveCardIds.splice(activeIndex, 1);

  const nextOverCardIds = [...overColumn.cardIds];
  if (isOverColumn) {
    nextOverCardIds.push(activeId);
  } else {
    const overIndex = overColumn.cardIds.indexOf(overId);
    const insertIndex = overIndex === -1 ? nextOverCardIds.length : overIndex;
    nextOverCardIds.splice(insertIndex, 0, activeId);
  }

  return columns.map((column) => {
    if (column.id === activeColumnId) {
      return { ...column, cardIds: nextActiveCardIds };
    }
    if (column.id === overColumnId) {
      return { ...column, cardIds: nextOverCardIds };
    }
    return column;
  });
};

export const createId = (prefix: string) => {
  const randomPart = Math.random().toString(36).slice(2, 8);
  const timePart = Date.now().toString(36);
  return `${prefix}-${randomPart}${timePart}`;
};
