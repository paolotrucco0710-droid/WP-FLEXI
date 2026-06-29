# FLEXI V1

Sistema operativo per far guadagnare di più i barbieri — non un gestionale.

## Avvio rapido

```bash
npm install
npm run dev
```

Apri http://localhost:3000 → login con:

- **Email:** `demo@flexi.local`
- **Password:** `flexi123`

## Cosa fa (v1.1)

- Auth multi-barbiere (JWT cookie, dati isolati per `barber_id`)
- Import clienti da UI (`/recupero` → Aggiungi cliente)
- Slot vuoti calcolati dall'agenda reale (9:00–19:00)
- Cron giornaliero: recupero auto, promemoria 24h prima, sync slot
- Webhook WhatsApp inbound: risposta `SI`/`NO` → conferma/cancella appuntamento
- WhatsApp outbound: simulato di default, Meta Cloud API con env vars

## Variabili d'ambiente

```env
# Auth (obbligatorio in produzione)
FLEXI_AUTH_SECRET=your-random-secret
FLEXI_DEFAULT_PASSWORD=flexi123

# Database (obbligatorio su Vercel/serverless)
FLEXI_DB_PATH=/tmp/flexi.db

# Demo data (solo sviluppo)
FLEXI_SEED_DEMO=1

# Cron
CRON_SECRET=your-cron-secret
FLEXI_CRON_ENABLED=1

# WhatsApp Meta Cloud API (opzionale)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=your_token
WHATSAPP_PHONE_ID=your_phone_id
WHATSAPP_VERIFY_TOKEN=your_verify_token
```

## Cron manuale

```bash
curl -X POST http://localhost:3000/api/cron/run \
  -H "x-cron-secret: flexi-cron-dev"
```

## Webhook test (simulato)

```bash
curl -X POST http://localhost:3000/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"from":"+393331234567","body":"SI","barberId":1}'
```

## Limiti noti

- SQLite su Vercel richiede `FLEXI_DB_PATH=/tmp` (dati non persistenti tra deploy)
- Registrazione nuovi barbieri: solo via DB (no UI signup)
- WhatsApp reale richiede account Meta Business verificato + template approvati
- Cron `setInterval` funziona solo con server Node persistente (`FLEXI_CRON_ENABLED=1`)
