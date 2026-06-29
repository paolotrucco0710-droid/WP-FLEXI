import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getEmptySlots } from "@/lib/rules";
import { syncEmptySlotsNextDays } from "@/lib/slots";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  syncEmptySlotsNextDays(auth.barberId, 7);
  const slots = getEmptySlots(auth.barberId);
  return NextResponse.json(slots);
}
