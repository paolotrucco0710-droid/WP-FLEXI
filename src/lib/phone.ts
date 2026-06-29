export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "").replace(/^00/, "+");
}

export function validatePhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^\+?[0-9]{8,15}$/.test(normalized);
}
