export type AppointmentStatus =
  | "confermato"
  | "non_confermato"
  | "rischio_no_show"
  | "completato"
  | "cancellato";

export type RequestStatus = "da_gestire" | "accettata" | "rifiutata";

export type MessageType =
  | "recupero"
  | "promemoria"
  | "slot_vuoto"
  | "richiesta_accettata"
  | "richiesta_rifiutata";

export interface Barber {
  id: number;
  email: string;
  name: string;
  whatsapp_enabled: number;
  created_at: string;
}

export interface Customer {
  id: string;
  barber_id: number;
  name: string;
  phone: string;
  last_cut_date: string | null;
  total_cuts: number;
  notes: string | null;
  avatar_url: string | null;
  recovery_sent_at: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  barber_id: number;
  customer_id: string;
  customer_name: string;
  date: string;
  time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  reminder_sent_at: string | null;
  created_at: string;
}

export interface EmptySlot {
  id: string;
  barber_id: number;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  published: number;
  created_at: string;
}

export interface AppointmentRequest {
  id: string;
  barber_id: number;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  requested_date: string;
  requested_time: string;
  status: RequestStatus;
  created_at: string;
}

export interface WhatsAppMessage {
  id: string;
  barber_id: number;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  message_type: MessageType;
  content: string;
  status: "sent" | "simulated" | "failed";
  created_at: string;
}

export interface DashboardStats {
  customersToRecover: number;
  noShowAtRisk: number;
  emptySlots: number;
  confirmedToday: number;
  unconfirmedToday: number;
  pendingRequests: number;
  recoveredThisMonth: number;
  noShowsAvoidedThisMonth: number;
  slotsFilledThisMonth: number;
  totalEarnedThisMonth: number;
}

export interface CustomerToRecover extends Customer {
  days_since_last_cut: number;
}

export interface ActionResult {
  success: boolean;
  failed: number;
  sent: number;
  simulated: number;
  results: SendMessageResult[];
}

export interface SendMessageResult {
  success: boolean;
  messageId: string;
  phone: string;
  content: string;
  status: "sent" | "simulated" | "failed";
  mode: "simulated" | "live";
}
