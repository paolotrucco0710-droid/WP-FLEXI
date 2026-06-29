"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-xl font-bold">Qualcosa è andato storto</h2>
      <p className="text-sm text-gray-600">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-flexi-purple px-6 py-3 font-semibold text-white"
      >
        Riprova
      </button>
    </div>
  );
}
