import { NextResponse } from "next/server";
import { runAllBarbersCron } from "@/lib/cron";
import { isDbWritable } from "@/lib/db";

export async function POST() {
  if (!isDbWritable()) {
    return NextResponse.json(
      { error: "Database non scrivibile", code: "DB_UNAVAILABLE" },
      { status: 503 }
    );
  }

  try {
    const results = await runAllBarbersCron();
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore cron" },
      { status: 500 }
    );
  }
}
