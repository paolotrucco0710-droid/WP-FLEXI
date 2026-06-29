"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [csv, setCsv] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (payload: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore");
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await submit({ step: 1, name, shopName });
    if (data) setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await submit({ step: 2, phoneId, apiToken });
    if (data) setStep(3);
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await submit({ step: 3, csv });
    if (data?.completed) {
      router.push("/");
      router.refresh();
    }
  };

  const handleSkipWhatsApp = () => setStep(3);
  const handleSkipImport = async () => {
    const data = await submit({ step: 3, csv: "" });
    if (data?.completed) {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold">Setup Flexi</h1>
        <p className="mb-6 text-sm text-flexi-gray">Step {step} di 3</p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-2 text-sm text-flexi-red">{error}</p>
        )}

        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <input
              placeholder="Il tuo nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              required
            />
            <input
              placeholder="Nome negozio"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-flexi-purple py-4 font-bold text-white disabled:opacity-50"
            >
              CONTINUA
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <p className="text-sm text-flexi-gray">
              Collega WhatsApp Business API (Meta Cloud)
            </p>
            <input
              placeholder="Phone Number ID"
              value={phoneId}
              onChange={(e) => setPhoneId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
            />
            <input
              placeholder="API Token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              type="password"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-flexi-green py-4 font-bold text-white disabled:opacity-50"
            >
              TESTA CONNESSIONE
            </button>
            <button
              type="button"
              onClick={handleSkipWhatsApp}
              className="w-full text-sm text-flexi-gray underline"
            >
              Salta per ora (solo dev/simulato)
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleStep3} className="space-y-4">
            <p className="text-sm text-flexi-gray">
              Importa clienti (CSV: nome,telefono,data opzionale)
            </p>
            <textarea
              placeholder={"Mario Rossi,+393331234567,2025-01-15\nLuca Bianchi,+393334567890"}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              rows={6}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-flexi-purple py-4 font-bold text-white disabled:opacity-50"
            >
              IMPORTA E INIZIA
            </button>
            <button
              type="button"
              onClick={handleSkipImport}
              className="w-full text-sm text-flexi-gray underline"
            >
              Salta importazione
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
