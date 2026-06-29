import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "@/lib/session";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/webhook/whatsapp",
];

function getSecret() {
  return new TextEncoder().encode(
    process.env.FLEXI_AUTH_SECRET || "flexi-dev-secret-change-in-prod"
  );
}

async function getSession(
  request: NextRequest
): Promise<{ barberId: number; onboardingCompleted?: boolean } | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.barberId !== "number" || payload.barberId <= 0) return null;
    return {
      barberId: payload.barberId as number,
      onboardingCompleted: !!payload.onboardingCompleted,
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(svg|png|jpg|ico)$/)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/api/cron/run") {
    const secret = request.headers.get("x-cron-secret");
    const expected = process.env.CRON_SECRET || "flexi-cron-dev";
    if (secret === expected) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = await getSession(request);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Non autenticato", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    !session.onboardingCompleted &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api/onboarding") &&
    !pathname.startsWith("/api/auth/logout")
  ) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (session.onboardingCompleted && pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
