"use client";

import { useEffect, useMemo, useState } from "react";

type Log = {
  id: number;
  petName: string;
  task: string;
  time: string;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  petName: string;
  task: string;
  time: string;
};

const TASK_OPTIONS = ["Fed", "Walked", "Vet Visit", "Medication", "Other"];

const toDatetimeLocal = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export default function Home() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [form, setForm] = useState<FormState>({
    petName: "",
    task: TASK_OPTIONS[0],
    time: toDatetimeLocal(new Date()),
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = editingId !== null;

  const sortedLogs = useMemo(
    () =>
      [...logs].sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
      ),
    [logs]
  );

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/logs");
      if (!response.ok) {
        throw new Error("Failed to load logs");
      }
      const data: Log[] = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const resetForm = () => {
    setForm({
      petName: "",
      task: TASK_OPTIONS[0],
      time: toDatetimeLocal(new Date()),
    });
    setEditingId(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        petName: form.petName.trim(),
        task: form.task,
        time: new Date(form.time).toISOString(),
      };

      const response = await fetch(
        isEditing ? `/api/logs/${editingId}` : "/api/logs",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Failed to save log");
      }

      const data: Log = await response.json();

      setLogs((prev) =>
        isEditing
          ? prev.map((item) => (item.id === data.id ? data : item))
          : [data, ...prev]
      );

      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save log");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (log: Log) => {
    setEditingId(log.id);
    setForm({
      petName: log.petName,
      task: log.task,
      time: toDatetimeLocal(log.time),
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this entry?")) return;
    setError(null);

    try {
      const response = await fetch(`/api/logs/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Failed to delete log");
      }

      setLogs((prev) => prev.filter((log) => log.id !== id));
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete log");
    }
  };

  const formattedLogs = sortedLogs.map((log) => ({
    ...log,
    readableTime: new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(log.time)),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-amber-50 to-orange-50 px-4 py-10 sm:px-8">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header>
          <p className="inline-flex items-center rounded-full bg-white/70 px-4 py-1 text-sm font-medium text-orange-600 shadow-sm">
            Simple routines, happy pets
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-orange-950">
            Pet Care Log
          </h1>
          <p className="mt-2 text-lg text-orange-800/80">
            Track feedings, walks, meds, or vet visits in one warm, friendly
            place.
          </p>
        </header>

        <section className="rounded-3xl border border-orange-100 bg-white/80 p-6 shadow-[0_20px_45px_rgba(239,129,74,0.12)] backdrop-blur">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-orange-950">
                {isEditing ? "Update log" : "Add new log"}
              </h2>
              <p className="text-sm text-orange-700/80">
                {isEditing
                  ? "Editing an existing entry. Save or cancel to continue."
                  : "Only three fields to capture everything you need."}
              </p>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-medium text-orange-600 underline-offset-4 hover:text-orange-700 hover:underline"
              >
                Cancel edit
              </button>
            )}
          </div>

          <form className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-orange-900/80">
              Pet name
              <input
                type="text"
                value={form.petName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, petName: event.target.value }))
                }
                placeholder="Milo"
                required
                className="rounded-2xl border border-orange-100 bg-white/80 px-3 py-2 text-base text-orange-950 shadow-inner focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-orange-900/80">
              Task
              <select
                value={form.task}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, task: event.target.value }))
                }
                className="rounded-2xl border border-orange-100 bg-white/80 px-3 py-2 text-base text-orange-950 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
              >
                {TASK_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-orange-900/80">
              Time
              <input
                type="datetime-local"
                value={form.time}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, time: event.target.value }))
                }
                required
                className="rounded-2xl border border-orange-100 bg-white/80 px-3 py-2 text-base text-orange-950 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="md:col-span-3 mt-2 inline-flex items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-200 disabled:shadow-none"
            >
              {saving ? "Saving..." : isEditing ? "Save changes" : "Add log"}
            </button>
          </form>
          {error && (
            <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}
        </section>

        <section className="flex-1 rounded-3xl border border-orange-100 bg-white/85 p-6 shadow-[0_20px_45px_rgba(248,148,92,0.14)] backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-orange-950">History</h2>
              <p className="text-sm text-orange-700/80">
                {loading
                  ? "Loading logs..."
                  : `${sortedLogs.length} entr${
                      sortedLogs.length === 1 ? "y" : "ies"
                    }`}
              </p>
            </div>
            <button
              type="button"
              onClick={fetchLogs}
              className="text-sm font-semibold text-orange-600 underline-offset-4 hover:text-orange-700 hover:underline"
            >
              Refresh
            </button>
          </div>

          {sortedLogs.length === 0 && !loading ? (
            <p className="rounded-2xl border border-dashed border-orange-200 px-4 py-6 text-center text-sm text-orange-700/80">
              No activity yet. Add your first log above.
            </p>
          ) : (
            <ul className="divide-y divide-orange-100/70">
              {formattedLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-base font-semibold text-orange-950">
                      {log.petName} · {log.task}
                    </p>
                    <p className="text-sm text-orange-800/70">
                      {log.readableTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(log)}
                      className="rounded-2xl border border-orange-200/80 px-4 py-1.5 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(log.id)}
                      className="rounded-2xl border border-rose-200/80 px-4 py-1.5 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
