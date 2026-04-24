"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Trash2, Calendar, AlertCircle, Edit2, Save } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { nb } from "date-fns/locale";

/* ─── Types ───────────────────────────────────────────────── */

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  type: string | null;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskItemProps {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => Promise<void>;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

/* ─── Task Type Labels ────────────────────────────────────── */

const TASK_TYPE_LABELS: Record<string, string> = {
  followup: "Oppfølging",
  document: "Dokument",
  research: "Research",
  interview: "Intervju",
  other: "Annet",
};

const TASK_TYPE_COLORS: Record<string, string> = {
  followup: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  document: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  research: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  interview: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  other: "bg-panel text-ink/80",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Lav",
  medium: "Middels",
  high: "Høy",
  urgent: "Haster",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-ink/55",
  medium: "text-blue-600 dark:text-blue-400",
  high: "text-orange-600 dark:text-orange-400",
  urgent: "text-red-600 dark:text-red-400",
};

/* ═══════════════════════════════════════════════════════════ */
/* ─── Task Item Component ─────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════ */

export function TaskItem({ task, onToggle, onUpdate, onDelete }: TaskItemProps) {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || "");
  const [editDueAt, setEditDueAt] = useState(
    task.dueAt ? new Date(task.dueAt).toISOString().split("T")[0] : ""
  );
  const [editType, setEditType] = useState(task.type || "other");
  const [editPriority, setEditPriority] = useState(task.priority || "medium");

  const isCompleted = !!task.completedAt;
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const isOverdue = dueDate && !isCompleted && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = dueDate && !isCompleted && isToday(dueDate);
  const isDueTomorrow = dueDate && !isCompleted && isTomorrow(dueDate);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await onToggle(task.id, !isCompleted);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    setLoading(true);
    try {
      await onUpdate(task.id, {
        title: editTitle,
        description: editDescription.trim() || null,
        dueAt: editDueAt || null,
        type: editType,
        priority: editPriority,
      });
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditDueAt(task.dueAt ? new Date(task.dueAt).toISOString().split("T")[0] : "");
    setEditType(task.type || "other");
    setEditPriority(task.priority || "medium");
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Er du sikker på at du vil slette denne oppgaven?")) return;
    setLoading(true);
    try {
      await onDelete(task.id);
    } finally {
      setLoading(false);
    }
  };

  if (editing) {
    return (
      <div className="bg-surface border border-indigo-300 rounded-lg p-4 space-y-3 shadow-sm">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full px-3 py-2 border border-black/12 dark:border-white/12 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Oppgavetittel..."
          autoFocus
        />
        
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          className="w-full px-3 py-2 border border-black/12 dark:border-white/12 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Beskrivelse (valgfritt)..."
          rows={3}
        />
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Forfallsdato</label>
            <input
              type="date"
              value={editDueAt}
              onChange={(e) => setEditDueAt(e.target.value)}
              className="w-full px-3 py-2 border border-black/12 dark:border-white/12 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Type</label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              className="w-full px-3 py-2 border border-black/12 dark:border-white/12 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="other">Annet</option>
              <option value="followup">Oppfølging</option>
              <option value="document">Dokument</option>
              <option value="research">Research</option>
              <option value="interview">Intervju</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1">Prioritet</label>
          <div className="flex gap-2">
            {(["low", "medium", "high", "urgent"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setEditPriority(p)}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${editPriority === p
                    ? "bg-indigo-100 text-indigo-700 border-2 border-indigo-500"
                    : "bg-panel text-ink/70 border border-black/12 dark:border-white/12 hover:bg-panel"
                  }
                `}
              >
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-ink/70 hover:bg-panel rounded-lg transition-colors disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !editTitle.trim()}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="size-4" />
            Lagre
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        group flex items-start gap-3 p-3 rounded-lg border
        ${isCompleted ? "bg-panel border-black/8 dark:border-white/8" : "bg-surface border-black/8 dark:border-white/8"}
        ${isOverdue && !isCompleted ? "border-red-300 bg-red-50 dark:bg-red-900/20" : ""}
        hover:shadow-sm transition-all
      `}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        disabled={loading}
        className="mt-0.5 shrink-0 text-ink/40 hover:text-indigo-600 transition-colors disabled:opacity-50"
      >
        {isCompleted ? (
          <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
        ) : (
          <Circle className="size-5" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p
            className={`
              flex-1 text-sm font-medium
              ${isCompleted ? "line-through text-ink/55" : "text-ink"}
            `}
          >
            {task.title}
          </p>
          
          {/* Priority indicator */}
          {task.priority && task.priority !== "medium" && (
            <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <button
            onClick={() => setShowDescription(!showDescription)}
            className="text-left mt-1 text-xs text-ink/70 hover:text-ink transition-colors"
          >
            {showDescription ? (
              <p className="whitespace-pre-wrap">{task.description}</p>
            ) : (
              <p className="truncate">{task.description}</p>
            )}
          </button>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {/* Due date */}
          {dueDate && (
            <div
              className={`
                flex items-center gap-1 text-xs
                ${isOverdue ? "text-red-600 dark:text-red-400 font-medium" : ""}
                ${isDueToday ? "text-orange-600 dark:text-orange-400 font-medium" : ""}
                ${isDueTomorrow ? "text-blue-600 dark:text-blue-400" : ""}
                ${!isOverdue && !isDueToday && !isDueTomorrow ? "text-ink/55" : ""}
              `}
            >
              {isOverdue && <AlertCircle className="size-3" />}
              <Calendar className="size-3" />
              <span>
                {isDueToday
                  ? "I dag"
                  : isDueTomorrow
                  ? "I morgen"
                  : format(dueDate, "d. MMM", { locale: nb })}
              </span>
            </div>
          )}

          {/* Type badge */}
          {task.type && (
            <span
              className={`
                px-2 py-0.5 rounded-full text-xs font-medium
                ${TASK_TYPE_COLORS[task.type] || "bg-panel text-ink/80"}
              `}
            >
              {TASK_TYPE_LABELS[task.type] || task.type}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          disabled={loading}
          className="p-1.5 text-ink/40 hover:text-indigo-600 transition-colors disabled:opacity-50"
        >
          <Edit2 className="size-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="p-1.5 text-ink/40 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
