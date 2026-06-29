import { NextResponse } from "next/server";
import { getCustomerById, getCustomerAppointments } from "@/lib/rules";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const customer = getCustomerById(id);
  if (!customer) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }
  const appointments = getCustomerAppointments(id);
  return NextResponse.json({ customer, appointments });
}
