import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  return NextResponse.json({ barber: session });
}
