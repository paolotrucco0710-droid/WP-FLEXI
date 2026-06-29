import { NextResponse } from "next/server";
import {
  loginBarber,
  createSessionToken,
  sessionCookieHeader,
} from "@/lib/auth";
import { isDbWritable } from "@/lib/db";

export async function POST(request: Request) {
  if (!isDbWritable()) {
    return NextResponse.json(
      {
        error:
          "Database non disponibile. Configura FLEXI_DB_PATH su storage persistente.",
        code: "DB_UNAVAILABLE",
      },
      { status: 503 }
    );
  }

  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e password richiesti" },
        { status: 400 }
      );
    }

    const session = await loginBarber(email, password);
    if (!session) {
      return NextResponse.json(
        { error: "Credenziali non valide" },
        { status: 401 }
      );
    }

    const token = await createSessionToken(session);
    const response = NextResponse.json({ ok: true, barber: session });
    response.headers.set("Set-Cookie", sessionCookieHeader(token));
    return response;
  } catch {
    return NextResponse.json({ error: "Errore login" }, { status: 500 });
  }
}
