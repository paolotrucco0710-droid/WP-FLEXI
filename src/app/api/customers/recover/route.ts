import { NextResponse } from "next/server";
import { getCustomersToRecover } from "@/lib/rules";

export async function GET() {
  const customers = getCustomersToRecover();
  return NextResponse.json(customers);
}
