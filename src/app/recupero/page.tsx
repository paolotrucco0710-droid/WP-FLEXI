"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Header } from "@/components/Header";
import { CustomerAvatar } from "@/components/CustomerAvatar";
import { ActionButton } from "@/components/ActionButton";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";
import { useAction } from "@/hooks/useAction";
import { WHATSAPP_TEMPLATES } from "@/lib/constants";
import type { CustomerToRecover } from "@/lib/types";

export default function RecuperoPage() {
  const [customers, setCustomers] = useState<CustomerToRecover[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lastCut, setLastCut] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { loading, message, execute } = useAction();
  const router = useRouter();

  const loadCustomers = useCallback(() => {
    fetch("/api/customers/recover")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCustomers(data);
      });
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSend = async (id: string) => {
    await execute(`/api/actions/recover/${id}`);
    loadCustomers();
    router.refresh();
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/customers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          lastCutDate: lastCut || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore");
      setName("");
      setPhone("");
      setLastCut("");
      setShowAdd(false);
      loadCustomers();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Errore");
    } finally {
      setAdding(false);
    }
  };

  return (
    <AppShell>
      <Header title="Clienti da recuperare" showBack />
      <div className="px-4 py-3">
        <p className="text-sm text-flexi-gray">
          Clienti che non vengono da almeno 30 giorni
        </p>
      </div>

      {message && (
        <div className="mx-4 mb-3 rounded-xl bg-white p-3 text-center text-sm font-medium shadow-sm">
          {message}
        </div>
      )}

      <div className="px-4 pb-3">
        {!showAdd ? (
          <ActionButton
            variant="outline-green"
            fullWidth
            onClick={() => setShowAdd(true)}
          >
            + AGGIUNGI CLIENTE
          </ActionButton>
        ) : (
          <form
            onSubmit={handleAddCustomer}
            className="space-y-3 rounded-2xl bg-white p-4 shadow-sm"
          >
            <input
              placeholder="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              required
            />
            <input
              placeholder="Telefono (+39...)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              required
            />
            <input
              type="date"
              value={lastCut}
              onChange={(e) => setLastCut(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm"
            />
            {addError && (
              <p className="text-sm text-flexi-red">{addError}</p>
            )}
            <div className="flex gap-2">
              <ActionButton
                type="button"
                variant="outline-green"
                fullWidth
                onClick={() => setShowAdd(false)}
              >
                ANNULLA
              </ActionButton>
              <ActionButton
                type="submit"
                variant="green"
                fullWidth
                loading={adding}
              >
                SALVA
              </ActionButton>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-3 px-4">
        {customers.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
          >
            <Link href={`/clienti/${c.id}`}>
              <CustomerAvatar name={c.name} avatarUrl={c.avatar_url} />
            </Link>
            <Link href={`/clienti/${c.id}`} className="flex-1">
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-flexi-gray">
                Ultimo taglio {c.days_since_last_cut} giorni fa
              </p>
            </Link>
            <ActionButton
              variant="green"
              size="sm"
              loading={loading}
              onClick={() => handleSend(c.id)}
            >
              INVIA
            </ActionButton>
          </div>
        ))}
      </div>

      <div className="p-4">
        <WhatsAppPreview
          message={WHATSAPP_TEMPLATES.recupero("{{nome}}")}
        />
      </div>
    </AppShell>
  );
}
