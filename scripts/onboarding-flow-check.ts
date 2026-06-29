/**
 * Verifica manuale: signup → onboarding → home senza re-login.
 * Richiede dev server su BASE_URL (default http://localhost:3000).
 *
 * Uso: npm run onboarding-check
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

type StepResult = { ok: boolean; detail: string };

async function request(
  path: string,
  init: RequestInit & { cookieJar?: Map<string, string> } = {}
): Promise<{ status: number; body: unknown; headers: Headers }> {
  const { cookieJar, ...fetchInit } = init;
  const headers = new Headers(fetchInit.headers);
  if (cookieJar && cookieJar.size > 0) {
    headers.set(
      "Cookie",
      [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
    );
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...fetchInit, headers });
  const setCookie = res.headers.get("set-cookie");
  if (cookieJar && setCookie) {
    const match = setCookie.match(/flexi_session=([^;]+)/);
    if (match) cookieJar.set("flexi_session", match[1]);
  }

  let body: unknown;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: res.status, body, headers: res.headers };
}

function assert(condition: boolean, detail: string): StepResult {
  return { ok: condition, detail };
}

async function main() {
  const cookieJar = new Map<string, string>();
  const email = `onboarding.check.${Date.now()}@test.it`;
  const password = "check12345";
  const results: StepResult[] = [];

  console.log(`\n🔍 Onboarding flow check → ${BASE_URL}\n`);

  const signup = await request("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: "Check Barber" }),
    cookieJar,
  });
  results.push(
    assert(signup.status === 200, `signup status ${signup.status}`)
  );

  const step1 = await request("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step: 1, name: "Check Barber", shopName: "Shop" }),
    cookieJar,
  });
  results.push(assert(step1.status === 200, `onboarding step 1 → ${step1.status}`));

  const step3 = await request("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step: 3, csv: "" }),
    cookieJar,
  });
  const step3Body = step3.body as { completed?: boolean };
  results.push(
    assert(step3.status === 200 && step3Body.completed === true, "onboarding step 3 completed")
  );

  const homeAfterOnboarding = await request("/", { cookieJar, redirect: "manual" });
  results.push(
    assert(
      homeAfterOnboarding.status === 200,
      `GET / dopo onboarding (no re-login): status ${homeAfterOnboarding.status}, atteso 200`
    )
  );

  const onboardingBlocked = await request("/onboarding", { cookieJar, redirect: "manual" });
  results.push(
    assert(
      onboardingBlocked.status === 307 &&
        String(onboardingBlocked.headers.get("location") ?? "").endsWith("/"),
      `GET /onboarding con onboarding fatto → redirect home (${onboardingBlocked.status})`
    )
  );

  await request("/api/auth/logout", { method: "POST", cookieJar });
  cookieJar.delete("flexi_session");

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cookieJar,
  });
  const loginBody = login.body as { barber?: { onboardingCompleted?: boolean } };
  results.push(
    assert(
      login.status === 200 && loginBody.barber?.onboardingCompleted === true,
      "login rilegge onboarding_completed dal DB"
    )
  );

  const homeAfterLogin = await request("/", { cookieJar, redirect: "manual" });
  results.push(
    assert(homeAfterLogin.status === 200, `GET / dopo login: status ${homeAfterLogin.status}`)
  );

  let failed = 0;
  for (const r of results) {
    const icon = r.ok ? "✅" : "❌";
    console.log(`${icon} ${r.detail}`);
    if (!r.ok) failed++;
  }

  if (failed > 0) {
    console.error(`\n${failed} check falliti.\n`);
    process.exit(1);
  }
  console.log("\nTutti i check superati.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
