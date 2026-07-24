// Single source of truth for user-facing support contact details (Help Center, Settings,
// error screens, etc.) so there's one place to update if either changes.
//
// TODO: SUPPORT_PHONE is a placeholder — replace with the real support line before release.
export const SUPPORT_EMAIL = 'support@eventrix.app';
export const SUPPORT_PHONE = '+91-XXXXXXXXXX';

export const supportMailtoUrl = (subject?: string): string =>
  subject ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}` : `mailto:${SUPPORT_EMAIL}`;

export const supportTelUrl = (): string => `tel:${SUPPORT_PHONE.replace(/[^+\d]/g, '')}`;
