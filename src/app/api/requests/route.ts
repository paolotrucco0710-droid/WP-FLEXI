import { NextResponse } from "next/server";
import { getManagedRequests, getPendingRequests } from "@/lib/rules";

export async function GET() {
  const pending = getPendingRequests();
  const managed = getManagedRequests();
  return NextResponse.json({ pending, managed });
}
