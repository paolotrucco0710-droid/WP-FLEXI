import { NextResponse } from "next/server";
import { actionFaiGuadagnare } from "@/lib/actions";

export async function POST() {
  try {
    const result = await actionFaiGuadagnare();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore" },
      { status: 500 }
    );
  }
}
