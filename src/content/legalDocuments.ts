import {
  COMPANY_LEGAL_NAME,
  REGISTERED_OFFICE_ADDRESS,
  JURISDICTION_CITY,
  EFFECTIVE_DATE,
  LAST_UPDATED,
  GRIEVANCE_OFFICER_NAME,
  GRIEVANCE_OFFICER_EMAIL,
  GRIEVANCE_ACK_SLA_HOURS,
  GRIEVANCE_RESOLUTION_SLA_DAYS,
} from '../config/legalInfo';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '../config/contact';

// In-app renderable form of the canonical documents in Docs/legal/*.md — keep both in
// sync when either changes. Markdown tables in the source docs are flattened into
// "Label — value" bullet lists here since there's no table layout in the mobile renderer;
// content is otherwise a faithful, complete transcription (nothing summarized/omitted).
export type LegalBlock = { type: 'p'; text: string } | { type: 'bullets'; items: string[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const p = (text: string): LegalBlock => ({ type: 'p', text });
const bullets = (items: string[]): LegalBlock => ({ type: 'bullets', items });

export const privacyPolicyDocument: LegalDocument = {
  title: 'Privacy Policy',
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: '1. Introduction',
      blocks: [
        p(`This Privacy Policy explains how Eventrix ("Eventrix," "we," "us," or "our"), operated by ${COMPANY_LEGAL_NAME}, a company incorporated under the laws of India with its registered office at ${REGISTERED_OFFICE_ADDRESS} ("Company"), collects, uses, stores, shares, and protects personal data when you use the Eventrix mobile application, any associated web interfaces, and related services (collectively, the "App" or "Service").`),
        p('This Policy is drafted to comply with the applicable provisions of the Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000 and rules made thereunder, and, where relevant to users outside India, has regard to internationally recognized privacy principles (such as purpose limitation, data minimization, and user control) reflected in frameworks like the GDPR. It does not itself constitute a representation that the GDPR applies to your use of the App.'),
        p('By creating an account or using the App, you agree to the collection and use of information as described in this Policy. If you do not agree, please do not use the App.'),
      ],
    },
    {
      heading: '2. Definitions',
      blocks: [
        bullets([
          '"Participant" means a user who browses, books, or attends events through the App.',
          '"Organizer" means a user who has applied for and/or holds organizer status to create and manage events.',
          '"Personal Data" means any data that identifies or relates to an identifiable natural person.',
          '"Processing" means any operation performed on Personal Data, including collection, storage, use, disclosure, and deletion.',
          '"Third-Party Service Provider" means an external company that processes data on our behalf or provides infrastructure the App relies on.',
        ]),
      ],
    },
    {
      heading: '3. Information We Collect',
      blocks: [
        p('3.1 Information you provide directly:'),
        bullets([
          'Account/Identity — email address, full name, phone number (optional), password (see §7), date of birth, gender. (All users)',
          'Profile — profile picture, bio. (All users)',
          'Location — free-text location/address, precise latitude/longitude coordinates. (Participants, for nearby-event discovery)',
          'Interests — selected event categories. (Participants)',
          'Organizer Profile — company name, description, website, company logo. (Organizers)',
          'Organizer Verification (KYC) — identity proof document, address proof document, PAN card or Aadhaar card image, UPI ID for payouts. (Organizers applying for verification)',
          'Booking Data — event enrollments, ticket quantity, booking reference, payment amount and status. (Participants)',
          'Community Content — event reviews (rating and text), event group-chat messages, short-form video uploads and captions. (Anyone who chooses to post)',
          'Support Communications — any information you provide when contacting support. (All users)',
        ]),
        p('3.2 Information collected automatically:'),
        bullets([
          "Push notification token — a device-specific identifier issued by Expo's push service, used to deliver notifications to your device. Only one token is stored per account (the most recently registered device).",
          'Notification preferences — your chosen categories (event reminders, nearby events, community updates, offers) and master on/off switches for push and email notifications.',
          'Standard technical/request metadata (such as IP address and request timestamps) may be logged by our hosting and infrastructure providers for security, abuse prevention, and reliability purposes, consistent with their own standard logging practices.',
        ]),
        p('3.3 Information from third-party sign-in: if you register or log in using Google, Apple, or Facebook, we receive and store your name, email address, and profile picture as made available by that provider, and a provider-issued identifier used to link your social account to your Eventrix account. We independently and cryptographically verify these sign-ins with the relevant provider before trusting any identity information they supply; we do not accept unverified claims from your device.'),
        p('3.4 Information we do not collect: we do not collect card numbers, CVV, bank account numbers, or UPI PINs. Full payment credentials are entered directly into our payment gateway\'s own secure interface and never pass through or are stored on Eventrix\'s servers. See §9 (Payment Information).'),
      ],
    },
    {
      heading: '4. How We Collect Information',
      blocks: [
        bullets([
          'Directly from you, when you register, complete your profile, apply for organizer verification, book an event, post a review/chat message/short, or contact support.',
          'Automatically, through your device and app usage (push token, notification settings, standard request metadata via our infrastructure providers).',
          'From third parties, when you choose to authenticate via Google, Apple, or Facebook, and from our payment gateway (transaction status and a gateway-issued reference ID, never full payment credentials).',
        ]),
      ],
    },
    {
      heading: '5. Why We Collect Information (Purposes)',
      blocks: [
        bullets([
          'Creating and authenticating your account — email, password (hashed), phone, social sign-in identifiers.',
          'Verifying your identity for organizer status — KYC documents, full name.',
          'Discovering and displaying nearby/relevant events — location, latitude/longitude, interests.',
          'Processing event bookings and payments — booking data, payment amount/status/gateway reference.',
          'Calculating and paying organizer payouts — commission configuration, UPI ID, payment/booking records.',
          'Sending transactional communications — email address, push token, notification preferences.',
          'Enabling community features — reviews, chat messages, short-form videos.',
          'Preventing fraud, abuse, and enforcing our Terms — account status, audit logs of administrative actions.',
          'Legal and regulatory compliance — KYC records, payment records, audit logs.',
        ]),
      ],
    },
    {
      heading: '6. Legal Basis for Processing',
      blocks: [
        p('Under the DPDP Act, our primary legal basis for processing your Personal Data is your consent, given at the time you create an account, grant a permission (e.g., location), or submit information (e.g., KYC documents). We may also process limited data on the basis of legitimate uses recognized under the DPDP Act, such as preventing fraud, responding to a legal obligation, or in connection with a grievance or dispute you raise with us. Where applicable to users in jurisdictions recognizing GDPR-style bases, our processing corresponds to: performance of a contract with you (providing the App), legitimate interests (security, fraud prevention), consent (marketing/location), and compliance with legal obligations (KYC, financial recordkeeping).'),
      ],
    },
    {
      heading: '7. How Your Data Is Stored and Secured',
      blocks: [
        bullets([
          'Your account data is stored in a managed PostgreSQL database hosted via our database infrastructure provider (Supabase).',
          'Passwords are never stored in plain text. They are hashed using the industry-standard bcrypt algorithm before storage; we cannot see or recover your actual password.',
          'One-time passcodes (OTPs) used for password reset and email verification are stored as one-way cryptographic hashes, not in plain text, and automatically expire after a short, fixed time window.',
          'Organizer KYC documents (identity proof, address proof, PAN/Aadhaar) are stored in a private storage bucket that is never publicly accessible. They can only be viewed via short-lived, admin-restricted, time-limited access links generated on demand.',
          'Data in transit between the App and our servers is encrypted using HTTPS/TLS.',
        ]),
        p('See our separate Security Policy for further detail.'),
      ],
    },
    {
      heading: '8. Third-Party Services',
      blocks: [
        p('We rely on the following categories of third-party service providers to operate the App. Each processes only the data necessary for its specific function:'),
        bullets([
          'Google, Apple, Facebook — social sign-in/authentication. Shared: sign-in token, resulting profile data (name, email, picture).',
          'Supabase — database and file storage hosting. Shared: all Personal Data described in this Policy; uploaded files/documents.',
          'Resend / SMTP email provider — transactional email delivery (OTPs, booking confirmations, notifications). Shared: email address, email content.',
          'Expo — push notification delivery; app build/distribution. Shared: push token, notification title/body.',
          'Google Maps Platform — reverse geocoding and map display for event discovery. Shared: latitude/longitude coordinates.',
          'Vercel — application hosting/infrastructure. Shared: standard request metadata.',
          'Payment gateway (Razorpay) — payment collection and processing. Shared: booking amount, currency, and transaction status (see §9).',
        ]),
        p('We do not sell your Personal Data to third parties. We do not share your Personal Data with third parties for their own independent marketing purposes.'),
      ],
    },
    {
      heading: '9. Payment Information',
      blocks: [
        p('Paid ticket bookings are designed to be processed through Razorpay, an RBI-regulated payment aggregator, or another payment gateway we may engage from time to time. When you make a payment:'),
        bullets([
          "Your card, net-banking, UPI, or wallet credentials are entered directly into the payment gateway's own secure, PCI-DSS-compliant checkout interface.",
          "Eventrix's servers never receive or store your full card number, CVV, bank account number, or UPI PIN.",
          'We store only the payment amount, currency (INR), payment status, and a gateway-issued reference/transaction ID needed to reconcile your booking.',
        ]),
        p('Automated, fully live payment-gateway processing is in the process of being finalized for the App. This Policy, and our separate Payment Policy, will be kept accurate and up to date as this functionality is activated. We will not enable paid ticket collection for a given payment method until the corresponding gateway integration is live and secure.'),
      ],
    },
    {
      heading: "10. Children's Privacy",
      blocks: [
        p('The App collects a date of birth field but does not currently implement an automated minimum-age verification or parental-consent mechanism. The App is not intended for use by children under the age of 18, and organizer verification (which involves government identity documents) is inherently restricted to adults capable of providing such documents. If we become aware that we have collected Personal Data from a child without appropriate consent, we will take steps to delete that data. Parents or guardians who believe their child has provided us with Personal Data may contact us using the details in §16.'),
      ],
    },
    {
      heading: '11. Data Retention',
      blocks: [
        p('We retain Personal Data for as long as your account remains active, and thereafter as described in our separate Data Retention Policy, which covers retention periods for account data, booking/payment records (retained for statutory financial/tax purposes), KYC documents, and community content.'),
      ],
    },
    {
      heading: '12. Your Rights',
      blocks: [
        p('Subject to applicable law, you have the right to:'),
        bullets([
          'Access the Personal Data we hold about you (available directly in-app via your Profile).',
          'Correct inaccurate profile information (available directly in-app via Edit Profile).',
          'Withdraw consent for optional features such as location sharing or notifications, via your device or in-app settings.',
          'Request deletion of your account and associated Personal Data, directly in-app via Settings → Delete Account, as described in our Account Deletion Policy.',
          'Raise a grievance regarding how your data is handled, as described in our Contact & Grievance Policy.',
        ]),
      ],
    },
    {
      heading: '13. Account Deletion',
      blocks: [
        p('You may delete your account at any time directly within the App, from Settings → Delete Account. Deletion takes effect immediately: your session is ended and your account can no longer be used to log in. Full details of what is deleted, what is retained, and why, are set out in our Account Deletion Policy. If you are unable to access the App, you may also request deletion by contacting us using the details in §16.'),
      ],
    },
    {
      heading: '14. Data Transfers',
      blocks: [
        p('Some of our third-party service providers (see §8) may process or store data on servers located outside India. Where this occurs, we require that providers maintain security and confidentiality standards consistent with this Policy.'),
      ],
    },
    {
      heading: '15. Policy Updates',
      blocks: [
        p('We may update this Privacy Policy from time to time to reflect changes in our practices, features, or applicable law. We will update the "Last Updated" date above when we do. Material changes will be notified to you through the App or via email before they take effect. Continued use of the App after an update constitutes acceptance of the revised Policy.'),
      ],
    },
    {
      heading: '16. Contact Information',
      blocks: [
        p('For any questions, requests, or concerns about this Privacy Policy or your Personal Data, please contact:'),
        bullets([
          `Support Email: ${SUPPORT_EMAIL}`,
          'Grievance Officer: see our Contact & Grievance Policy for statutory grievance-redressal contact details.',
          `Postal Address: ${REGISTERED_OFFICE_ADDRESS}`,
        ]),
      ],
    },
  ],
};

