import { NextResponse } from "next/server";
import { getEmptySlots } from "@/lib/rules";

export async function GET() {
  const slots = getEmptySlots();
  return NextResponse.json(slots);
}
