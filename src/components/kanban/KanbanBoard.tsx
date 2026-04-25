"use client";

import { useState } from "react";
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
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

export type KanbanColumn = {
  id: string;
  label: string;
  color?: string;
};

type Props<T extends { id: string }> = {
  columns: readonly KanbanColumn[];
  items: T[];
  getColumnId: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  onMove?: (itemId: string, toColumnId: string) => Promise<void> | void;
};

export function KanbanBoard<T extends { id: string }>({
  columns,
  items,
  getColumnId,
  renderCard,
  onMove,
}: Props<T>) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const itemId = String(e.active.id);
    const toCol = e.over ? String(e.over.id) : null;
    if (!toCol) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const fromCol = optimistic[itemId] ?? getColumnId(item);
    if (fromCol === toCol) return;
    setOptimistic((prev) => ({ ...prev, [itemId]: toCol }));
    try {
      await onMove?.(itemId, toCol);
    } catch {
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    }
  }

  const itemsByColumn = new Map<string, T[]>();
  for (const col of columns) itemsByColumn.set(col.id, []);
  for (const item of items) {
    const colId = optimistic[item.id] ?? getColumnId(item);
    if (itemsByColumn.has(colId)) {
      itemsByColumn.get(colId)!.push(item);
    }
  }

  const draggingItem = items.find((i) => i.id === draggingId) ?? null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
        {columns.map((col) => (
          <Column key={col.id} column={col} count={itemsByColumn.get(col.id)!.length}>
            {itemsByColumn.get(col.id)!.map((item) => (
              <DraggableCard key={item.id} id={item.id} dragging={draggingId === item.id}>
                {renderCard(item)}
              </DraggableCard>
            ))}
          </Column>
        ))}
      </div>
      <DragOverlay>{draggingItem ? <div className="opacity-90">{renderCard(draggingItem)}</div> : null}</DragOverlay>
    </DndContext>
  );
}

function Column({
  column,
  count,
  children,
}: {
  column: KanbanColumn;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div
      ref={setNodeRef}
      className={
        "shrink-0 snap-start flex flex-col rounded-xl bg-black/[0.03] dark:bg-white/[0.04] " +
        (isOver ? "outline outline-2 outline-[var(--accent)]/30" : "")
      }
      style={{ width: "var(--kanban-col-min-width, 240px)", minHeight: 200 }}
    >
      <header className="flex items-center gap-2 px-3 py-2.5 border-b border-black/6 dark:border-white/8">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: column.color ?? "var(--ink-muted)" }}
          aria-hidden
        />
        <span className="text-[12px] font-medium truncate">{column.label}</span>
        <span className="text-[11px] font-mono text-ink/45 ml-auto">{count}</span>
      </header>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100dvh-280px)]">{children}</div>
    </div>
  );
}

function DraggableCard({
  id,
  dragging,
  children,
}: {
  id: string;
  dragging: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: dragging ? 0.4 : 1,
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
}
