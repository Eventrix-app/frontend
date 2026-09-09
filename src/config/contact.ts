// Single source of truth for user-facing support contact details (Help Center, Settings,
// error screens, etc.) so there's one place to update if either changes.
//
// Must match the number published in the website's Contact & Grievance Policy — the app and
// that document are both public statements of the same support line.
export const SUPPORT_EMAIL = 'support@eventrix.app';
export const SUPPORT_PHONE = '+91-7249210279';

export const supportMailtoUrl = (subject?: string): string =>
  subject ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}` : `mailto:${SUPPORT_EMAIL}`;

export const supportTelUrl = (): string => `tel:${SUPPORT_PHONE.replace(/[^+\d]/g, '')}`;