export const termsAndConditionsDocument: LegalDocument = {
  title: 'Terms & Conditions',
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: '1. Introduction and Acceptance',
      blocks: [
        p(`These Terms & Conditions ("Terms") govern your access to and use of the Eventrix mobile application and related services (collectively, the "App"), operated by ${COMPANY_LEGAL_NAME} ("Company," "we," "us"). By creating an account or using the App, you agree to be bound by these Terms and by our Privacy Policy, Refund & Cancellation Policy, Community Guidelines, and Payment Policy, each incorporated herein by reference.`),
        p('If you do not agree to these Terms, you must not use the App.'),
      ],
    },
    {
      heading: '2. Definitions',
      blocks: [
        bullets([
          '"User" means any registered user of the App, including Participants, Organizers, and Administrators.',
          '"Participant" means a User who browses, books, or attends Events.',
          '"Organizer" means a User who has applied for and been granted the ability to create and manage Events.',
          '"Event" means any activity, gathering, or listing created by an Organizer on the App.',
          '"Booking" or "Enrollment" means a Participant\'s confirmed reservation of one or more tickets to an Event.',
          '"Content" means any text, image, video, review, chat message, or other material submitted by a User.',
          '"Platform Fee" / "Commission" means the amount retained by the Company from a paid Booking, as described in §8.',
        ]),
      ],
    },
    {
      heading: '3. Eligibility and User Accounts',
      blocks: [
        bullets([
          '3.1 You must provide accurate, current, and complete information when registering, and keep it updated.',
          '3.2 You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. Notify us immediately of any unauthorized use.',
          '3.3 You may register using an email/password combination, or via Google, Apple, or Facebook sign-in. You represent that any information obtained through third-party sign-in is accurate.',
          '3.4 The App is intended for use by individuals capable of entering into a binding contract under the Indian Contract Act, 1872. Organizer verification requires submission of government identity documents and is accordingly restricted to adult Users.',
          '3.5 The Company reserves the right to refuse registration, or suspend or terminate an account, at its discretion, in accordance with §13.',
        ]),
      ],
    },
    {
      heading: '4. Acceptable Use',
      blocks: [
        p('You agree not to:'),
        bullets([
          '4.1 Use the App for any unlawful purpose or in violation of any applicable law;',
          '4.2 Impersonate any person or entity, or misrepresent your affiliation with any person or entity;',
          "4.3 Upload Content that is defamatory, obscene, harassing, hateful, or infringes any third party's intellectual property or privacy rights (see our Community Guidelines for detailed standards);",
          "4.4 Attempt to gain unauthorized access to the App, other users' accounts, or our systems;",
          '4.5 Use automated means (bots, scrapers) to access or interact with the App without our prior written consent;',
          '4.6 Circumvent, disable, or otherwise interfere with security-related features of the App;',
          '4.7 Use the Booking or payment system to facilitate fraud, money laundering, or any illegal transaction.',
        ]),
        p('Violation of this section may result in suspension or termination of your account under §13, in addition to any other remedies available to us at law.'),
      ],
    },
    {
      heading: '5. Organizer Responsibilities',
      blocks: [
        bullets([
          '5.1 Verification. To create and publish Events, an Organizer must submit company details and identity/address verification documents for review. Events may require administrative approval before being published, depending on the Organizer\'s verification level and settings.',
          '5.2 Accuracy. Organizers are solely responsible for the accuracy, legality, and completeness of their Event listings, including date, time, venue, pricing, capacity, and description.',
          '5.3 Delivery of the Event. Organizers are responsible for actually holding the Event as listed and for the conduct, safety, and legality of the Event itself. The Company is a technology platform that facilitates discovery and booking; it is not the organizer, promoter, or operator of any Event.',
          '5.4 Compliance. Organizers are responsible for obtaining any permits, licenses, or insurance required by law for their Event, and for complying with all applicable tax obligations arising from ticket sales.',
          '5.5 Payouts. Organizer payouts are calculated after deduction of the applicable Commission and any gateway processing fees, and are released according to the schedule described in our Payment Policy.',
          '5.6 Cancellations. If an Organizer cancels an Event, the Organizer is responsible for that cancellation being reflected promptly on the App and for any resulting refund obligations described in our Refund & Cancellation Policy.',
        ]),
      ],
    },
    {
      heading: '6. Ticket Booking Rules',
      blocks: [
        bullets([
          '6.1 A Booking is confirmed only once payment (where the Event is paid) has been successfully processed and reflected in your account, or, for free Events, once your registration has been recorded.',
          '6.2 Ticket availability is limited to the capacity set by the Organizer. Where capacity is exhausted, you may be placed on a waitlist and will be notified automatically if a spot becomes available.',
          '6.3 Tickets are non-transferable to another person unless the App explicitly provides a transfer feature.',
          '6.4 You are responsible for reviewing Event details (date, time, venue, refund eligibility window) before completing a Booking.',
        ]),
      ],
    },
    {
      heading: '7. Payments',
      blocks: [
        bullets([
          '7.1 All prices displayed on the App are in Indian Rupees (INR) unless otherwise stated.',
          '7.2 Payments for paid Bookings are processed through a third-party payment gateway (see our Payment Policy). The Company does not store your full card, bank, or UPI credentials.',
          '7.3 By making a payment, you represent that you are authorized to use the selected payment method.',
          '7.4 Full details of payment processing, verification, and failed-transaction handling are set out in our Payment Policy.',
        ]),
      ],
    },
    {
      heading: '8. Fees and Commission',
      blocks: [
        bullets([
          "8.1 The Company charges Organizers a commission and/or flat fee per paid Booking, as configured for that Organizer's account and disclosed to the Organizer within the App prior to Event publication.",
          "8.2 Payment-gateway processing fees, where applicable, are separate from and in addition to the Company's commission.",
        ]),
      ],
    },
    {
      heading: '9. Refunds and Cancellations',
      blocks: [
        p('Refund eligibility, request procedures, and processing timelines are governed by our Refund & Cancellation Policy, which forms part of these Terms.'),
      ],
    },
    {
      heading: '10. User-Generated Content',
      blocks: [
        bullets([
          '10.1 The App allows Users to post reviews, event group-chat messages, and short-form videos ("Shorts").',
          '10.2 You retain ownership of Content you submit, but grant the Company a non-exclusive, worldwide, royalty-free license to host, store, display, and distribute that Content within the App for the purpose of operating the Service.',
          '10.3 You represent that you have the necessary rights to any Content you submit and that it does not infringe any third party\'s rights.',
          '10.4 The Company may review, moderate, or remove Content that violates these Terms or our Community Guidelines, at its discretion and without prior notice.',
        ]),
      ],
    },
    {
      heading: '11. Intellectual Property',
      blocks: [
        bullets([
          '11.1 The App, including its design, logos, trademarks, text, graphics, and underlying software, is the property of the Company or its licensors and is protected by applicable intellectual property laws.',
          "11.2 Nothing in these Terms grants you any right to use the Company's trademarks, logos, or branding without prior written consent.",
          '11.3 Event content and materials uploaded by Organizers remain their property, subject to the license granted under §10.2.',
        ]),
      ],
    },
    {
      heading: '12. Limitation of Liability',
      blocks: [
        bullets([
          '12.1 The App is provided on an "as is" and "as available" basis. To the maximum extent permitted by law, the Company disclaims all warranties, express or implied, regarding the App\'s availability, accuracy, or fitness for a particular purpose.',
          '12.2 The Company is not liable for the conduct, actions, omissions, or content of any Organizer or Participant, or for any loss or damage arising from an Event itself (including cancellation, postponement, or the manner in which it is conducted).',
          "12.3 To the maximum extent permitted by law, the Company's aggregate liability arising out of or relating to your use of the App shall not exceed the total amount of fees actually paid by you to the Company (i.e., the Company's own commission, not the full ticket price paid to an Organizer) in the twelve (12) months preceding the claim.",
          '12.4 Nothing in these Terms limits liability that cannot be excluded or limited under applicable Indian law.',
        ]),
      ],
    },
    {
      heading: '13. Account Suspension and Termination',
      blocks: [
        bullets([
          "13.1 The Company may suspend or terminate (ban) a User's account, with or without prior notice, where it reasonably believes the User has violated these Terms, engaged in fraudulent activity, or posed a risk to other Users or the platform.",
          '13.2 A banned User will be unable to authenticate on the App. Suspension does not, by itself, entitle the User to a refund of any amounts already paid, except as provided under our Refund & Cancellation Policy.',
          '13.3 Users may request deletion of their own account at any time from Settings → Delete Account, as described in our Account Deletion Policy.',
        ]),
      ],
    },
    {
      heading: '14. Indemnification',
      blocks: [
        p('You agree to indemnify and hold harmless the Company, its officers, employees, and affiliates from any claim, liability, damage, or expense (including reasonable legal fees) arising from your violation of these Terms, your Content, or your conduct in connection with an Event.'),
      ],
    },
    {
      heading: '15. Governing Law and Jurisdiction',
      blocks: [
        p(`These Terms are governed by and construed in accordance with the laws of India, without regard to its conflict-of-laws principles. Subject to §16 (Dispute Resolution), the courts at ${JURISDICTION_CITY}, India shall have exclusive jurisdiction over any disputes arising out of or in connection with these Terms.`),
      ],
    },
    {
      heading: '16. Dispute Resolution',
      blocks: [
        bullets([
          '16.1 In the event of any dispute, controversy, or claim arising out of or relating to these Terms, the parties shall first attempt to resolve it amicably through good-faith negotiation, including by contacting our Grievance Officer as described in our Contact & Grievance Policy.',
          `16.2 If a dispute is not resolved within thirty (30) days of being raised, either party may refer it to arbitration under the Arbitration and Conciliation Act, 1996, with a sole arbitrator appointed by mutual agreement, seated in ${JURISDICTION_CITY}, India, and conducted in the English language. The arbitration award shall be final and binding on the parties.`,
          '16.3 Nothing in this section prevents either party from seeking urgent interim relief from a court of competent jurisdiction.',
        ]),
      ],
    },
    {
      heading: '17. Modifications to These Terms',
      blocks: [
        p('We may revise these Terms from time to time. We will update the "Last Updated" date above, and material changes will be notified through the App or via email before taking effect. Continued use of the App after such notice constitutes your acceptance of the revised Terms.'),
      ],
    },
    {
      heading: '18. Severability',
      blocks: [
        p('If any provision of these Terms is held invalid or unenforceable, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.'),
      ],
    },
    {
      heading: '19. Contact Information',
      blocks: [
        bullets([
          `Support Email: ${SUPPORT_EMAIL}`,
          `Postal Address: ${REGISTERED_OFFICE_ADDRESS}`,
        ]),
        p('For grievance-redressal matters, see our Contact & Grievance Policy.'),
      ],
    },
  ],
};

