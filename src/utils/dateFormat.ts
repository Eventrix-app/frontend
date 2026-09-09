export const DATE_DISPLAY_FORMATTER = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export function parseDateValue(value: string): Date {
  if (value) {
    const [y, m, d] = value.split('-').map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  return new Date();
}

export function formatDateValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseTimeValue(value: string): Date {
  const base = new Date();
  if (value) {
    const [h, m] = value.split(':').map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      base.setHours(h, m, 0, 0);
      return base;
    }
  }
  base.setSeconds(0, 0);
  return base;
}

export function formatTimeValue(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatTimeDisplay(value: string): string {
  if (!value) return '';
  const [hourStr, minuteStr] = value.split(':');
  const hour = Number(hourStr);
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minuteStr ?? '00'} ${period}`;
}

// Ticket-type sales windows are TIMESTAMP columns fed by a date-only picker. Sending the
// bare 'YYYY-MM-DD' string lets the backend's `new Date(...)` parse it as UTC midnight for
// BOTH boundaries — which is wrong for the end date specifically: "sale ends March 10"
// would then close sales at the very start of March 10 (i.e. up to a full day early)
// instead of through the end of it. Pin explicit UTC day boundaries instead so
// salesEndAt actually covers the whole selected day, and so re-editing an existing tier
// reads back the same date it was saved with (no local-timezone round-trip drift).
export function dateOnlyToStartOfDayIso(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`;
}

export function dateOnlyToEndOfDayIso(dateStr: string): string {
  return `${dateStr}T23:59:59.999Z`;
}

// Mirrors the backend's IsAdult(18) validator (is-adult.validator.ts) — checked client-side
// too so a too-young signup gets caught before the request round-trips, not just after.
export function isAtLeastAge(dateOfBirth: string, minAge: number): boolean {
  const dob = parseDateValue(dateOfBirth);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - minAge);
  return dob.getTime() <= cutoff.getTime();
}

// For a date picker's `maximumDate` — the latest DOB that still satisfies the minimum age,
// so the picker itself can't select an underage date rather than only rejecting on submit.
export function latestDateOfBirthForMinAge(minAge: number): Date {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - minAge);
  return cutoff;
}
