"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registrazione fallita");
        return;
      }

      router.push("/onboarding");
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
        <p className="mb-6 text-sm text-flexi-gray">Crea il tuo account</p>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            placeholder="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 p-3 text-sm"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-200 p-3 text-sm"
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 caratteri)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 p-3 text-sm"
            minLength={6}
            required
          />

          {error && (
            <p className="rounded-lg bg-red-50 p-2 text-sm text-flexi-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-flexi-purple px-6 py-4 text-base font-bold text-white disabled:opacity-50"
          >
            {loading ? "Creazione..." : "REGISTRATI"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-flexi-gray">
          Hai già un account?{" "}
          <Link href="/login" className="font-semibold text-flexi-purple">
            Accedi
          </Link>
        </p>
      </div>
    </div>
  );
}
