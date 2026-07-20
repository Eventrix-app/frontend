import { BackendEvent } from '../store/services/eventsApi';
import { MockEvent } from '../data/mockEvents';

// A bare 'YYYY-MM-DD' string parses as UTC midnight (per the Date spec), so formatting it
// with the device's local timezone can roll the displayed calendar date back or forward a
// day depending on where the viewer is relative to UTC. Pinning the formatter to UTC makes
// the displayed date always match the literal Y-M-D in the string, regardless of device TZ.
const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatEventDate(eventDate: string): string {
  const parsed = new Date(eventDate);
  if (Number.isNaN(parsed.getTime())) return eventDate;
  return DATE_FORMATTER.format(parsed);
}

export function formatEventTime(startTime: string): string {
  const [hourStr, minuteStr] = startTime.split(':');
  const hour = Number(hourStr);
  if (Number.isNaN(hour)) return startTime;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minuteStr ?? '00'} ${period}`;
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatEventPrice(event: BackendEvent): string {
  if (!event.isPaid || !event.pricePerTicket) return 'Free';
  return CURRENCY_FORMATTER.format(event.pricePerTicket);
}

export function formatDistanceKm(distanceKm: number): string {
  return `${distanceKm.toFixed(1)} km`;
}

// Haversine great-circle distance between two lat/long points, in kilometers.
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const EARTH_RADIUS_KM = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Adapts a real backend event into the shape the pre-existing card components
// (MainEventCard, EventInterestCard, FeaturedCarousel) were built against for mock data,
// so those components don't need rewriting just to accept real data. userLat/userLng are
// the viewer's own location (GET /users/me), used to compute a live distance to the venue.
export function toCardEvent(event: BackendEvent, userLat?: number | null, userLng?: number | null): MockEvent {
  const distanceKm =
    userLat != null && userLng != null && event.latitude != null && event.longitude != null
      ? formatDistanceKm(calculateDistanceKm(userLat, userLng, event.latitude, event.longitude))
      : undefined;

  return {
    id: event.id,
    category: event.category?.name ?? 'Event',
    title: event.title,
    venue: event.venueName,
    organizer: event.organizer?.companyName ?? event.organizer?.user?.fullName ?? 'Organizer',
    date: formatEventDate(event.eventDate),
    time: formatEventTime(event.startTime),
    price: formatEventPrice(event),
    image: event.coverImageUrl ?? event.imageUrl ?? '',
    featured: event.featured,
    description: event.description,
    attendeesAvailable: event.availableTickets ?? undefined,
    distanceKm,
  };
}
