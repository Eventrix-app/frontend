import { BackendEvent } from '../store/services/eventsApi';
import { MockEvent } from '../data/mockEvents';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

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

function formatEventPrice(event: BackendEvent): string {
  if (!event.isPaid || !event.pricePerTicket) return 'Free';
  return `₹${event.pricePerTicket}`;
}

// Adapts a real backend event into the shape the pre-existing card components
// (MainEventCard, EventInterestCard, FeaturedCarousel) were built against for mock data,
// so those components don't need rewriting just to accept real data.
export function toCardEvent(event: BackendEvent): MockEvent {
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
  };
}