export const refundCancellationDocument: LegalDocument = {
  title: 'Refund & Cancellation Policy',
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: '1. Ticket Cancellations by a Participant',
      blocks: [
        bullets([
          'You may request a refund for a paid Booking from My Bookings → Request Refund, provided the Event has a refund window and your request falls within it. The exact refund window is shown to you at the time of booking.',
          'A refund request is not automatically approved — it is reviewed by the Event\'s Organizer or our team.',
          'Free Bookings can be cancelled directly with no refund process involved, since no payment was collected.',
        ]),
      ],
    },
    {
      heading: '2. Organizer Cancellations',
      blocks: [
        bullets([
          "If an Organizer cancels an Event, all Participants with a Booking are notified by email and push notification.",
          'Participants with a paid Booking for a cancelled Event may request a refund; such requests are treated as automatically eligible for approval, subject to review.',
        ]),
      ],
    },
    {
      heading: '3. Refund Eligibility',
      blocks: [
        bullets([
          'A Booking is eligible for a refund request only if it has a completed payment, has not already been cancelled or refunded, and falls within the refund window (or the Event was cancelled by the Organizer).',
          'Only one refund request may be open per Booking at a time.',
          "Approval or rejection is at the discretion of the Event's Organizer (or our team), based on the circumstances.",
        ]),
      ],
    },
    {
      heading: '4. Refund Processing',
      blocks: [
        bullets([
          'Once approved, a refund is processed back to your original payment method through our payment gateway.',
          "You'll receive a notification at each stage: received, approved/rejected, and processed.",
          "We don't guarantee a fixed processing time for funds to reflect in your account — this depends on your bank/payment provider.",
        ]),
      ],
    },
    {
      heading: '5. Failed Payments',
      blocks: [
        p('If a payment attempt fails, no Booking is confirmed and no amount is held by us. If you believe you were charged for a failed payment, contact us with your payment reference so we can investigate with our payment gateway.'),
      ],
    },
    {
      heading: '6. Chargebacks and Payment Disputes',
      blocks: [
        bullets([
          'If you dispute a charge directly with your bank instead of requesting a refund through the App, we reserve the right to suspend the associated account while the dispute is investigated.',
          'We recommend requesting a refund through the App first — it is typically faster to resolve.',
          'Fraudulent or abusive chargeback activity may result in account suspension under our Terms & Conditions.',
        ]),
      ],
    },
    {
      heading: '7. Organizer Payouts and Refunds',
      blocks: [
        p("If a refund is processed for a Booking whose payout to the Organizer has already been released, we reserve the right to deduct the refunded amount from the Organizer's future payouts."),
      ],
    },
    {
      heading: '8. Contact',
      blocks: [
        bullets([`Support Email: ${SUPPORT_EMAIL}`]),
        p('For anything unresolved through support, see our Contact & Grievance Policy.'),
      ],
    },
  ],
};

