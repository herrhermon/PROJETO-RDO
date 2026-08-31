// Formats using local calendar fields (not toISOString, which converts to UTC
// and can roll the date forward/back a day depending on the server's timezone
// offset and time of day).
export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISODate(): string {
  return toLocalISODate(new Date());
}

export function isFutureDate(dateStr: string): boolean {
  return dateStr > todayISODate();
}

export function isValidISODate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !Number.isNaN(Date.parse(dateStr));
}
