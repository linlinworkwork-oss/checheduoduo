/** Format a Date as YYYY-MM-DD. */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** Today's date as YYYY-MM-DD. */
export function todayStr(): string {
  return formatDate(new Date());
}

/** Return a new Date offset by `days` days. */
export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
