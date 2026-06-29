# FLEXI V1

Sistema operativo per far guadagnare di più i barbieri — non un gestionale.

Flexi automatizza via WhatsApp:
- **Recupero clienti** (30+ giorni senza visita)
- **Anti no-show** (promemoria appuntamenti non confermati)
- **Riempimento slot vuoti** (broadcast ai clienti attivi)

## Avvio rapido

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

## Stack

- **Next.js 16** (App Router)
- **SQLite** (zero costo, file locale `flexi.db`)
- **Tailwind CSS** (mobile-first)
- **WhatsApp** simulato di default, API reale opzionale

## WhatsApp reale (opzionale)

Imposta queste variabili d'ambiente per Meta WhatsApp Business API:

```env
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=your_token
WHATSAPP_PHONE_ID=your_phone_id
```

Senza queste variabili, i messaggi vengono simulati e salvati nel database.

## Flusso giornaliero

1. Apri l'app
2. Vedi clienti da recuperare, no-show a rischio, slot vuoti
3. Premi **FAI GUADAGNARE**
4. Flexi invia tutti i messaggi WhatsApp automaticamente

## Struttura

```
src/
├── app/           # Pagine e API routes
├── components/    # UI components
├── lib/
│   ├── db.ts      # Database SQLite
│   ├── rules.ts   # Motore regole
│   ├── whatsapp.ts # Layer WhatsApp
│   └── actions.ts # Azioni business
```
