interface WhatsAppPreviewProps {
  message: string;
  onEdit?: () => void;
}

export function WhatsAppPreview({ message, onEdit }: WhatsAppPreviewProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-flexi-gray">
        Anteprima messaggio WhatsApp
      </p>
      <div className="rounded-xl bg-[#dcf8c6] p-3 text-sm leading-relaxed text-gray-800">
        {message}
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-2 text-xs font-semibold text-flexi-purple underline"
        >
          MODIFICA MESSAGGIO
        </button>
      )}
    </div>
  );
}
