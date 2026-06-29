# FLEXI V1 — SaaS Ready

Sistema operativo per barbieri: recupero clienti, anti no-show, slot vuoti via WhatsApp.

## Avvio locale (SQLite dev)

```bash
npm install
npm run dev
```

- Login demo: `demo@flexi.local` / `flexi123` (solo dev con `FLEXI_SEED_DEMO=1`)
- Registrazione: http://localhost:3000/signup

## Deploy SaaS (PostgreSQL obbligatorio)

### 1. Variabili d'ambiente

```env
DATABASE_URL=postgresql://user:pass@host:5432/flexi
FLEXI_AUTH_SECRET=random-secret-min-32-chars
CRON_SECRET=random-cron-secret
NODE_ENV=production

# WhatsApp (per barbiere via onboarding, o globale)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_VERIFY_TOKEN=meta-webhook-verify-token

# Opzionale
DATABASE_SSL=true
```

### 2. Piattaforme supportate

| Platform | Note |
|----------|------|
| **Railway** | Consigliato — Postgres addon + volume opzionale |
| **Render** | Postgres managed + web service |
| **Vercel** | Richiede `DATABASE_URL` esterno (Neon/Supabase) — no SQLite |

### 3. Cron esterno (obbligatorio in produzione)

```bash
# Ogni giorno alle 8:00
curl -X POST https://tuodominio.com/api/cron/run \
  -H "x-cron-secret: $CRON_SECRET"
```

Servizi: [cron-job.org](https://cron-job.org), GitHub Actions, Railway cron.

### 4. Webhook WhatsApp Meta

URL: `https://tuodominio.com/api/webhook/whatsapp`  
Verify token: valore di `WHATSAPP_VERIFY_TOKEN`

### 5. Migrazione SQLite → Postgres

```bash
DATABASE_URL=postgresql://... npm run db:migrate ./flexi.db
```

### 6. Checklist pre-deploy

```bash
DATABASE_URL=... FLEXI_AUTH_SECRET=... CRON_SECRET=... npm run saas-check
```

## Architettura

```
src/lib/db/
  ├── index.ts          # Factory: DATABASE_URL → Postgres, else SQLite (dev)
  ├── postgres-adapter.ts
  ├── sqlite-adapter.ts
  └── migrations.ts

Auth: JWT httpOnly + middleware
Multi-tenant: barber_id su ogni query
Slot engine: calcolato da appointments (9–19), no tabella empty_slots
WhatsApp: retry 3x, stati queued/sent/failed/simulated
```

## Flusso nuovo barbiere

1. `/signup` → crea account
2. `/onboarding` → profilo → WhatsApp → import CSV clienti
3. Home → FAI GUADAGNARE

## Limiti noti

- Template WhatsApp Meta devono essere approvati per cold outreach
- Un barbiere = un account (no team/multi-staff)
- Billing/pagamenti non inclusi in questo scope
