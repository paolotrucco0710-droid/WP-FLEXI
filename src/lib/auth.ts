import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, isDbWritable } from "./db";
import { hashPassword, verifyPassword } from "./password";
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

export async function refreshSession(
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

export async function loginBarber(
  email: string,
  password: string
): Promise<SessionPayload | null> {
  if (!isDbWritable()) return null;

  const db = await getDb();
  const barber = await db.get<{
    id: number;
    email: string;
    name: string;
    password_hash: string;
    onboarding_completed: boolean | number;
  }>(
    "SELECT id, email, name, password_hash, onboarding_completed FROM barbers WHERE email = ?",
    [email.toLowerCase().trim()]
  );

  if (!barber || !verifyPassword(password, barber.password_hash)) {
    return null;
  }

  return {
    barberId: barber.id,
    email: barber.email,
    name: barber.name,
    onboardingCompleted: !!barber.onboarding_completed,
  };
}

export async function signupBarber(data: {
  email: string;
  password: string;
  name: string;
}): Promise<SessionPayload | null> {
  const db = await getDb();
  const email = data.email.toLowerCase().trim();

  const existing = await db.get<{ id: number }>(
    "SELECT id FROM barbers WHERE email = ?",
    [email]
  );
  if (existing) return null;

  await db.run(
    `INSERT INTO barbers (email, password_hash, name, onboarding_completed) VALUES (?, ?, ?, 0)`,
    [email, hashPassword(data.password), data.name.trim()]
  );

  const row = await db.get<{ id: number }>(
    "SELECT id FROM barbers WHERE email = ?",
    [email]
  );
  const barberId = row?.id;
  if (!barberId) return null;

  await db
    .run(`INSERT INTO monthly_stats (barber_id) VALUES (?) ON CONFLICT DO NOTHING`, [
      barberId,
    ])
    .catch(() =>
      db.run(`INSERT OR IGNORE INTO monthly_stats (barber_id) VALUES (?)`, [
        barberId,
      ])
    );

  return {
    barberId,
    email,
    name: data.name.trim(),
    onboardingCompleted: false,
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
        { success: false, error: "Non autenticato", code: "AUTH_REQUIRED" },
        { status: 401 }
      ),
    };
  }
  await refreshSession(session);
  return { barberId: session.barberId, session };
}

export { COOKIE_NAME, createSessionToken, sessionCookieHeader };
export type { SessionPayload };
