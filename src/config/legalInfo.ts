// Business/legal details surfaced in-app — currently the Help Center's grievance contact
// block. The policy documents themselves now live on the website (see config/legalLinks),
// so these values no longer feed a transcription; they are what the app itself displays.
// Until they are filled in, the placeholders below render literally, which is intentional:
// more honest than silently showing a fake company name or address.
//
// TODO before launch: replace every value below with the real, registered details.
export const COMPANY_LEGAL_NAME = 'The Ladders Tech';
export const REGISTERED_OFFICE_ADDRESS = 'Pune, Maharashtra, India';
export const JURISDICTION_CITY = 'Pune';

// India's IT (Intermediary Guidelines) Rules, 2021 require a named Grievance Officer with
// published contact details; the DPDP Act, 2023 has an equivalent expectation for a
// grievance/consent-manager contact point. GRIEVANCE_OFFICER_NAME is a real placeholder —
// fill in an actual named individual (a title alone, e.g. "Grievance Team," does not
// satisfy the "named officer" requirement.
// TODO before launch: name a real Grievance Officer.
export const GRIEVANCE_OFFICER_NAME = '[Grievance Officer Name — to be finalized]';
export const GRIEVANCE_OFFICER_EMAIL = 'grievance@eventrix.app';

// Standard timelines under the IT Rules, 2021 (Rule 3(2)): acknowledge within 24 hours,
// resolve within 15 days of receipt. Kept as named constants so the SLA is defined once
// and quoted identically everywhere it's mentioned (Contact & Grievance Policy, Help
// Center, Privacy Policy).
export const GRIEVANCE_ACK_SLA_HOURS = 24;
export const GRIEVANCE_RESOLUTION_SLA_DAYS = 15;

// Mirrors the dates published on the website's legal pages. Bump LAST_UPDATED (and
// EFFECTIVE_DATE, if the change is substantive) whenever those documents change, so the
// in-app grievance block does not quote a stale revision.
export const EFFECTIVE_DATE = 'July 24, 2026';
export const LAST_UPDATED = 'July 24, 2026';
