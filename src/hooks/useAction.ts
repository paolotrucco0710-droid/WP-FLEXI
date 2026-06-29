"use client";

import { useState, useCallback } from "react";

export function useAction() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const execute = useCallback(async (url: string, method = "POST") => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(url, { method });
      const data = await res.json();

      if (res.status === 401) {
        window.location.href = "/login";
        throw new Error("Sessione scaduta");
      }

      if (!res.ok && res.status !== 207 && res.status !== 502) {
        throw new Error(data.error || "Errore");
      }

      if (data.status === "failed" || data.success === false) {
        throw new Error(
          data.error || "Invio WhatsApp fallito. Verifica configurazione API."
        );
      }

      if (data.failed && data.failed > 0) {
        const ok = (data.sent || 0) + (data.simulated || 0);
        setMessage(
          `⚠️ ${data.failed} falliti, ${ok} inviati`
        );
        return data;
      }

      if (data.status === "simulated" || (data.simulated && data.simulated > 0 && !data.sent)) {
        setMessage("✅ Salvato (WhatsApp simulato — configura API per invio reale)");
      } else {
        setMessage("✅ Inviato!");
      }

      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore";
      setMessage(`❌ ${msg}`);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearMessage = useCallback(() => setMessage(null), []);

  return { loading, message, execute, clearMessage };
}
