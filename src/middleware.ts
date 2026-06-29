import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "@/lib/session";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/webhook/whatsapp",
];

function getSecret() {
  return new TextEncoder().encode(
    process.env.FLEXI_AUTH_SECRET || "flexi-dev-secret-change-in-prod"
  );
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.barberId === "number" && payload.barberId > 0;
  } catch {
    return false;
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

  const authed = await isAuthenticated(request);
  if (!authed) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
