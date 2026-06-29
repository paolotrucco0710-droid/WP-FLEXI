import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Header } from "@/components/Header";
import { EARNINGS } from "@/lib/constants";
import { getServerSession } from "@/lib/auth";
import { getDashboardStats } from "@/lib/rules";

export default async function RisultatiPage() {
  const session = await getServerSession();
  if (!session?.barberId) redirect("/login");

  const stats = getDashboardStats(session.barberId);

  const items = [
    {
      label: "Clienti recuperati",
      count: stats.recoveredThisMonth,
      earnings: stats.recoveredThisMonth * EARNINGS.recovery,
      color: "text-flexi-green",
      bg: "bg-flexi-green-light",
    },
    {
      label: "No-show evitati",
      count: stats.noShowsAvoidedThisMonth,
      earnings: stats.noShowsAvoidedThisMonth * EARNINGS.noShowAvoided,
      color: "text-flexi-orange",
      bg: "bg-flexi-orange-light",
    },
    {
      label: "Slot riempiti",
      count: stats.slotsFilledThisMonth,
      earnings: stats.slotsFilledThisMonth * EARNINGS.slotFilled,
      color: "text-flexi-purple",
      bg: "bg-flexi-purple-light",
    },
  ];

  return (
    <AppShell>
      <Header title="Risultati" />
      <div className="px-4 py-4">
        <h2 className="text-lg font-bold">Questo mese</h2>
        <p className="text-sm text-flexi-gray">
          Quanto Flexi ti ha fatto guadagnare
        </p>
      </div>

      <div className="space-y-3 px-4">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between rounded-2xl p-4 ${item.bg}`}
          >
            <div>
              <p className="font-semibold">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>
                {item.count}
              </p>
            </div>
            <p className={`text-xl font-bold ${item.color}`}>
              +{item.earnings}€
            </p>
          </div>
        ))}
      </div>

      <div className="m-4 rounded-2xl bg-flexi-green p-6 text-center text-white">
        <p className="text-sm opacity-90">Totale guadagnato con Flexi</p>
        <p className="text-4xl font-bold">
          +{stats.totalEarnedThisMonth}€
        </p>
      </div>

      <div className="mx-4 mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase text-flexi-gray">
          Flusso automatico
        </p>
        <div className="space-y-2 text-sm">
          <FlowStep step="1" text="Cliente assente 30+ giorni" />
          <FlowArrow />
          <FlowStep step="2" text="Flexi invia messaggio WhatsApp" />
          <FlowArrow />
          <FlowStep step="3" text="Cliente risponde SI" />
          <FlowArrow />
          <FlowStep step="4" text="Appuntamento prenotato" />
          <FlowArrow />
          <FlowStep step="5" text="💰 Soldi recuperati" highlight />
        </div>
      </div>
    </AppShell>
  );
}

function FlowStep({
  step,
  text,
  highlight,
}: {
  step: string;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
        highlight ? "bg-flexi-green-light font-semibold" : "bg-gray-50"
      }`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-flexi-purple text-xs font-bold text-white">
        {step}
      </span>
      <span>{text}</span>
    </div>
  );
}

function FlowArrow() {
  return <div className="pl-5 text-flexi-gray">↓</div>;
}
