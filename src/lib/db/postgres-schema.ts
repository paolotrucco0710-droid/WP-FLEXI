export const POSTGRES_SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS barbers (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  shop_name TEXT,
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  whatsapp_phone_id TEXT,
  whatsapp_api_token TEXT,
  whatsapp_verified BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  barber_id INTEGER NOT NULL REFERENCES barbers(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  last_cut_date DATE,
  total_cuts INTEGER DEFAULT 0,
  notes TEXT,
  avatar_url TEXT,
  recovery_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  barber_id INTEGER NOT NULL REFERENCES barbers(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 45,
  status TEXT DEFAULT 'non_confermato',
  notes TEXT,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointment_requests (
  id TEXT PRIMARY KEY,
  barber_id INTEGER NOT NULL REFERENCES barbers(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  requested_date DATE NOT NULL,
  requested_time TEXT NOT NULL,
  status TEXT DEFAULT 'da_gestire',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id TEXT PRIMARY KEY,
  barber_id INTEGER NOT NULL REFERENCES barbers(id),
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'simulated',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS published_slots (
  barber_id INTEGER NOT NULL REFERENCES barbers(id),
  slot_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (barber_id, slot_date, start_time)
);

CREATE TABLE IF NOT EXISTS monthly_stats (
  barber_id INTEGER PRIMARY KEY REFERENCES barbers(id),
  recovered_customers INTEGER DEFAULT 0,
  no_shows_avoided INTEGER DEFAULT 0,
  slots_filled INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cron_runs (
  id SERIAL PRIMARY KEY,
  barber_id INTEGER NOT NULL REFERENCES barbers(id),
  job_type TEXT NOT NULL,
  ran_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB
);

CREATE TABLE IF NOT EXISTS inbound_messages (
  id TEXT PRIMARY KEY,
  barber_id INTEGER NOT NULL REFERENCES barbers(id),
  customer_id TEXT,
  phone TEXT NOT NULL,
  body TEXT NOT NULL,
  action_taken TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_barber ON customers(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barber_id, date);
CREATE INDEX IF NOT EXISTS idx_whatsapp_barber ON whatsapp_messages(barber_id, created_at);
CREATE INDEX IF NOT EXISTS idx_requests_barber_status ON appointment_requests(barber_id, status);
`;
