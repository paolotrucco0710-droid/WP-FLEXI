"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("demo@flexi.local");
  const [password, setPassword] = useState("flexi123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login fallito");
        return;
      }

      const from = searchParams.get("from") || "/";
      router.push(from);
      router.refresh();
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold">FLEXI</h1>
        <p className="mb-6 text-sm text-flexi-gray">Accedi al tuo pannello</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-flexi-gray">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-flexi-gray">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-2 text-sm text-flexi-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-flexi-purple px-6 py-4 text-base font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Accesso..." : "ACCEDI"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-flexi-gray">
          Demo: demo@flexi.local / flexi123
        </p>
      </div>
    </div>
  );
}
