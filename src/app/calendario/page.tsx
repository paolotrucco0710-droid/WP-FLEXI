"use client";

import { useEffect, useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { AppShell } from "@/components/AppShell";
import { Header } from "@/components/Header";
import { ActionButton } from "@/components/ActionButton";
import type { Appointment, EmptySlot } from "@/lib/types";
import type { Customer } from "@/lib/types";

const HOURS = Array.from({ length: 11 }, (_, i) => 10 + i);

export default function CalendarioPage() {
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [emptySlots, setEmptySlots] = useState<EmptySlot[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    subDays(addDays(new Date(), 3), 6 - i)
  );

  useEffect(() => {
    fetch(`/api/calendar?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        setAppointments(data.appointments);
        setEmptySlots(data.emptySlots);
      });
  }, [selectedDate]);

  useEffect(() => {
    if (showAdd) {
      fetch("/api/customers")
        .then((r) => r.json())
        .then(setCustomers);
    }
  }, [showAdd]);

  return (
    <AppShell>
      <Header title="Calendario" />
      <div className="px-4 py-3">
        <div className="flex gap-1 overflow-x-auto pb-2">
          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`flex min-w-[52px] flex-col items-center rounded-xl px-2 py-2 text-xs transition-colors ${
                  isSelected
                    ? "bg-flexi-purple text-white"
                    : "bg-white text-flexi-gray"
                }`}
              >
                <span className="font-medium uppercase">
                  {format(day, "EEE", { locale: it })}
                </span>
                <span className="text-lg font-bold">{format(day, "d")}</span>
                {isToday && !isSelected && (
                  <span className="mt-0.5 h-1 w-1 rounded-full bg-flexi-purple" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative mx-4 mb-4 rounded-2xl bg-white p-4 shadow-sm">
        {HOURS.map((hour) => {
          const timeStr = `${hour.toString().padStart(2, "0")}:00`;
          const appt = appointments.find((a) => a.time.startsWith(timeStr.slice(0, 2)));
          const slot = emptySlots.find((s) =>
            s.start_time.startsWith(timeStr.slice(0, 2))
          );

          if (hour === 13) {
            return (
              <div key={hour} className="mb-2 flex items-center gap-3 py-2">
                <span className="w-12 text-xs text-flexi-gray">{timeStr}</span>
                <div className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm text-flexi-gray">
                  Pausa
                </div>
              </div>
            );
          }

          return (
            <div key={hour} className="mb-2 flex items-center gap-3 py-1">
              <span className="w-12 text-xs text-flexi-gray">{timeStr}</span>
              {appt ? (
                <div
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white ${
                    appt.status === "confermato"
                      ? "bg-flexi-green"
                      : "bg-flexi-orange"
                  }`}
                >
                  {appt.customer_name}
                  <span className="ml-2 text-xs opacity-80">
                    {appt.time}
                  </span>
                </div>
              ) : slot ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-flexi-purple px-3 py-2 text-sm text-flexi-purple">
                  + SLOT LIBERO
                </div>
              ) : (
                <div className="flex-1 border-b border-gray-100 py-2" />
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 pb-4">
        <ActionButton
          variant="purple"
          fullWidth
          size="lg"
          onClick={() => setShowAdd(true)}
        >
          + AGGIUNGI APPUNTAMENTO
        </ActionButton>
      </div>

      {showAdd && (
        <AddAppointmentModal
          customers={customers}
          date={selectedDate}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            fetch(`/api/calendar?date=${selectedDate}`)
              .then((r) => r.json())
              .then((data) => {
                setAppointments(data.appointments);
                setEmptySlots(data.emptySlots);
              });
          }}
        />
      )}
    </AppShell>
  );
}

function AddAppointmentModal({
  customers,
  date,
  onClose,
  onSaved,
}: {
  customers: Customer[];
  date: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const times = [
    "10:00", "10:30", "11:00", "11:30", "12:00",
    "14:00", "14:30", "15:00", "15:30", "16:00",
    "16:30", "17:00", "17:30", "18:00", "18:30", "19:00",
  ];

  const handleSave = async () => {
    if (!customerId) return;
    setSaving(true);
    try {
      await fetch("/api/appointments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          date,
          time,
          durationMinutes: duration,
          notes,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-6">
        <h3 className="mb-4 text-lg font-bold">Aggiungi appuntamento</h3>

        <label className="mb-1 block text-xs font-semibold text-flexi-gray">
          Cliente
        </label>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="mb-3 w-full rounded-xl border border-gray-200 p-3 text-sm"
        >
          <option value="">Seleziona cliente...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs font-semibold text-flexi-gray">
          Data
        </label>
        <input
          type="date"
          value={date}
          disabled
          className="mb-3 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm"
        />

        <label className="mb-1 block text-xs font-semibold text-flexi-gray">
          Orario
        </label>
        <select
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="mb-3 w-full rounded-xl border border-gray-200 p-3 text-sm"
        >
          {times.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs font-semibold text-flexi-gray">
          Durata
        </label>
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="mb-3 w-full rounded-xl border border-gray-200 p-3 text-sm"
        >
          <option value={30}>30 min</option>
          <option value={45}>45 min</option>
          <option value={60}>60 min</option>
        </select>

        <label className="mb-1 block text-xs font-semibold text-flexi-gray">
          Note (opzionale)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mb-4 w-full rounded-xl border border-gray-200 p-3 text-sm"
          rows={2}
        />

        <div className="flex gap-2">
          <ActionButton variant="outline-green" fullWidth onClick={onClose}>
            ANNULLA
          </ActionButton>
          <ActionButton
            variant="purple"
            fullWidth
            loading={saving}
            onClick={handleSave}
          >
            SALVA APPUNTAMENTO
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
