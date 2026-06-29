import { NextResponse } from "next/server";
import { getCalendarDay } from "@/lib/rules";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const data = getCalendarDay(date);
  return NextResponse.json(data);
}
