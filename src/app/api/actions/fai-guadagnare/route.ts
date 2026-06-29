import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { actionFaiGuadagnare } from "@/lib/actions";

export async function POST() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  try {
    const result = await actionFaiGuadagnare(auth.barberId);
    return NextResponse.json(result, {
      status: result.success ? 200 : 207,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore", success: false },
      { status: 500 }
    );
  }
}