export const cookiePolicyDocument: LegalDocument = {
  title: 'Cookie Policy',
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: '1. Mobile App: No Cookies',
      blocks: [
        p('The Eventrix mobile application does not use cookies. Cookies are a browser technology; the App is a native mobile application and does not run inside a web browser.'),
        p('Instead, the App uses on-device secure storage to keep you signed in between sessions. This storage is not shared with, or readable by, any other app on your device, and is cleared when you log out or delete your account.'),
      ],
    },
    {
      heading: '2. Analytics and Tracking',
      blocks: [
        p('The App does not currently use any third-party analytics, advertising, or cross-app tracking technology. If this changes, this Policy will be updated first, and — where required by applicable law — your consent will be obtained before any such technology is activated.'),
      ],
    },
    {
      heading: '3. Push Notifications',
      blocks: [
        p('The App uses a device-specific push notification token (issued by Expo, our push notification provider) to deliver notifications to your device. This is not a cookie and is covered instead by our Privacy Policy §3.2.'),
      ],
    },
    {
      heading: '4. Web-Based Tools',
      blocks: [
        p('Some of our internal, staff-only web-based tools (such as an administrative dashboard) use a strictly necessary session cookie solely to keep an authenticated staff member logged in. This cookie is not used for advertising, tracking, or analytics, is not accessible to App users, and expires when the session ends or the staff member logs out.'),
      ],
    },
    {
      heading: '5. Changes to This Policy',
      blocks: [
        p('If we introduce any cookie or similar tracking technology to an Eventrix-operated web property in the future, we will update this Policy accordingly and provide any consent mechanism required by applicable law.'),
      ],
    },
    {
      heading: '6. Contact',
      blocks: [bullets([`Support Email: ${SUPPORT_EMAIL}`])],
    },
  ],
};

