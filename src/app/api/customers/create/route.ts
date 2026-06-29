import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { actionCreateCustomer } from "@/lib/actions";
import { validatePhone, normalizePhone } from "@/lib/phone";

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { name, phone, lastCutDate } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Nome obbligatorio" },
        { status: 400 }
      );
    }

    if (!phone?.trim() || !validatePhone(phone)) {
      return NextResponse.json(
        { error: "Telefono non valido (min 8 cifre)" },
        { status: 400 }
      );
    }

    const result = await actionCreateCustomer(auth.barberId, {
      name: name.trim(),
      phone: normalizePhone(phone),
      lastCutDate: lastCutDate || null,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore" },
      { status: 500 }
    );
  }
}
