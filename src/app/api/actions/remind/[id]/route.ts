import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { actionSendReminder } from "@/lib/actions";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const result = await actionSendReminder(auth.barberId, id);
    return NextResponse.json(result, {
      status: result.success ? 200 : 502,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore", success: false },
      { status: 500 }
    );
  }
}
