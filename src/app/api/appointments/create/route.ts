import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { actionCreateAppointment } from "@/lib/actions";

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await actionCreateAppointment(auth.barberId, body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore" },
      { status: 500 }
    );
  }
}
