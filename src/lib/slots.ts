import { format, addDays } from "date-fns";
import { getDb } from "./db";
import type { Appointment, EmptySlot } from "./types";

const WORK_START = 9 * 60;
const WORK_END = 19 * 60;
const DEFAULT_SLOT_MINUTES = 45;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function slotToId(date: string, startTime: string): string {
  return `${date}_${startTime}`;
}

export function parseSlotId(id: string): { date: string; startTime: string } {
  const [date, startTime] = id.split("_");
  return { date, startTime };
}

function getOccupiedRanges(appointments: Appointment[]) {
  return appointments
    .filter((a) => a.status !== "cancellato")
    .map((a) => {
      const start = timeToMinutes(a.time);
      return { start, end: start + (a.duration_minutes || DEFAULT_SLOT_MINUTES) };
    })
    .sort((a, b) => a.start - b.start);
}

export function computeEmptySlotsForDay(
  barberId: number,
  date: string,
  appointments: Appointment[],
  publishedKeys: Set<string>,
  slotMinutes: number = DEFAULT_SLOT_MINUTES
): EmptySlot[] {
  const occupied = getOccupiedRanges(appointments);
  const slots: EmptySlot[] = [];
  let cursor = WORK_START;

  while (cursor + slotMinutes <= WORK_END) {
    const gapEnd = cursor + slotMinutes;
    const overlaps = occupied.some((o) => cursor < o.end && gapEnd > o.start);

    if (!overlaps) {
      const start_time = minutesToTime(cursor);
      const end_time = minutesToTime(gapEnd);
      const key = slotToId(date, start_time);
      if (!publishedKeys.has(key)) {
        slots.push({
          id: key,
          barber_id: barberId,
          date,
          start_time,
          end_time,
          duration_minutes: slotMinutes,
          published: 0,
          created_at: new Date().toISOString(),
        });
      }
    }
    cursor += slotMinutes;
  }

  return slots;
}

export async function getPublishedSlotKeys(
  barberId: number,
  fromDate: string
): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.all<{ slot_date: string; start_time: string }>(
    `SELECT slot_date, start_time FROM published_slots 
     WHERE barber_id = ? AND slot_date >= ?`,
    [barberId, fromDate]
  );
  return new Set(rows.map((r) => slotToId(String(r.slot_date).slice(0, 10), r.start_time)));
}

export async function computeSlotsForDates(
  barberId: number,
  dates: string[]
): Promise<EmptySlot[]> {
  const db = await getDb();
  const published = await getPublishedSlotKeys(barberId, dates[0] ?? format(new Date(), "yyyy-MM-dd"));
  const all: EmptySlot[] = [];

  for (const date of dates) {
    const appointments = await db.all<Appointment>(
      `SELECT * FROM appointments WHERE barber_id = ? AND date = ?`,
      [barberId, date]
    );
    all.push(...computeEmptySlotsForDay(barberId, date, appointments, published));
  }

  return all;
}

export async function computeSlotsNextDays(
  barberId: number,
  days = 7
): Promise<EmptySlot[]> {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    dates.push(format(addDays(today, i), "yyyy-MM-dd"));
  }
  return computeSlotsForDates(barberId, dates);
}

export async function markSlotPublished(
  barberId: number,
  date: string,
  startTime: string
): Promise<void> {
  const db = await getDb();
  await db
    .run(
      `INSERT INTO published_slots (barber_id, slot_date, start_time) VALUES (?, ?, ?)
       ON CONFLICT DO NOTHING`,
      [barberId, date, startTime]
    )
    .catch(() =>
      db.run(
        `INSERT OR IGNORE INTO published_slots (barber_id, slot_date, start_time) VALUES (?, ?, ?)`,
        [barberId, date, startTime]
      )
    );
}