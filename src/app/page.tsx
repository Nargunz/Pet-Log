"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

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

type LoginFormState = {
  email: string;
  password: string;
};

const TASK_OPTIONS = ["Fed", "Walked", "Vet Visit", "Medication", "Other"];

const toDatetimeLocal = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export default function Home() {
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<Log[]>([]);
  const [form, setForm] = useState<FormState>({
    petName: "",
    task: TASK_OPTIONS[0],
    time: toDatetimeLocal(new Date()),
  });
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    email: "",
    password: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const isEditing = editingId !== null;
  const isAdmin = session?.user?.role === "admin";
  const isUser = session?.user?.role === "user";
  const isAuthenticated = isAdmin || isUser;

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
    if (isAuthenticated) {
      fetchLogs();
    }
  }, [isAuthenticated]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const result = await signIn("credentials", {
        email: loginForm.email,
        password: loginForm.password,
        redirect: false,
      });

      if (result?.error) {
        setLoginError("Invalid email or password");
      } else {
        setLoginForm({ email: "", password: "" });
      }
    } catch (err) {
      setLoginError("Failed to login");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError(null);
    await signIn("google", { callbackUrl: "/" });
  };

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
    if (!isAdmin) return;

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
    if (!isAdmin) return;
    setEditingId(log.id);
    setForm({
      petName: log.petName,
      task: log.task,
      time: toDatetimeLocal(log.time),
    });
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) return;
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

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 via-amber-50 to-orange-50 flex items-center justify-center">
        <p className="text-orange-800">Loading...</p>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 via-amber-50 to-orange-50 px-4 py-10 sm:px-8 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-orange-100 bg-white/80 p-8 shadow-[0_20px_45px_rgba(239,129,74,0.12)] backdrop-blur">
            <header className="mb-8 text-center">
              <h1 className="text-4xl font-semibold text-orange-950">
                Pet Care Log
              </h1>
              <p className="mt-2 text-lg text-orange-800/80">
                Sign in to view pet care logs
              </p>
            </header>

            {/* Admin Login Form */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-orange-950 mb-4">
                Admin Login
              </h2>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <label className="flex flex-col gap-2 text-sm font-medium text-orange-900/80">
                  Email
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="admin@petcare.com"
                    required
                    className="rounded-2xl border border-orange-100 bg-white/80 px-3 py-2 text-base text-orange-950 shadow-inner focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-orange-900/80">
                  Password
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="Enter password"
                    required
                    className="rounded-2xl border border-orange-100 bg-white/80 px-3 py-2 text-base text-orange-950 shadow-inner focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </label>
                {loginError && (
                  <p className="rounded-2xl bg-rose-50 px-4 py-2 text-sm text-rose-600">
                    {loginError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full inline-flex items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-200 disabled:shadow-none"
                >
                  {isLoggingIn ? "Logging in..." : "Login as Admin"}
                </button>
              </form>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-orange-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white/80 text-orange-600">OR</span>
              </div>
            </div>

            {/* Google Sign In for Users */}
            <div>
              <h2 className="text-xl font-semibold text-orange-950 mb-4">
                User Login (View Only)
              </h2>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full inline-flex items-center justify-center gap-3 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-base font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </button>
              <p className="mt-3 text-sm text-orange-700/80 text-center">
                Users can view logs but cannot edit or delete
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main app content for authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-amber-50 to-orange-50 px-4 py-10 sm:px-8">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header>
          <div className="flex items-center justify-between">
            <div>
              <p className="inline-flex items-center rounded-full bg-white/70 px-4 py-1 text-sm font-medium text-orange-600 shadow-sm">
                {isAdmin ? "Admin Mode" : "View Only Mode"}
              </p>
              <h1 className="mt-4 text-4xl font-semibold text-orange-950">
                Pet Care Log
              </h1>
              <p className="mt-2 text-lg text-orange-800/80">
                {isAdmin
                  ? "Track feedings, walks, meds, or vet visits in one warm, friendly place."
                  : "View pet care logs (read-only)"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="text-sm text-orange-700/80">
                {session?.user?.name || session?.user?.email}
              </p>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm font-semibold text-orange-600 underline-offset-4 hover:text-orange-700 hover:underline"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Admin-only form section */}
        {isAdmin && (
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
        )}

        {/* Logs history section */}
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
              No activity yet. {isAdmin ? "Add your first log above." : "No logs available."}
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
                  {isAdmin && (
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
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
