import { NextResponse } from "next/server";
import { actionCreateAppointment } from "@/lib/actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await actionCreateAppointment(body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore" },
      { status: 500 }
    );
  }
}
