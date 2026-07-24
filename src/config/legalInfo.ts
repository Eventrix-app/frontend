// Business/legal details interpolated into the in-app Privacy Policy and Terms &
// Conditions (see content/legalDocuments.ts). Centralized here so there's exactly one
// place to fill in before shipping to real users or submitting to app stores — until
// then, the values below render literally in-app, which is intentional: it's more honest
// than silently shipping a fake company name or address.
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

// Bump LAST_UPDATED (and EFFECTIVE_DATE, if the change is substantive) whenever the
// content in content/legalDocuments.ts changes.
export const EFFECTIVE_DATE = 'July 24, 2026';
export const LAST_UPDATED = 'July 24, 2026';
