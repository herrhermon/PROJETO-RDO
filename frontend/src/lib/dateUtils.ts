// Formats using local calendar fields (not toISOString, which converts to UTC
// and can roll the date forward/back a day depending on the browser's timezone
// offset and time of day).
export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toLocalISODate(new Date());
}

export function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function isFuture(isoDate: string): boolean {
  return isoDate > todayISO();
}
