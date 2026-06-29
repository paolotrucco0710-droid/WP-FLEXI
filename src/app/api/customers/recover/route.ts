import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getCustomersToRecover } from "@/lib/rules";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  const customers = getCustomersToRecover(auth.barberId);
  return NextResponse.json(customers);
}
