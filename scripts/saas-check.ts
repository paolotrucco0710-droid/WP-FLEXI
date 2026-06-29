#!/usr/bin/env npx tsx
/**
 * Safety checklist SaaS — eseguire prima del deploy.
 */
import fs from "fs";
import path from "path";

const errors: string[] = [];
const warnings: string[] = [];

function check(name: string, ok: boolean, msg: string, warn = false) {
  if (!ok) (warn ? warnings : errors).push(`[${name}] ${msg}`);
  else console.log(`✓ ${name}`);
}

// Env checks
check(
  "DATABASE_URL",
  !!process.env.DATABASE_URL || process.env.NODE_ENV !== "production",
  "DATABASE_URL mancante in produzione"
);

check(
  "FLEXI_AUTH_SECRET",
  !!process.env.FLEXI_AUTH_SECRET || process.env.NODE_ENV !== "production",
  "FLEXI_AUTH_SECRET mancante in produzione"
);

check(
  "CRON_SECRET",
  !!process.env.CRON_SECRET || process.env.NODE_ENV !== "production",
  "CRON_SECRET mancante — cron disabilitato in prod",
  true
);

check(
  "FLEXI_SEED_DEMO",
  process.env.FLEXI_SEED_DEMO !== "1" || process.env.NODE_ENV !== "production",
  "FLEXI_SEED_DEMO attivo in produzione!",
  true
);

check(
  "ALLOW_SQLITE_PROD",
  !process.env.ALLOW_SQLITE_PROD || process.env.NODE_ENV !== "production",
  "SQLite in produzione — usa Postgres",
  true
);

// Code checks
const libDir = path.join(process.cwd(), "src/lib");
const srcFiles = walkDir(path.join(process.cwd(), "src"));

const hasInstrumentation = fs.existsSync(
  path.join(process.cwd(), "src/instrumentation.ts")
);
check("no_setinterval_cron", !hasInstrumentation, "instrumentation.ts con setInterval ancora presente");

const rulesContent = fs.readFileSync(path.join(libDir, "rules.ts"), "utf8");
check(
  "rules_barber_scoped",
  rulesContent.includes("barber_id = ?"),
  "rules.ts potrebbe non filtrare barber_id"
);

const slotsContent = fs.readFileSync(path.join(libDir, "slots.ts"), "utf8");
check(
  "no_empty_slots_table",
  !slotsContent.includes("empty_slots"),
  "slots.ts ancora usa empty_slots"
);

const whatsappContent = fs.readFileSync(path.join(libDir, "whatsapp.ts"), "utf8");
check(
  "whatsapp_safety",
  whatsappContent.includes("canSendWhatsApp"),
  "WhatsApp safety layer mancante"
);

const seedContent = fs.readFileSync(path.join(libDir, "seed.ts"), "utf8");
check(
  "no_prod_seed",
  seedContent.includes("production"),
  "seed.ts non protegge produzione"
);

// Scan for queries without barber_id in lib (heuristic)
for (const file of srcFiles.filter((f) => f.endsWith(".ts") && f.includes("/lib/"))) {
  const content = fs.readFileSync(file, "utf8");
  if (
    content.includes("SELECT") &&
    content.includes("customers") &&
    !content.includes("barber_id") &&
    !file.includes("postgres-schema")
  ) {
    warnings.push(`[query] ${file} potrebbe avere query senza barber_id`);
  }
}

console.log("\n--- RISULTATO ---");
if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  warnings.forEach((w) => console.log("  ⚠", w));
}
if (errors.length) {
  console.log(`\nErrori (${errors.length}):`);
  errors.forEach((e) => console.log("  ✗", e));
  process.exit(1);
}
console.log("\n✅ Checklist SaaS superata.");

function walkDir(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkDir(p));
    else out.push(p);
  }
  return out;
}
