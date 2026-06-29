import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Header } from "@/components/Header";
import { HomeActions } from "@/components/HomeActions";
import { getServerSession } from "@/lib/auth";
import { getDashboardStats } from "@/lib/rules";

export default async function HomePage() {
  const session = await getServerSession();
  if (!session?.barberId) redirect("/login");

  const stats = await getDashboardStats(session.barberId);

  return (
    <AppShell>
      <Header />
      <div className="px-4 py-4">
        <h2 className="text-2xl font-bold">
          Ciao {session.name}! 👋
        </h2>
        <p className="mt-1 text-sm text-flexi-gray">
          Ecco cosa puoi fare oggi per guadagnare di più.
        </p>
      </div>

      <HomeActions
        customersToRecover={stats.customersToRecover}
        noShowAtRisk={stats.noShowAtRisk}
        emptySlots={stats.emptySlots}
        unconfirmedToday={stats.unconfirmedToday}
        pendingRequests={stats.pendingRequests}
      />

      <div className="space-y-3 px-4 pb-4">
        <QuickCard
          emoji="💚"
          title="Recupera clienti"
          subtitle={`${stats.customersToRecover} clienti da recuperare`}
          href="/recupero"
          color="green"
        />
        <QuickCard
          emoji="🟠"
          title="No-show a rischio oggi"
          subtitle={`${stats.noShowAtRisk} appuntamenti non confermati`}
          href="/no-show"
          color="orange"
        />
        <QuickCard
          emoji="🟣"
          title="Slot vuoti oggi"
          subtitle={`${stats.emptySlots} slot disponibili`}
          href="/slot"
          color="purple"
        />
      </div>
    </AppShell>
  );
}

function QuickCard({
  emoji,
  title,
  subtitle,
  href,
  color,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  href: string;
  color: "green" | "orange" | "purple";
}) {
  const borderColors = {
    green: "border-l-flexi-green",
    orange: "border-l-flexi-orange",
    purple: "border-l-flexi-purple",
  };

  return (
    <a
      href={href}
      className={`flex items-center gap-4 rounded-2xl border border-gray-100 border-l-4 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${borderColors[color]}`}
    >
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-flexi-gray">{subtitle}</p>
      </div>
      <span className="ml-auto text-flexi-gray">→</span>
    </a>
  );
}