export const communityGuidelinesDocument: LegalDocument = {
  title: 'Community Guidelines',
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: '1. What This Covers',
      blocks: [
        bullets([
          'Reviews — ratings and written feedback you leave on an Event you attended.',
          "Event Chat — messages posted in an Event's group chat.",
          'Shorts — short-form videos and captions you upload, optionally tagged to an Event.',
        ]),
      ],
    },
    {
      heading: '2. Content Standards',
      blocks: [
        p('When posting any content on Eventrix, you agree not to post material that:'),
        bullets([
          'Is defamatory, harassing, threatening, hateful, or discriminatory toward any individual or group;',
          'Is sexually explicit, graphically violent, or otherwise obscene;',
          "Infringes another person's copyright, trademark, or other intellectual property rights;",
          'Impersonates another person or misrepresents your identity or affiliation;',
          "Discloses another person's private information without their consent;",
          'Is spam, unsolicited advertising, or repetitive/irrelevant content;',
          'Promotes illegal activity, or is fraudulent or deceptive (including fake reviews).',
        ]),
      ],
    },
    {
      heading: '3. Copyright Infringement',
      blocks: [
        p('If you believe content posted on Eventrix infringes your copyright, contact us using the details in our Contact & Grievance Policy with a description of the copyrighted work, the location of the allegedly infringing content, and your contact details. We will review and, where appropriate, remove the content.'),
      ],
    },
    {
      heading: '4. Reviews',
      blocks: [
        bullets([
          'Reviews must reflect a genuine experience — you may only review an Event you actually booked or attended.',
          "Reviews found to be fake, incentivized without disclosure, or posted by an Event's own Organizer about their own Event, may be removed.",
        ]),
      ],
    },
    {
      heading: '5. Event Chat',
      blocks: [
        p('Event chat is intended for genuine discussion related to the Event. Off-topic spam, unsolicited promotion, and harassment of other attendees are not permitted.'),
      ],
    },
    {
      heading: '6. Shorts',
      blocks: [
        bullets([
          'Shorts enter a moderation queue and are reviewed before being published. We may flag, remove, or reject a Short that violates these Guidelines.',
          'You must own or have the necessary rights to any video, audio, or other material you upload as a Short.',
        ]),
      ],
    },
    {
      heading: '7. Enforcement',
      blocks: [
        bullets([
          'We may remove content that violates these Guidelines, with or without prior notice.',
          'Repeated or serious violations may result in your account being suspended or banned under our Terms & Conditions §13.',
          'If your content is removed and you believe this was done in error, you may raise this through our Contact & Grievance Policy.',
        ]),
      ],
    },
    {
      heading: '8. Reporting',
      blocks: [
        p('If you encounter content or behavior that violates these Guidelines, please contact us with details (what you saw, where, and when) using our Contact & Grievance Policy.'),
      ],
    },
    {
      heading: '9. Contact',
      blocks: [bullets([`Support Email: ${SUPPORT_EMAIL}`])],
    },
  ],
};

