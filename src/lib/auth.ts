import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, isDbWritable } from "./db";
import {
  COOKIE_NAME,
  createSessionToken,
  sessionCookieHeader,
  verifySessionToken,
  type SessionPayload,
} from "./session";

const SESSION_DAYS = 30;

export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(
  payload: SessionPayload
): Promise<string> {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export async function loginBarber(
  email: string,
  password: string
): Promise<SessionPayload | null> {
  if (!isDbWritable()) return null;

  const db = getDb();
  const barber = db
    .prepare("SELECT id, email, name, password_hash FROM barbers WHERE email = ?")
    .get(email.toLowerCase().trim()) as
    | { id: number; email: string; name: string; password_hash: string }
    | undefined;

  if (!barber || !verifyPassword(password, barber.password_hash)) {
    return null;
  }

  return {
    barberId: barber.id,
    email: barber.email,
    name: barber.name,
  };
}

export async function requireApiAuth(): Promise<
  | { barberId: number; session: SessionPayload; error?: never }
  | { error: NextResponse; barberId?: never; session?: never }
> {
  const session = await getServerSession();
  if (!session?.barberId) {
    return {
      error: NextResponse.json(
        { error: "Non autenticato", code: "AUTH_REQUIRED" },
        { status: 401 }
      ),
    };
  }
  return { barberId: session.barberId, session };
}

export { COOKIE_NAME, createSessionToken, sessionCookieHeader };
export type { SessionPayload };
