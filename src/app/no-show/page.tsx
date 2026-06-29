"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Header } from "@/components/Header";
import { ActionButton } from "@/components/ActionButton";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";
import { useAction } from "@/hooks/useAction";
import { WHATSAPP_TEMPLATES } from "@/lib/constants";
import type { Appointment } from "@/lib/types";

export default function NoShowPage() {
  const [atRisk, setAtRisk] = useState<Appointment[]>([]);
  const { loading, execute } = useAction();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/appointments")
      .then((r) => r.json())
      .then((data) => setAtRisk(data.atRisk));
  }, []);

  const handleRemind = async (id: string) => {
    await execute(`/api/actions/remind/${id}`);
    router.refresh();
  };

  const handleRemindAll = async () => {
    await execute("/api/actions/send-reminders");
    router.refresh();
  };

  return (
    <AppShell>
      <Header title="No-show a rischio" showBack />
      <div className="px-4 py-3">
        <p className="text-sm text-flexi-gray">
          Appuntamenti di oggi non ancora confermati
        </p>
      </div>

      <div className="space-y-3 px-4">
        {atRisk.length === 0 && (
          <p className="py-8 text-center text-flexi-gray">
            Nessun appuntamento a rischio 🎉
          </p>
        )}
        {atRisk.map((a) => (
          <div
            key={a.id}
            className="rounded-2xl bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-semibold">{a.customer_name}</p>
                <p className="text-sm text-flexi-gray">
                  Oggi alle {a.time}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  a.status === "rischio_no_show"
                    ? "bg-red-100 text-flexi-red"
                    : "bg-orange-100 text-flexi-orange"
                }`}
              >
                {a.status === "rischio_no_show"
                  ? "RISCHIO ALTO"
                  : "NON CONFERMATO"}
              </span>
            </div>
            <ActionButton
              variant="orange"
              fullWidth
              size="sm"
              loading={loading}
              onClick={() => handleRemind(a.id)}
            >
              INVIA PROMEMORIA
            </ActionButton>
          </div>
        ))}
      </div>

      {atRisk.length > 0 && (
        <div className="p-4">
          <ActionButton
            variant="orange"
            fullWidth
            size="lg"
            loading={loading}
            onClick={handleRemindAll}
          >
            INVIA TUTTI I PROMEMORIA
          </ActionButton>
        </div>
      )}

      <div className="p-4">
        <WhatsAppPreview
          message={WHATSAPP_TEMPLATES.promemoria("{{orario}}")}
        />
      </div>
    </AppShell>
  );
}