export const dataRetentionDocument: LegalDocument = {
  title: 'Data Retention Policy',
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: '1. Guiding Principle',
      blocks: [
        p('We retain Personal Data only for as long as necessary to provide the App, comply with our legal obligations, resolve disputes, and enforce our agreements — not indefinitely by default.'),
      ],
    },
    {
      heading: '2. What We Retain, and For How Long',
      blocks: [
        bullets([
          'Account/profile data (name, email, phone, DOB, bio, location, profile picture) — retained while your account is active; deleted/inaccessible immediately upon account deletion.',
          'Authentication data (password hash, social sign-in identifiers) — deleted upon account deletion.',
          'Booking and payment records — retained indefinitely for accounting/audit purposes; after account deletion, retained for statutory financial recordkeeping (generally up to 8 years, in line with applicable Indian tax and financial recordkeeping requirements).',
          'Organizer KYC documents — retained while organizer status is active or under review, and for statutory recordkeeping thereafter.',
          'Refund and payout records — retained indefinitely for accounting/audit purposes.',
          'Reviews, chat messages, Shorts — retained until removed by you or an administrator, or your account is deleted, except where retention is needed to preserve another user\'s record.',
          'Audit logs (administrative actions) — retained indefinitely for security and accountability.',
          'One-time passcodes (password reset / email verification) — retained only until used or expired, a short fixed window.',
        ]),
      ],
    },
    {
      heading: '3. Effect of Account Deletion',
      blocks: [
        p('When you delete your account, it is immediately deactivated and can no longer be logged into. Your profile data is no longer accessible or displayed within the App. Certain records — completed booking, payment, refund, and payout records — are retained as required for financial recordkeeping and dispute resolution, even though no longer linked to a usable account.'),
      ],
    },
    {
      heading: '4. Backups',
      blocks: [
        p("Our database infrastructure provider maintains routine backups for disaster-recovery purposes. Data deleted from our live database may persist in backup snapshots for a limited additional period before being permanently purged as those backups age out, consistent with our provider's standard backup rotation."),
      ],
    },
    {
      heading: '5. Deletion Procedures',
      blocks: [
        bullets([
          'Self-service account deletion is a soft-delete: your account row is marked deleted and immediately excluded from all active queries and authentication, but is not instantly and irreversibly purged (this preserves the retained records above and supports fraud/dispute investigation).',
          'Where full erasure of retained data is legally required or requested and no statutory retention obligation applies, we will honor that request — contact us via our Contact & Grievance Policy.',
        ]),
      ],
    },
    {
      heading: '6. Contact',
      blocks: [bullets([`Support Email: ${SUPPORT_EMAIL}`])],
    },
  ],
};

