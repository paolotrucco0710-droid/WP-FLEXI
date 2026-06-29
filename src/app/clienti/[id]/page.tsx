"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Header } from "@/components/Header";
import { CustomerAvatar } from "@/components/CustomerAvatar";
import { ActionButton } from "@/components/ActionButton";
import { useAction } from "@/hooks/useAction";
import { formatDateItalian } from "@/lib/format";
import type { Customer, Appointment } from "@/lib/types";

export default function ClientePage() {
  const params = useParams();
  const id = params.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const { loading, execute } = useAction();

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCustomer(data.customer);
        setAppointments(data.appointments);
      });
  }, [id]);

  if (!customer) {
    return (
      <AppShell>
        <Header title="Cliente" showBack backHref="/recupero" />
        <p className="p-8 text-center text-flexi-gray">Caricamento...</p>
      </AppShell>
    );
  }

  const handleRecover = async () => {
    await execute(`/api/actions/recover/${id}`);
  };

  return (
    <AppShell>
      <Header title="Scheda cliente" showBack backHref="/recupero" />
      <div className="px-4 py-6 text-center">
        <div className="mb-3 flex justify-center">
          <CustomerAvatar
            name={customer.name}
            avatarUrl={customer.avatar_url}
            size="lg"
          />
        </div>
        <h2 className="text-xl font-bold">{customer.name}</h2>
        <div className="mt-3 flex justify-center gap-4">
          <a
            href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-lg"
          >
            💬
          </a>
          <a
            href={`tel:${customer.phone}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-lg"
          >
            📞
          </a>
        </div>
      </div>

      <div className="mx-4 mb-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <InfoRow label="Telefono" value={customer.phone} />
        <InfoRow
          label="Ultimo taglio"
          value={
            customer.last_cut_date
              ? formatDateItalian(customer.last_cut_date)
              : "Mai"
          }
        />
        <InfoRow label="Tagli totali" value={String(customer.total_cuts)} />
        {customer.notes && (
          <div>
            <p className="text-xs font-semibold text-flexi-gray">Note</p>
            <p className="text-sm">{customer.notes}</p>
          </div>
        )}
      </div>

      <div className="px-4 pb-3">
        <ActionButton
          variant="green"
          fullWidth
          loading={loading}
          onClick={handleRecover}
        >
          INVIA MESSAGGIO RECUPERO
        </ActionButton>
      </div>

      <div className="px-4 pb-4">
        <h3 className="mb-2 text-sm font-bold text-flexi-gray">Storico</h3>
        <div className="space-y-2">
          {appointments.slice(0, 10).map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm"
            >
              <span className="text-sm">
                {formatDateItalian(a.date)} – {a.time}
              </span>
              <span
                className={`text-xs font-bold ${
                  a.status === "confermato"
                    ? "text-flexi-green"
                    : "text-flexi-orange"
                }`}
              >
                {a.status === "confermato" ? "✓" : "?"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-flexi-gray">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
