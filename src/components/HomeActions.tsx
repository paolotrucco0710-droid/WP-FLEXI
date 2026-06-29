"use client";

import { useRouter } from "next/navigation";
import { ActionButton } from "./ActionButton";
import { useAction } from "@/hooks/useAction";

interface HomeActionsProps {
  customersToRecover: number;
  noShowAtRisk: number;
  emptySlots: number;
  unconfirmedToday: number;
  pendingRequests: number;
}

export function HomeActions({
  customersToRecover,
  noShowAtRisk,
  emptySlots,
  unconfirmedToday,
  pendingRequests,
}: HomeActionsProps) {
  const router = useRouter();
  const { loading, message, execute } = useAction();

  const handleFaiGuadagnare = async () => {
    await execute("/api/actions/fai-guadagnare");
    router.refresh();
  };

  const handleSendReminders = async () => {
    await execute("/api/actions/send-reminders");
    router.refresh();
  };

  return (
    <div className="space-y-4 px-4 pb-4">
      {message && (
        <div className="rounded-xl bg-white p-3 text-center text-sm font-medium shadow-sm">
          {message}
        </div>
      )}

      {/* Section 1: Soldi da prendere oggi */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-flexi-gray">
          💰 Soldi da prendere oggi
        </h2>
        <div className="mb-4 space-y-2">
          <StatRow
            color="green"
            label="Clienti da recuperare"
            count={customersToRecover}
            href="/recupero"
          />
          <StatRow
            color="purple"
            label="Slot vuoti"
            count={emptySlots}
            href="/slot"
          />
          <StatRow
            color="orange"
            label="No-show a rischio"
            count={noShowAtRisk}
            href="/no-show"
          />
        </div>
        <ActionButton
          variant="green"
          size="lg"
          fullWidth
          loading={loading}
          onClick={handleFaiGuadagnare}
        >
          🔥 FAI GUADAGNARE
        </ActionButton>
        <p className="mt-2 text-center text-xs text-flexi-gray">
          Invia automaticamente tutti i messaggi WhatsApp ottimizzati
        </p>
      </section>

      {/* Section 2: Oggi */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-flexi-gray">
          ⚠️ Oggi
        </h2>
        <div className="mb-4 flex gap-4">
          <div className="flex-1 rounded-xl bg-flexi-green-light p-3 text-center">
            <p className="text-2xl font-bold text-flexi-green">
              {unconfirmedToday === 0 ? "✓" : unconfirmedToday}
            </p>
            <p className="text-xs text-flexi-gray">Non confermati</p>
          </div>
          <div
            className="flex-1 cursor-pointer rounded-xl bg-flexi-orange-light p-3 text-center"
            onClick={() => router.push("/no-show")}
          >
            <p className="text-2xl font-bold text-flexi-orange">
              {noShowAtRisk}
            </p>
            <p className="text-xs text-flexi-gray">A rischio</p>
          </div>
        </div>
        <ActionButton
          variant="orange"
          fullWidth
          loading={loading}
          onClick={handleSendReminders}
        >
          INVIA PROMEMORIA
        </ActionButton>
      </section>

      {/* Section 3: Messaggi / Richieste */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-flexi-gray">
            📩 Richieste appuntamento
          </h2>
          {pendingRequests > 0 && (
            <span className="rounded-full bg-flexi-purple px-2 py-0.5 text-xs font-bold text-white">
              {pendingRequests}
            </span>
          )}
        </div>
        <ActionButton
          variant="purple"
          fullWidth
          onClick={() => router.push("/richieste")}
        >
          {pendingRequests > 0
            ? `GESTISCI ${pendingRequests} RICHIESTE`
            : "VEDI RICHIESTE"}
        </ActionButton>
      </section>
    </div>
  );
}

function StatRow({
  color,
  label,
  count,
  href,
}: {
  color: "green" | "orange" | "purple";
  label: string;
  count: number;
  href: string;
}) {
  const router = useRouter();
  const colors = {
    green: "text-flexi-green",
    orange: "text-flexi-orange",
    purple: "text-flexi-purple",
  };

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100"
    >
      <span className="text-sm">{label}</span>
      <span className={`text-lg font-bold ${colors[color]}`}>{count}</span>
    </button>
  );
}
