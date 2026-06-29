import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

export function formatDateItalian(dateStr: string): string {
  return format(parseISO(dateStr), "d MMMM", { locale: it });
}

export function formatRequestDate(dateStr: string): string {
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(
    new Date(new Date().setDate(new Date().getDate() + 1)),
    "yyyy-MM-dd"
  );
  if (dateStr === today) return "Oggi";
  if (dateStr === tomorrow) return "Domani";
  return formatDateItalian(dateStr);
}

export function getToday(): string {
  return format(new Date(), "yyyy-MM-dd");
}
