import { NextResponse } from "next/server";
import { getAllCustomers } from "@/lib/actions";

export async function GET() {
  const customers = getAllCustomers();
  return NextResponse.json(customers);
}