export const securityPolicyDocument: LegalDocument = {
  title: 'Security Policy',
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: '1. Authentication',
      blocks: [
        bullets([
          'Accounts are protected by either a password or a third-party sign-in (Google, Apple, or Facebook). Third-party sign-ins are cryptographically verified against the provider itself.',
          "Sessions use signed, time-limited session tokens, automatically invalidated if the account's password is changed.",
          'A banned or deleted account is rejected on its very next request, even with a previously valid session token.',
        ]),
      ],
    },
    {
      heading: '2. Encryption',
      blocks: [
        bullets([
          'All data in transit between the App and our servers is encrypted using HTTPS/TLS.',
          'Passwords are never stored in plain text — they are hashed using the industry-standard bcrypt algorithm.',
          'One-time passcodes are stored as one-way cryptographic hashes and expire automatically after a short, fixed window.',
        ]),
      ],
    },
    {
      heading: '3. Password Security',
      blocks: [
        bullets([
          'Passwords must be a minimum of 8 characters.',
          "We never send you your password by email or display it after creation — resetting via the OTP-based flow is the only recovery path.",
        ]),
      ],
    },
    {
      heading: '4. Payment Security',
      blocks: [
        p("We do not process or store your full card, bank, or UPI credentials on our servers. Payments are handled directly by our payment gateway's own secure, PCI-DSS-compliant infrastructure. See our Payment Policy for details."),
      ],
    },
    {
      heading: '5. Access Controls',
      blocks: [
        bullets([
          'The App enforces role-based access control (Participant, Organizer, Administrator) — each role can only access data and actions appropriate to it.',
          'Organizer KYC documents are stored in a private storage location that is never publicly accessible, viewable only via short-lived, time-limited access links for authorized administrative review.',
          'Administrative actions (approvals, rejections, bans, refund decisions) are logged in an internal audit trail.',
        ]),
      ],
    },
    {
      heading: '6. Abuse Prevention',
      blocks: [
        p('Authentication and other sensitive endpoints are rate-limited to reduce the risk of automated credential-stuffing or brute-force attacks.'),
      ],
    },
    {
      heading: '7. Incident Response',
      blocks: [
        bullets([
          'If we become aware of a security incident affecting your Personal Data, we will investigate, contain, and remediate it, and notify affected users and, where legally required, the relevant regulatory authority, without undue delay.',
          'If you discover a security vulnerability in the App, please report it responsibly rather than disclosing it publicly.',
        ]),
      ],
    },
    {
      heading: '8. Contact',
      blocks: [
        bullets([`Support Email: ${SUPPORT_EMAIL}`]),
        p('For a security vulnerability report, please mark your message accordingly so it can be prioritized.'),
      ],
    },
  ],
};

export const paymentPolicyDocument: LegalDocument = {
  title: 'Payment Policy',
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: '1. Payment Methods',
      blocks: [
        p('Paid Bookings are designed to be paid for using the methods our payment gateway supports for Indian transactions — typically cards, UPI, net banking, and popular wallets. All prices are in Indian Rupees (INR).'),
      ],
    },
    {
      heading: '2. Razorpay Processing',
      blocks: [
        bullets([
          'Payments are processed through Razorpay, an RBI-regulated payment aggregator, or another payment gateway we may engage from time to time.',
          "When you pay for a Booking, you're redirected to the payment gateway's own secure checkout — you enter payment details there, not into the Eventrix app or its servers.",
          'Once the gateway confirms a payment, it notifies our backend, which confirms your Booking. Duplicate notifications for the same payment event are automatically deduplicated.',
        ]),
      ],
    },
    {
      heading: '3. What Payment Information Is NOT Stored',
      blocks: [
        p('We do not store, and our servers never receive: your full card number, CVV, or expiry date; your bank account number or net banking credentials; or your UPI PIN.'),
        p('We store only the payment amount, currency (INR), payment status, and a gateway-issued reference/transaction ID used to reconcile your Booking. This reference ID cannot be used to charge you or access your payment method.'),
      ],
    },
    {
      heading: '4. Payment Verification',
      blocks: [
        bullets([
          'A Booking is only confirmed once the payment gateway has confirmed a successful payment.',
          'If a payment confirmation arrives for a Booking already cancelled or refunded, the payment is still recorded for accounting purposes, but the Booking is not silently reopened.',
        ]),
      ],
    },
    {
      heading: '5. Refunds',
      blocks: [
        p('Refund eligibility, the request process, and processing timelines are governed by our Refund & Cancellation Policy. Approved refunds are issued back to your original payment method through the payment gateway.'),
      ],
    },
    {
      heading: '6. Failed Transactions',
      blocks: [
        bullets([
          'If a payment fails or is not completed, no Booking is confirmed. You may retry the payment.',
          "If an amount appears debited for a failed payment, this typically reflects a temporary hold by your bank rather than funds we've received, usually reversed automatically within a few business days. If it persists, contact us with your payment reference.",
        ]),
      ],
    },
    {
      heading: '7. Organizer Payouts',
      blocks: [
        p('Organizers receive payouts to their registered UPI ID after deduction of the applicable platform commission and gateway processing fees, released a short period after the relevant Event concludes. See also our Terms & Conditions §5.5 and §8.'),
      ],
    },
    {
      heading: '8. Status of Live Payment Processing',
      blocks: [
        p("Automated, fully live payment-gateway processing is in the process of being finalized for the App. We will not enable paid ticket collection for a given payment method until the corresponding gateway integration is live and secure. This Policy will be kept accurate and up to date as functionality is activated."),
      ],
    },
    {
      heading: '9. Contact',
      blocks: [
        bullets([`Support Email: ${SUPPORT_EMAIL}`]),
        p('For payment disputes and chargebacks, see our Refund & Cancellation Policy §6.'),
      ],
    },
  ],
};

