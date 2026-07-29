// Mirrors Backend/src/entities/ticket-type.entity.ts's TicketCategory + TICKET_CATEGORY_LABELS.
// Kept as string literals rather than importing a shared package (this repo has no shared
// workspace between Frontend and Backend) — if the backend's enum values ever change, this
// is the one file on this side that needs to follow.
export const TICKET_CATEGORIES = ['EARLY_BIRD', 'GENERAL', 'VIP'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

// Display label per category. The backend computes and stores the same mapping into
// TicketTypeRecord.name at write time (see TICKET_CATEGORY_LABELS there) — this copy is for
// rendering the *picker* before a category has been chosen/saved, not for display after,
// where the real record's `.name` is already the derived label.
export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  EARLY_BIRD: 'Early Bird Pass',
  GENERAL: 'General Pass',
  VIP: 'VIP Pass',
};

export function isTicketCategory(value: string): value is TicketCategory {
  return (TICKET_CATEGORIES as readonly string[]).includes(value);
}
