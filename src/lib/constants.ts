export const BARBER_NAME = "Marco";

export const RECOVERY_DAYS_THRESHOLD = 30;

export const WHATSAPP_TEMPLATES = {
  recupero: (nome: string) =>
    `Ciao ${nome}! 👋 È un po' che non passi in negozio. Questa settimana ho 2 slot liberi, se vuoi ti tengo un posto 👍`,
  promemoria: (orario: string) =>
    `Ciao! 📅 Confermi il tuo appuntamento di oggi alle ${orario}? Rispondi SI`,
  slot_vuoto: (orario: string) =>
    `Ciao! Oggi si è liberato uno slot alle ${orario}. Se vuoi un taglio veloce, rispondi a questo messaggio!`,
  richiesta_accettata: (nome: string, data: string, orario: string) =>
    `Ciao ${nome}! ✅ Il tuo appuntamento per ${data} alle ${orario} è confermato. A presto!`,
  richiesta_rifiutata: (nome: string) =>
    `Ciao ${nome}, purtroppo non riesco ad accettare la tua richiesta. Ti scrivo appena si libera uno slot!`,
} as const;

export const EARNINGS = {
  recovery: 40,
  noShowAvoided: 40,
  slotFilled: 45,
} as const;