export const accountDeletionDocument: LegalDocument = {
  title: 'Account Deletion Policy',
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: '1. How to Request Deletion',
      blocks: [
        bullets([
          'In-app (self-service): open the App, go to Settings → Delete Account, and confirm. This takes effect immediately.',
          `By contacting us: if you're unable to access the App, email us at ${SUPPORT_EMAIL} from your registered email address so we can verify the request is genuinely yours.`,
        ]),
      ],
    },
    {
      heading: '2. What Happens Immediately',
      blocks: [
        bullets([
          "Your account is deactivated the moment deletion is confirmed. You're signed out, and the account can no longer log in — including with any session token issued before deletion, rejected on its very next use.",
          'Your profile is no longer visible or accessible within the App to you or to other users.',
          "Your device's push notification registration for that account is cleared.",
        ]),
      ],
    },
    {
      heading: '3. What Is Deleted vs. Retained',
      blocks: [
        bullets([
          'Deleted/made inaccessible: your profile information (name, email, phone, date of birth, bio, location, profile picture), organizer profile (if any), notification preferences, and interests.',
          'Retained where legally required: completed booking, payment, refund, and payout records (statutory financial recordkeeping), and administrative audit log entries. These remain but are no longer linked to a usable, logged-in account.',
          "Reviews, chat messages, or Shorts may be removed or de-identified, except where retaining them is necessary to preserve another user's booking or event record.",
        ]),
      ],
    },
    {
      heading: '4. Timeline',
      blocks: [
        bullets([
          'Access is revoked immediately upon deletion.',
          "Underlying database records are soft-deleted immediately and excluded from active use; residual copies in routine backups age out and are purged on our infrastructure provider's normal backup rotation.",
        ]),
      ],
    },
    {
      heading: '5. Reversing a Deletion',
      blocks: [
        p('Account deletion is intended to be permanent. If you change your mind shortly after deleting your account, contact us promptly — we cannot guarantee recovery, but will make a reasonable effort if the request comes in quickly.'),
      ],
    },
    {
      heading: '6. Contact',
      blocks: [
        bullets([`Support Email: ${SUPPORT_EMAIL}`]),
        p('For anything unresolved through support, see our Contact & Grievance Policy.'),
      ],
    },
  ],
};

export const contactGrievanceDocument: LegalDocument = {
  title: 'Contact & Grievance Policy',
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: '1. General Support',
      blocks: [
        p('For general questions, account help, or feedback, contact us at:'),
        bullets([
          `Email: ${SUPPORT_EMAIL}`,
          `Phone: ${SUPPORT_PHONE}`,
          'In-app: Settings → Help & Support, which also lists answers to common questions.',
        ]),
        p('We aim to respond to general support queries within a reasonable time, though response times may vary with volume.'),
      ],
    },
    {
      heading: '2. Grievance Officer',
      blocks: [
        p('In accordance with Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and consistent with the grievance-redressal expectations of the Digital Personal Data Protection Act, 2023, we have designated a Grievance Officer to address complaints regarding this App, its Content, or the handling of your Personal Data.'),
        bullets([
          `Name: ${GRIEVANCE_OFFICER_NAME}`,
          `Email: ${GRIEVANCE_OFFICER_EMAIL}`,
          `Postal Address: ${REGISTERED_OFFICE_ADDRESS}`,
        ]),
        p('What you can raise with the Grievance Officer:'),
        bullets([
          'A complaint about content posted by another user (see our Community Guidelines).',
          'A concern about how your Personal Data has been collected, used, or shared.',
          "A request to exercise a right described in our Privacy Policy (access, correction, deletion) that hasn't been resolved through normal in-app means.",
          "A dispute regarding a Booking, refund, or payment that hasn't been resolved through general support.",
        ]),
        p(`Response timelines: complaints are acknowledged within ${GRIEVANCE_ACK_SLA_HOURS} hours of receipt, and resolved within ${GRIEVANCE_RESOLUTION_SLA_DAYS} days, in line with the timelines prescribed under the IT Rules, 2021. Complex matters (e.g., involving a third-party payment gateway investigation) may take longer to fully resolve, but you will receive a status update within this window regardless.`),
      ],
    },
    {
      heading: '3. Escalation',
      blocks: [
        p('If a grievance is not resolved to your satisfaction through the Grievance Officer, our formal dispute resolution process (negotiation, then arbitration) is set out in our Terms & Conditions §16.'),
      ],
    },
    {
      heading: '4. Reporting Content or Abuse',
      blocks: [
        p('To report content that violates our Community Guidelines, or to report suspicious/abusive account activity, use the contact details above and describe what you observed, including where and when.'),
      ],
    },
    {
      heading: '5. Security Vulnerability Reports',
      blocks: [
        p('To report a security vulnerability, see our Security Policy §8.'),
      ],
    },
  ],
};
