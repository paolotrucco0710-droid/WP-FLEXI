import { BottomNav } from "@/components/BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <div className="mx-auto max-w-lg">{children}</div>
      <BottomNav />
    </div>
  );
}
