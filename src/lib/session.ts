import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "flexi_session";
const SESSION_DAYS = 30;

function getSecret() {
  const secret =
    process.env.FLEXI_AUTH_SECRET || "flexi-dev-secret-change-in-prod";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  barberId: number;
  email: string;
  name: string;
  onboardingCompleted?: boolean;
}

export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      barberId: payload.barberId as number,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export function sessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
