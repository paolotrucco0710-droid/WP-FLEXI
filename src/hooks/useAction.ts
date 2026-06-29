"use client";

import { useState, useCallback } from "react";

export function useAction() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const execute = useCallback(
    async (url: string, method = "POST") => {
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(url, { method });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Errore");
        setMessage("✅ Fatto!");
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Errore";
        setMessage(`❌ ${msg}`);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearMessage = useCallback(() => setMessage(null), []);

  return { loading, message, execute, clearMessage };
}
