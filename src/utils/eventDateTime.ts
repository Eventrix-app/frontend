// Mirrors Backend/src/events/utils/event-dates.util.ts. Events carry no timezone field —
// organizers/venues are India-only — so eventDate/startTime are civil wall-clock values
// meant to be read as IST. `new Date("YYYY-MM-DDTHH:mm")` with no offset parses in the
// *device's* local timezone instead, so a viewer outside IST could see an event bucketed
// as already over, or "days to go" off by one, purely because of where their phone thinks
// it is. Appending a fixed +05:30 offset makes parsing correct regardless of device locale.
const IST_OFFSET = '+05:30';
const IST_TIME_ZONE = 'Asia/Kolkata';

export function getEventStartDateTime(event: { eventDate: string; startTime: string }): Date {
  return new Date(`${event.eventDate}T${event.startTime}${IST_OFFSET}`);
}

export function getEventEndDateTime(event: { eventDate: string; startTime: string; endTime?: string | null }): Date {
  return new Date(`${event.eventDate}T${event.endTime ?? event.startTime}${IST_OFFSET}`);
}

// en-CA formats as YYYY-MM-DD, which doubles as the civil-date key we need.
function istDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIME_ZONE }).format(date);
}

// Whole-day difference between "today in IST" and the event's civil date — independent of
// the viewer's device timezone, unlike a plain `new Date(eventDate).setHours(0,0,0,0)`.
export function daysUntilEventDate(eventDate: string): number | null {
  const targetMs = Date.parse(`${eventDate}T00:00:00${IST_OFFSET}`);
  if (Number.isNaN(targetMs)) return null;
  const todayIstMs = Date.parse(`${istDateKey(new Date())}T00:00:00${IST_OFFSET}`);
  return Math.round((targetMs - todayIstMs) / (1000 * 60 * 60 * 24));
}
