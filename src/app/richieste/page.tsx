"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Header } from "@/components/Header";
import { CustomerAvatar } from "@/components/CustomerAvatar";
import { ActionButton } from "@/components/ActionButton";
import { useAction } from "@/hooks/useAction";
import { formatRequestDate } from "@/lib/format";
import type { AppointmentRequest } from "@/lib/types";

export default function RichiestePage() {
  const [tab, setTab] = useState<"pending" | "managed">("pending");
  const [pending, setPending] = useState<AppointmentRequest[]>([]);
  const [managed, setManaged] = useState<AppointmentRequest[]>([]);
  const { loading, execute } = useAction();
  const router = useRouter();

  const load = () => {
    fetch("/api/requests")
      .then((r) => r.json())
      .then((data) => {
        setPending(data.pending);
        setManaged(data.managed);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const handleAccept = async (id: string) => {
    await execute(`/api/requests/${id}/accept`);
    load();
    router.refresh();
  };

  const handleReject = async (id: string) => {
    await execute(`/api/requests/${id}/reject`);
    load();
    router.refresh();
  };

  const list = tab === "pending" ? pending : managed;

  return (
    <AppShell>
      <Header title="Richieste appuntamento" showBack />
      <div className="flex gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
            tab === "pending"
              ? "bg-flexi-purple text-white"
              : "bg-gray-100 text-flexi-gray"
          }`}
        >
          Da gestire ({pending.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("managed")}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
            tab === "managed"
              ? "bg-flexi-purple text-white"
              : "bg-gray-100 text-flexi-gray"
          }`}
        >
          Gestite
        </button>
      </div>

      <div className="space-y-3 px-4">
        {list.length === 0 && (
          <p className="py-8 text-center text-flexi-gray">
            {tab === "pending"
              ? "Nessuna richiesta in attesa"
              : "Nessuna richiesta gestita"}
          </p>
        )}
        {list.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-3">
              <CustomerAvatar name={r.customer_name} />
              <div>
                <p className="font-semibold">{r.customer_name}</p>
                <p className="text-sm text-flexi-gray">
                  Richiesta per {formatRequestDate(r.requested_date)} –{" "}
                  {r.requested_time}
                </p>
              </div>
            </div>
            {tab === "pending" ? (
              <div className="flex gap-2">
                <ActionButton
                  variant="outline-red"
                  fullWidth
                  size="sm"
                  loading={loading}
                  onClick={() => handleReject(r.id)}
                >
                  RIFIUTA
                </ActionButton>
                <ActionButton
                  variant="outline-green"
                  fullWidth
                  size="sm"
                  loading={loading}
                  onClick={() => handleAccept(r.id)}
                >
                  ACCETTA
                </ActionButton>
              </div>
            ) : (
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                  r.status === "accettata"
                    ? "bg-green-100 text-flexi-green"
                    : "bg-red-100 text-flexi-red"
                }`}
              >
                {r.status === "accettata" ? "ACCETTATA" : "RIFIUTATA"}
              </span>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
