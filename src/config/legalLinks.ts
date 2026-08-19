import { Linking } from 'react-native';
import { showAlert } from '../utils/crossPlatformAlert';

// Legal documents are published on the marketing site and opened there rather than
// rendered in-app. The corpus previously existed in three places — Docs/legal/*.md, the
// website, and an in-app transcription — which is a drift risk for text that has to stay
// legally accurate wherever it appears, and means a policy correction needs an app
// release to reach users.
export type LegalDocumentKey =
  | 'privacy'
  | 'terms'
  | 'refund'
  | 'cookies'
  | 'community'
  | 'dataRetention'
  | 'security'
  | 'payment'
  | 'accountDeletion'
  | 'grievance';

// Same deployment that serves the admin dashboard (see AdminRedirectScreen).
export const WEBSITE_BASE_URL =
  process.env.EXPO_PUBLIC_WEBSITE_URL || 'https://eventrix1.vercel.app';

// The website's slugs, not the app's key names — these must match the entries in
// eventrix-welcome-flow/src/components/legal/docs.ts or /legal/[slug] renders notFound().
const LEGAL_SLUGS: Record<LegalDocumentKey, string> = {
  privacy: 'privacy-policy',
  terms: 'terms-and-conditions',
  refund: 'refund-cancellation-policy',
  cookies: 'cookie-policy',
  community: 'community-guidelines',
  dataRetention: 'data-retention-policy',
  security: 'security-policy',
  payment: 'payment-policy',
  accountDeletion: 'account-deletion-policy',
  grievance: 'contact-grievance-policy',
};

export const legalDocumentUrl = (doc: LegalDocumentKey): string =>
  `${WEBSITE_BASE_URL}/legal/${LEGAL_SLUGS[doc]}`;

// The URL is surfaced in the failure message rather than swallowed — a user who needs a
// policy (a refund dispute, a grievance) still has somewhere to go if no browser handles
// the intent.
export async function openLegalDocument(doc: LegalDocumentKey): Promise<void> {
  const url = legalDocumentUrl(doc);
  try {
    if (!(await Linking.canOpenURL(url))) throw new Error('No handler for https links');
    await Linking.openURL(url);
  } catch {
    showAlert('Could not open', `Visit ${url} in your browser to read this document.`);
  }
}
