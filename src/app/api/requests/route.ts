import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getManagedRequests, getPendingRequests } from "@/lib/rules";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  const pending = getPendingRequests(auth.barberId);
  const managed = getManagedRequests(auth.barberId);
  return NextResponse.json({ pending, managed });
}
