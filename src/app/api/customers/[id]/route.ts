import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getCustomerById, getCustomerAppointments } from "@/lib/rules";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const customer = await getCustomerById(auth.barberId, id);
  if (!customer) {
    return NextResponse.json({ success: false, error: "Non trovato", code: "NOT_FOUND" }, { status: 404 });
  }
  const appointments = await getCustomerAppointments(auth.barberId, id);
  return NextResponse.json({ customer, appointments });
}
