// Card-shaped event view model. Backend events are mapped into this shape by
// utils/eventCardAdapter.toCardEvent before being handed to MainEventCard.
export type MockEvent = {
  id: string;
  category: string;
  title: string;
  venue: string;
  organizer: string;
  date: string;
  time: string;
  price: string;
  image: string;
  featured?: boolean;
  description?: string;
  attendeesAvailable?: number;
  distanceKm?: string;
};
