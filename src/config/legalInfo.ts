// Business/legal details surfaced in-app — currently the Help Center's grievance contact
// block. The policy documents themselves now live on the website (see config/legalLinks),
// so these values no longer feed a transcription; they are what the app itself displays.
//
// Everything here is also published on the website's legal pages. The two are separate
// copies of the same public statement, so a change to one is only half a change.
//
// TODO before launch: confirm COMPANY_LEGAL_NAME and REGISTERED_OFFICE_ADDRESS are the
// registered values. A city alone is not a registered office address.
export const COMPANY_LEGAL_NAME = 'The Ladders Tech';
export const REGISTERED_OFFICE_ADDRESS = 'Pune, Maharashtra, India';
export const JURISDICTION_CITY = 'Pune';

// India's IT (Intermediary Guidelines) Rules, 2021 require a *named* Grievance Officer with
// published contact details; the DPDP Act, 2023 has an equivalent expectation for a
// grievance/consent-manager contact point. A title alone ("Grievance Team") does not satisfy
// the named-officer requirement, which is why this is a person.
//
// Must stay in step with the officer designated in the website's published Contact &
// Grievance Policy — that document is the legal designation, this is what the app shows.
export const GRIEVANCE_OFFICER_NAME = 'Suffiyan Shaikh';
export const GRIEVANCE_OFFICER_EMAIL = 'grievance@eventrix.app';
// Same line as SUPPORT_PHONE by design — one number answers both. Rule 3(2) asks for
// published contact details for the named officer, and a number that is only reachable in
// theory satisfies the letter of that but not its point.
export const GRIEVANCE_OFFICER_PHONE = '+91-7249210279';

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
