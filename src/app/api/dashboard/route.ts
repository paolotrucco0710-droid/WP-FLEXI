import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getDashboardStats } from "@/lib/rules";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  const stats = getDashboardStats(auth.barberId);
  return NextResponse.json(stats);
}
