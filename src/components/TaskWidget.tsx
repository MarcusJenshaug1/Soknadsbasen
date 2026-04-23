"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Calendar, Clock, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { format, isPast, isToday, isTomorrow, parseISO, compareAsc } from "date-fns";
import { nb } from "date-fns/locale";

/* ─── Types ───────────────────────────────────────────────── */

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  type: string | null;
  priority: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
}

interface Application {
  id: string;
  title: string;
  companyName: string;
  status: string;
  tasks: Task[];
}

/* ═══════════════════════════════════════════════════════════ */
/* ─── Task Widget Component ───────────────────────────────── */
/* ═══════════════════════════════════════════════════════════ */

export function TaskWidget() {
  const [tasks, setTasks] = useState<(Task & { appTitle: string; appCompany: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const applications: Application[] = await res.json();
        
        // Extract all incomplete tasks with app context
        const allTasks = applications.flatMap((app) =>
          app.tasks
            .filter((t) => !t.completedAt && t.dueAt)
            .map((t) => ({
              ...t,
              appTitle: app.title,
              appCompany: app.companyName,
            }))
        );

        // Sort by due date
        const sorted = allTasks.sort((a, b) => {
          if (!a.dueAt || !b.dueAt) return 0;
          return compareAsc(parseISO(a.dueAt), parseISO(b.dueAt));
        });

        // Only show next 5
        setTasks(sorted.slice(0, 5));
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-neutral-900">Kommende oppgaver</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 text-neutral-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-neutral-900">Kommende oppgaver</h2>
        </div>
        <div className="text-center py-12">
          <CheckCircle2 className="size-12 mx-auto mb-3 text-green-500" />
          <p className="text-sm text-neutral-600">Ingen kommende oppgaver!</p>
          <p className="text-xs text-neutral-500 mt-1">Du er à jour 🎉</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-neutral-900">Kommende oppgaver</h2>
        <Link
          href="/soknader"
          className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          Se alle
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => {
          const dueDate = task.dueAt ? parseISO(task.dueAt) : null;
          const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
          const isDueToday = dueDate && isToday(dueDate);
          const isDueTomorrow = dueDate && isTomorrow(dueDate);

          return (
            <div
              key={task.id}
              className={`
                p-3 rounded-lg border
                ${isOverdue ? "bg-red-50 border-red-200" : "bg-neutral-50 border-neutral-200"}
                hover:shadow-sm transition-shadow
              `}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {isOverdue ? (
                    <AlertCircle className="size-4 text-red-600" />
                  ) : (
                    <Clock className="size-4 text-neutral-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {task.title}
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5 truncate">
                    {task.appTitle} • {task.appCompany}
                  </p>

                  {dueDate && (
                    <div
                      className={`
                        flex items-center gap-1 text-xs mt-1.5
                        ${isOverdue ? "text-red-700 font-medium" : ""}
                        ${isDueToday ? "text-orange-700 font-medium" : ""}
                        ${isDueTomorrow ? "text-blue-700" : ""}
                        ${!isOverdue && !isDueToday && !isDueTomorrow ? "text-neutral-500" : ""}
                      `}
                    >
                      <Calendar className="size-3" />
                      <span>
                        {isOverdue
                          ? `Forfalt: ${format(dueDate, "d. MMM", { locale: nb })}`
                          : isDueToday
                          ? "Forfaller i dag"
                          : isDueTomorrow
                          ? "Forfaller i morgen"
                          : format(dueDate, "d. MMM", { locale: nb })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
