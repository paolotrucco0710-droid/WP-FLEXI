import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getNoShowAtRisk, getTodayAppointments } from "@/lib/rules";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  const atRisk = await getNoShowAtRisk(auth.barberId);
  const today = await getTodayAppointments(auth.barberId);
  return NextResponse.json({ atRisk, today });
}
