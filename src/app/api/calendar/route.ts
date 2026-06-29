import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getCalendarDay } from "@/lib/rules";
import { syncEmptySlotsForBarber } from "@/lib/slots";

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const date =
    searchParams.get("date") || new Date().toISOString().split("T")[0];

  syncEmptySlotsForBarber(auth.barberId, [date]);
  const data = getCalendarDay(auth.barberId, date);
  return NextResponse.json(data);
}
