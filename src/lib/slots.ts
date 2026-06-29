import { v4 as uuid } from "uuid";
import { addMinutes, format, parse } from "date-fns";
import { getDb } from "./db";
import type { Appointment, EmptySlot } from "./types";

const WORK_START = "09:00";
const WORK_END = "19:00";
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

function getOccupiedRanges(
  appointments: Appointment[]
): { start: number; end: number }[] {
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
  slotMinutes: number = DEFAULT_SLOT_MINUTES
): Omit<EmptySlot, "id" | "created_at" | "published">[] {
  const dayStart = timeToMinutes(WORK_START);
  const dayEnd = timeToMinutes(WORK_END);
  const occupied = getOccupiedRanges(appointments);
  const gaps: Omit<EmptySlot, "id" | "created_at" | "published">[] = [];

  let cursor = dayStart;
  while (cursor + slotMinutes <= dayEnd) {
    const gapEnd = cursor + slotMinutes;
    const overlaps = occupied.some(
      (o) => cursor < o.end && gapEnd > o.start
    );

    if (!overlaps) {
      gaps.push({
        barber_id: barberId,
        date,
        start_time: minutesToTime(cursor),
        end_time: minutesToTime(gapEnd),
        duration_minutes: slotMinutes,
      });
    }

    cursor += slotMinutes;
  }

  return gaps;
}

export function syncEmptySlotsForBarber(
  barberId: number,
  dates: string[]
): number {
  const db = getDb();
  let synced = 0;

  for (const date of dates) {
    const appointments = db
      .prepare(
        `SELECT * FROM appointments WHERE barber_id = ? AND date = ?`
      )
      .all(barberId, date) as Appointment[];

    const computed = computeEmptySlotsForDay(barberId, date, appointments);
    const existing = db
      .prepare(
        `SELECT * FROM empty_slots WHERE barber_id = ? AND date = ? AND published = 0`
      )
      .all(barberId, date) as EmptySlot[];

    const computedKeys = new Set(
      computed.map((s) => `${s.start_time}-${s.end_time}`)
    );

    for (const slot of existing) {
      const key = `${slot.start_time}-${slot.end_time}`;
      if (!computedKeys.has(key)) {
        db.prepare("DELETE FROM empty_slots WHERE id = ?").run(slot.id);
      }
    }

    for (const slot of computed) {
      const found = existing.find(
        (e) =>
          e.start_time === slot.start_time && e.end_time === slot.end_time
      );
      if (!found) {
        db.prepare(
          `INSERT INTO empty_slots (id, barber_id, date, start_time, end_time, duration_minutes, published)
           VALUES (?, ?, ?, ?, ?, ?, 0)`
        ).run(
          uuid(),
          barberId,
          slot.date,
          slot.start_time,
          slot.end_time,
          slot.duration_minutes
        );
        synced++;
      }
    }
  }

  return synced;
}

export function syncEmptySlotsNextDays(barberId: number, days = 7): number {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(format(d, "yyyy-MM-dd"));
  }
  return syncEmptySlotsForBarber(barberId, dates);
}
