"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { TaskItem, type Task } from "./TaskItem";

/* ─── Types ───────────────────────────────────────────────── */

interface TaskListProps {
  applicationId: string;
}

/* ═══════════════════════════════════════════════════════════ */
/* ─── Task List Component ─────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════ */

export function TaskList({ applicationId }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueAt, setNewTaskDueAt] = useState("");
  const [newTaskType, setNewTaskType] = useState("other");

  /* ── Fetch tasks ───────────────────────────────────────── */
  useEffect(() => {
    loadTasks();
  }, [applicationId]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Add task ──────────────────────────────────────────── */
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setAdding(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          dueAt: newTaskDueAt || null,
          type: newTaskType,
        }),
      });

      if (res.ok) {
        const newTask = await res.json();
        setTasks((prev) => [...prev, newTask]);
        setNewTaskTitle("");
        setNewTaskDueAt("");
        setNewTaskType("other");
      }
    } catch (err) {
      console.error("Failed to add task:", err);
    } finally {
      setAdding(false);
    }
  };

  /* ── Toggle task completion ────────────────────────────── */
  const handleToggle = async (taskId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedAt: completed ? new Date().toISOString() : null,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updated : t))
        );
      }
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  /* ── Update task ────────────────────────────────────────── */
  const handleUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updated : t))
        );
      }
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  /* ── Delete task ───────────────────────────────────────── */
  const handleDelete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  /* ── Render ────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-6 text-neutral-400 animate-spin" />
      </div>
    );
  }

  const incompleteTasks = tasks.filter((t) => !t.completedAt);
  const completedTasks = tasks.filter((t) => t.completedAt);

  return (
    <div className="space-y-4">
      {/* Add task form */}
      <form onSubmit={handleAddTask} className="bg-neutral-50 rounded-lg p-4 space-y-3">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Legg til en ny oppgave..."
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={adding}
        />

        <div className="flex gap-3">
          <input
            type="date"
            value={newTaskDueAt}
            onChange={(e) => setNewTaskDueAt(e.target.value)}
            className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={adding}
          />

          <select
            value={newTaskType}
            onChange={(e) => setNewTaskType(e.target.value)}
            className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={adding}
          >
            <option value="other">Annet</option>
            <option value="followup">Oppfølging</option>
            <option value="document">Dokument</option>
            <option value="research">Research</option>
            <option value="interview">Intervju</option>
          </select>

          <button
            type="submit"
            disabled={!newTaskTitle.trim() || adding}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {adding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Legg til
          </button>
        </div>
      </form>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 text-sm">
          Ingen oppgaver ennå. Legg til en for å komme i gang!
        </div>
      ) : (
        <>
          {/* Incomplete tasks */}
          {incompleteTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-neutral-700 px-1">
                Aktive oppgaver ({incompleteTasks.length})
              </h4>
              {incompleteTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-neutral-500 px-1">
                Fullførte ({completedTasks.length})
              </h4>
              {completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
