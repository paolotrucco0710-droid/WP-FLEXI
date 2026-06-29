import { NextResponse } from "next/server";
import {
  createSessionToken,
  loginBarber,
  sessionCookieHeader,
  signupBarber,
} from "@/lib/auth";
import { isDbWritable } from "@/lib/db";
import { apiError } from "@/lib/api-response";

export async function POST(request: Request) {
  if (!isDbWritable()) {
    return apiError(
      "Database non disponibile. Configura DATABASE_URL.",
      "DB_UNAVAILABLE",
      503
    );
  }

  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return apiError("Email, password e nome richiesti", "VALIDATION_ERROR");
    }
    if (password.length < 6) {
      return apiError("Password minimo 6 caratteri", "VALIDATION_ERROR");
    }

    const session = await signupBarber({ email, password, name });
    if (!session) {
      return apiError("Email già registrata", "EMAIL_EXISTS", 409);
    }

    const token = await createSessionToken(session);
    const response = NextResponse.json({ ok: true, barber: session });
    response.headers.set("Set-Cookie", sessionCookieHeader(token));
    return response;
  } catch {
    return apiError("Errore registrazione", "SIGNUP_ERROR", 500);
  }
}
