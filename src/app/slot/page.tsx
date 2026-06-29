"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Header } from "@/components/Header";
import { ActionButton } from "@/components/ActionButton";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";
import { useAction } from "@/hooks/useAction";
import { WHATSAPP_TEMPLATES } from "@/lib/constants";
import type { EmptySlot } from "@/lib/types";

export default function SlotPage() {
  const [slots, setSlots] = useState<EmptySlot[]>([]);
  const { loading, execute } = useAction();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/slots")
      .then((r) => r.json())
      .then(setSlots);
  }, []);

  const handlePublish = async (id: string) => {
    await execute(`/api/actions/publish-slot/${id}`);
    setSlots((prev) => prev.filter((s) => s.id !== id));
    router.refresh();
  };

  return (
    <AppShell>
      <Header title="Slot vuoti" showBack />
      <div className="px-4 py-3">
        <p className="text-sm text-flexi-gray">
          Slot liberi da riempire oggi
        </p>
      </div>

      <div className="space-y-3 px-4">
        {slots.length === 0 && (
          <p className="py-8 text-center text-flexi-gray">
            Nessuno slot vuoto disponibile
          </p>
        )}
        {slots.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border-2 border-dashed border-flexi-purple bg-flexi-purple-light/30 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-flexi-purple">
                  {s.start_time} – {s.end_time}
                </p>
                <p className="text-sm text-flexi-gray">
                  {s.duration_minutes} minuti
                </p>
              </div>
              <span className="text-2xl">+</span>
            </div>
            <ActionButton
              variant="purple"
              fullWidth
              loading={loading}
              onClick={() => handlePublish(s.id)}
            >
              PUBBLICA SLOT
            </ActionButton>
          </div>
        ))}
      </div>

      <div className="p-4">
        <WhatsAppPreview
          message={WHATSAPP_TEMPLATES.slot_vuoto("{{orario}}")}
        />
      </div>
    </AppShell>
  );
}
