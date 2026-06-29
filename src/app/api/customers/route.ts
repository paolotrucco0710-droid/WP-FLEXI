import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getAllCustomers } from "@/lib/actions";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  const customers = getAllCustomers(auth.barberId);
  return NextResponse.json(customers);
}
