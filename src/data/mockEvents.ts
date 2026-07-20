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

export const CATEGORIES = [
  { id: 'music', name: 'Music' },
  { id: 'tech', name: 'Tech' },
  { id: 'sports', name: 'Sports' },
  { id: 'health', name: 'Health' },
  { id: 'business', name: 'Business' },
  { id: 'education', name: 'Education' },
];

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: '1',
    category: 'Music',
    title: 'Neon Nights Music Festival',
    venue: 'Phoenix Arena, Mumbai',
    organizer: 'SoundWave Events',
    date: 'Sat, 12 Jul 2026',
    time: '7:00 PM',
    price: '₹499',
    image: require('../../assets/events/e1.jpg'),
    featured: true,
    description:
      'An electrifying night of live bands, DJs, and immersive light shows. Food trucks and merch zones on site.',
  },
  {
    id: '2',
    category: 'Tech',
    title: 'FutureStack Developer Summit',
    venue: 'Tech Park, Bengaluru',
    organizer: 'DevCommunity India',
    date: 'Fri, 18 Jul 2026',
    time: '10:00 AM',
    price: 'Free',
    featured: true,
    image: require('../../assets/events/e1.jpg'),
    description:
      'Talks on AI, cloud, and mobile. Hands-on workshops and networking with industry leaders.',
  },
  {
    id: '3',
    category: 'Sports',
    title: 'City Marathon 2026',
    venue: 'Marine Drive, Mumbai',
    organizer: 'Run India',
    date: 'Sun, 3 Aug 2026',
    time: '5:30 AM',
    price: '₹799',
    featured: true,
    image: require('../../assets/events/e1.jpg'),
    description: '5K, 10K, and half-marathon categories. Chip timing and finisher medals included.',
  },
  {
    id: '4',
    category: 'Food',
    title: 'Street Food Carnival',
    venue: 'Jubilee Hills, Hyderabad',
    organizer: 'Taste Trails',
    date: 'Sat, 26 Jul 2026',
    time: '4:00 PM',
    price: '₹299',
    image: require('../../assets/events/e1.jpg'),
    description: '50+ stalls, live cooking demos, and family-friendly activities.',
  },
  {
    id: '5',
    category: 'Art',
    title: 'Contemporary Art Walk',
    venue: 'Lodhi Art District, Delhi',
    organizer: 'Canvas Collective',
    date: 'Sun, 10 Aug 2026',
    time: '11:00 AM',
    price: '₹199',
    image: require('../../assets/events/e1.jpg'),
    description: 'Guided tour of murals and installations with local artists.',
  },
];

export const MOCK_SHORTS = [
  {
    id: 's1',
    user: 'James Cameron',
    handle: '@random_username',
    title: 'Neon Nights recap',
    tags: ['#music', '#festival', '#mumbai'],
    likes: 1200,
    comments: 432,
    gradient: ['#1e3a5f', '#f97316'],
  },
  {
    id: 's2',
    user: 'DevCommunity',
    handle: '@devcommunity',
    title: 'FutureStack highlights',
    tags: ['#tech', '#summit'],
    likes: 890,
    comments: 156,
    gradient: ['#312e81', '#6366f1'],
  },
];

export type BookingStatus = 'upcoming' | 'confirmed' | 'completed' | 'cancelled';

export type MockBooking = {
  id: string;
  eventId: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  ticketType: string;
  status: BookingStatus;
  qrCode: string;
  quantity?: number;
  totalPaid?: string;
};

export const MOCK_USER = {
  id: 'u1',
  firstName: 'Harry',
  lastName: 'Sharma',
  username: '@harrysharma',
  email: 'harry.sharma@eventrix.com',
  phone: '+91 98765 43210',
  city: 'Mumbai',
  avatar: '👤',
  eventsAttended: 12,
  savedCount: 5,
  memberSince: 'Jan 2026',
};

export const MOCK_RECENT_SEARCHES = [
  'Music festival',
  'Tech summit',
  'Marathon',
  'Food carnival',
];

export const MOCK_NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'reminder' as const,
    title: 'Event starting soon',
    body: 'Neon Nights Music Festival starts in 2 hours.',
    time: '2h ago',
    read: false,
  },
  {
    id: 'n2',
    type: 'booking' as const,
    title: 'Booking confirmed',
    body: 'Your ticket for City Marathon 2026 is ready.',
    time: '1d ago',
    read: false,
  },
  {
    id: 'n3',
    type: 'reel' as const,
    title: 'New reel from DevCommunity',
    body: 'FutureStack highlights are trending now.',
    time: '2d ago',
    read: true,
  },
  {
    id: 'n4',
    type: 'update' as const,
    title: 'Schedule update',
    body: 'Street Food Carnival now starts at 5:00 PM.',
    time: '3d ago',
    read: true,
  },
];

export const MOCK_SAVED_EVENT_IDS = ['1', '2', '5'];

export const MOCK_BOOKINGS: MockBooking[] = [
  {
    id: 'b1',
    eventId: '1',
    title: 'Neon Nights Music Festival',
    date: 'Sat, 12 Jul 2026',
    time: '7:00 PM',
    venue: 'Phoenix Arena, Mumbai',
    ticketType: 'General Admission',
    status: 'confirmed',
    qrCode: 'EVX-2026-001',
    quantity: 2,
    totalPaid: '₹998',
  },
  {
    id: 'b2',
    eventId: '3',
    title: 'City Marathon 2026',
    date: 'Sun, 3 Aug 2026',
    time: '5:30 AM',
    venue: 'Marine Drive, Mumbai',
    ticketType: '10K Run',
    status: 'upcoming',
    qrCode: 'EVX-2026-002',
    quantity: 1,
    totalPaid: '₹799',
  },
  {
    id: 'b3',
    eventId: '2',
    title: 'FutureStack Developer Summit',
    date: 'Fri, 18 Jul 2026',
    time: '10:00 AM',
    venue: 'Tech Park, Bengaluru',
    ticketType: 'Free Entry',
    status: 'completed',
    qrCode: 'EVX-2026-003',
    quantity: 1,
    totalPaid: 'Free',
  },
  {
    id: 'b4',
    eventId: '4',
    title: 'Street Food Carnival',
    date: 'Sat, 26 Jul 2026',
    time: '4:00 PM',
    venue: 'Jubilee Hills, Hyderabad',
    ticketType: 'General Admission',
    status: 'cancelled',
    qrCode: 'EVX-2026-004',
    quantity: 1,
    totalPaid: '₹299',
  },
];
