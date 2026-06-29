"use client";

import { useEffect, useState } from "react";
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
  const { loading, execute } = useAction();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/customers/recover")
      .then((r) => r.json())
      .then(setCustomers);
  }, []);

  const handleSend = async (id: string) => {
    await execute(`/api/actions/recover/${id}`);
    router.refresh();
  };

  return (
    <AppShell>
      <Header title="Clienti da recuperare" showBack />
      <div className="px-4 py-3">
        <p className="text-sm text-flexi-gray">
          Clienti che non vengono da almeno 30 giorni
        </p>
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
