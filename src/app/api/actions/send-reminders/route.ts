import { NextResponse } from "next/server";
import { actionSendReminders } from "@/lib/actions";

export async function POST() {
  try {
    const result = await actionSendReminders();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore" },
      { status: 500 }
    );
  }
}
