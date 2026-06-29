import { NextResponse } from "next/server";
import { getNoShowAtRisk, getTodayAppointments } from "@/lib/rules";

export async function GET() {
  const atRisk = getNoShowAtRisk();
  const today = getTodayAppointments();
  return NextResponse.json({ atRisk, today });
}
