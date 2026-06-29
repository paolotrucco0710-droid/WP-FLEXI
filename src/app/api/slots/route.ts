import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getEmptySlots } from "@/lib/rules";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  const slots = await getEmptySlots(auth.barberId);
  return NextResponse.json(slots);
}
