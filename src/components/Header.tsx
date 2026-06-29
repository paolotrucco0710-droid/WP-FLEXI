import Link from "next/link";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
}

export function Header({ title = "FLEXI", showBack, backHref = "/" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <Link
              href={backHref}
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-flexi-gray hover:bg-gray-100"
            >
              ←
            </Link>
          )}
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-lg"
          aria-label="Notifiche"
        >
          🔔
        </button>
      </div>
    </header>
  );
}
