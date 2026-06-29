export async function register() {
  if (process.env.FLEXI_CRON_ENABLED !== "1") return;
  if (typeof setInterval === "undefined") return;

  const intervalMs =
    Number(process.env.FLEXI_CRON_INTERVAL_MS) || 24 * 60 * 60 * 1000;

  setInterval(async () => {
    try {
      const port = process.env.PORT || "3000";
      const secret = process.env.CRON_SECRET || "flexi-cron-dev";
      await fetch(`http://localhost:${port}/api/cron/run`, {
        method: "POST",
        headers: { "x-cron-secret": secret },
      });
    } catch {
      // server may not be ready yet
    }
  }, intervalMs);
}
