# Eventrix — Consolidated Change Prompt for Coding Agent

## How to use this document
This covers every change decided on today, in priority order. **Razorpay/commission
integration is explicitly deferred** — do not build or modify payment logic beyond what
already exists as a skeleton, unless a section below says otherwise.

For every section: run the stated audit steps FIRST and report findings before writing
any code. Do not assume a table, column, or endpoint is missing or present — verify by
reading the actual entity files, migrations, and controllers. If something described as
"new" already exists in some partial form, report it and adapt rather than duplicating it.

Work through sections in order. Do not start Section 2 until Section 1's acceptance
criteria are met, and so on — each section assumes the previous one is functioning.

---

## SECTION 0 — Global pre-flight audit (do this once, before Section 1)

Inspect and report on:
1. Does `user_interests` table/entity exist?
2. Does `users` table have a `notification_prefs` (or similarly named) column?
3. Do these routes exist in any form, even partial: `PUT /users/me/interests`,
   `PATCH /users/me/location`, `PATCH /users/me/notification-preferences`?
4. Does a `GET /categories` endpoint exist?
5. Does `events` table have `approval_status`, `approval_method`, `is_paid`,
   `refund_policy` columns? Which of these already exist vs. need adding?
6. Does `enrollments` table have a ticket code / QR-related column?
7. What does `EventDetailsScreen.tsx` currently render — is there already any
   organizer-only conditional UI, even partial?
8. Confirm current tab structure in `MainNavigator.tsx`.

Report all findings before proceeding to Section 1.

---

## SECTION 1 — Onboarding data sync fix (PRIORITY 1)

### Problem
`InterestSelectionScreen`, `LocationAccessScreen`, and `NotificationPreferencesScreen`
are currently static UI with no logic — no selection state, no permission requests, no
data capture. These screens run during onboarding, BEFORE the user has a JWT
(Register/Login happens after them in the flow). Data must be cached locally, then
synced to the backend in one batch immediately after Register/Login succeeds.

### 1a. Local draft cache
Create `src/store/slices/onboardingDraftSlice.ts`:
```typescript
interface OnboardingDraftState {
  role: 'participant' | 'organizer' | null;
  categoryIds: string[];
  latitude: number | null;
  longitude: number | null;
  manualCity: string | null;
  notificationPrefs: {
    eventReminders: boolean;
    nearbyEvents: boolean;
    reelsAndCommunity: boolean;
    specialOffers: boolean;
  } | null;
  isSynced: boolean;
}
```
Reducers: `setRole`, `setInterests`, `setLocation`, `setManualCity`,
`setNotificationPrefs`, `markSynced`, `resetDraft`.

Install/configure `redux-persist` for this slice (check package.json first). Required
because the app can be killed mid-onboarding and must resume without data loss.

### 1b. Build real logic into each screen

**InterestSelectionScreen.tsx**
- Fetch categories via `GET /categories` (create minimal `categoriesApi` via RTK Query
  if it doesn't exist)
- Render as selectable chips; track selection in local component state, commit to Redux
  only on "Save and Continue" (don't dispatch on every tap)
- Enforce **minimum 3 selections** — disable "Save and Continue" until
  `selectedIds.length >= 3`, show hint text below threshold
- On continue: `dispatch(setInterests(selectedIds))`, navigate to LocationAccess
- Handle loading/error/empty states for the categories fetch — skeleton loader + retry
  button, never a blank stuck screen

**LocationAccessScreen.tsx**
- "Allow Location Access" → `Location.requestForegroundPermissionsAsync()`
  (expo-location)
- Granted → `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })`
  → `dispatch(setLocation({ latitude, longitude }))`
- Denied → reveal manual city entry fallback (text input + button)
- Manual city path needs geocoding to lat/lng before storing. Check for an existing
  Google Maps/Geocoding API key in the project (react-native-maps is already a
  dependency, may share a Google Cloud project). If none exists, use OpenStreetMap
  Nominatim as a free fallback (note in a code comment: usage policy requires
  attribution, has rate limits)
- On successful geocode: `dispatch(setManualCity(cityName))` AND
  `dispatch(setLocation({ latitude, longitude }))`
- If both permission denied AND manual entry skipped: allow "Continue" anyway with
  lat/lng left null. Do not block onboarding on location — the separately-implemented
  live-location-on-launch feature will backfill this on first real app use.
- Navigate to NotificationPreferences on continue

**NotificationPreferencesScreen.tsx**
- Wire the 4 existing toggle UI elements to local component state (default all `true`)
- On "Continue →": `dispatch(setNotificationPrefs({ eventReminders, nearbyEvents,
  reelsAndCommunity, specialOffers }))`, navigate to Login

### 1c. Backend — confirm/build endpoints (only build what Section 0 audit found missing)
- `PUT /users/me/interests` — body `{ categoryIds: string[] }`, writes to
  `user_interests` join table (create entity/migration if missing)
- `PATCH /users/me/location` — body `{ latitude: number, longitude: number }`
- `PATCH /users/me/notification-preferences` — if `notification_prefs` column doesn't
  exist, add as jsonb on `users`: default
  `'{"eventReminders": true, "nearbyEvents": true, "reelsAndCommunity": true,
  "specialOffers": true}'`. Create migration, entity column, DTO, controller route.
- **`UpdateInterestsDto`** must use `@ArrayMinSize(3)` (not 1) to match the UI's
  enforced minimum.

### 1d. Sync function
Create `src/utils/syncOnboardingDraft.ts`:
```typescript
export async function syncOnboardingDraft(dispatch: AppDispatch, getState: () => RootState) {
  const draft = getState().onboardingDraft;
  if (draft.isSynced) return; // idempotency guard

  const results = await Promise.allSettled([
    draft.categoryIds.length > 0
      ? api.updateInterests({ categoryIds: draft.categoryIds }).unwrap()
      : Promise.resolve(),
    (draft.latitude !== null && draft.longitude !== null)
      ? api.updateLocation({ latitude: draft.latitude, longitude: draft.longitude }).unwrap()
      : Promise.resolve(),
    draft.notificationPrefs
      ? api.updateNotificationPreferences(draft.notificationPrefs).unwrap()
      : Promise.resolve(),
  ]);

  if (results.every(r => r.status === 'fulfilled')) {
    dispatch(markSynced());
    dispatch(resetDraft());
  } else {
    console.warn('Onboarding sync partially failed', results);
    // leave isSynced=false so foreground retry picks it up
  }
}
```
Use `Promise.allSettled`, not `Promise.all` — one field failing (e.g. no location
captured) must not block the other two.

### 1e. Call sites
- Register success handler: after JWT stored in `authSlice`, call
  `syncOnboardingDraft(dispatch, getState)`. Don't await before navigating to Main —
  fire it, navigate immediately.
- Login success handler: same call (covers "onboarded as guest, registers/logs in for
  real later" path).
- Add retry on app foreground: if `isAuthenticated && !draft.isSynced`, retry sync (hook
  into the same `AppState` listener pattern used for live location fetching if it
  already exists).

### Edge cases
1. App killed mid-onboarding → redux-persist restores draft on relaunch, no data loss
2. Guest mode then real Register/Login days later → draft still syncs then, if
   `isSynced` is still false
3. Fresh install / second device login → empty local draft must NOT overwrite existing
   server-side data — only call update endpoints if draft has non-null values
4. Location denied + manual entry skipped → skip the location sync call entirely, don't
   send null/0,0
5. Categories fetch fails → retry option, never a stuck blank screen

### Acceptance criteria
- [ ] Killing app mid-onboarding and relaunching resumes without data loss
- [ ] Post-Register, `GET /users/me` (or equivalent) reflects selected interests
- [ ] Post-Register, user location reflects onboarding selection (GPS or geocoded city)
- [ ] Sync failure (e.g. airplane mode) doesn't block navigation to Main; retries on
      next foreground once connectivity returns
- [ ] Re-login on already-synced account doesn't fire duplicate/overwriting syncs
- [ ] InterestSelection blocks proceeding below 3 selections; backend rejects <3 too

---

## SECTION 2 — Organizer mobile flow (PRIORITY 2)

### Decision context
Organizers get full event creation/management on mobile, not just the web console.

### 2a. Tab bar — conditional by role
Swap `Shorts` tab → `MyEvents` tab for organizers (keeps tab count at 4 for both roles;
Shorts is still an unbuilt stub so this costs nothing already planned):
```typescript
// MainNavigator.tsx
const role = useSelector((state: RootState) => state.auth.user?.role);
const tabs = role === 'organizer' ? ORGANIZER_TABS : PARTICIPANT_TABS;
// ORGANIZER_TABS: Home, Explore, MyEvents, Bookings
// PARTICIPANT_TABS: Home, Explore, Shorts, Bookings
```

### 2b. New screen — `MyEventsScreen.tsx`
List organizer's own events, filterable by status tabs: All / Draft / Pending /
Approved / Rejected. Each card shows title, status badge, date, ticket count
(`total_capacity - available_tickets` sold). Include a `[+ Create]` action in the
header.

### 2c. New screen — `CreateEventScreen.tsx`
Single form: title, description, category (dropdown from `GET /categories`), venue name
+ address, date/time, duration, capacity, price per ticket OR free toggle, is_online +
meeting link, cover image.

Two exit actions:
- **Save as Draft** → `POST /events` with `approvalStatus: 'draft'`
- **Publish/Submit** → see Section 3 for the free-vs-paid branching logic that
  determines whether this results in `approved` or `pending_approval`

Route params: `{ eventId?: string }` — omitted for create, present for edit (editing a
draft/rejected event reuses this screen, pre-filled, hitting `PATCH /events/:id`
instead of `POST /events`).

### 2d. `EventDetailsScreen.tsx` — add conditional UI
When `currentUser.id === event.organizerId`, show additional UI:
- `rejected` → red banner with `rejection_reason` + "Edit & Resubmit" button
- `draft` → "Edit" + "Submit for Approval"/"Publish" buttons (per Section 3 logic)
- `pending_approval` / `approved` → read-only view + ticket sales count

Extend the existing screen with conditional blocks — do not fork it into a separate
organizer-only screen.

### 2e. Backend — new endpoint for organizer's ticket-sales visibility
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('organizer', 'admin')
@Get('events/:id/enrollments')
getEventEnrollments(@Param('id') eventId: string, @CurrentUser() user) {
  // MUST verify user.id === event.organizerId unless user.role === 'admin'
  // throw ForbiddenException if organizer requests an event they don't own
  return this.enrollmentsService.findByEvent(eventId, user);
}
```

### 2f. Backend — image upload via Supabase Storage
`CreateEventScreen` needs a cover image; `events.image_url`/`cover_image_url` columns
already exist but no upload path does. Implement presigned-URL pattern:
1. Mobile requests a signed upload URL: `POST /events/upload-url` (returns a
   Supabase Storage signed URL + path)
2. Mobile uploads the image file directly to that signed URL (not through your API)
3. Mobile sends the resulting public URL back as part of the event creation/update
   payload

### Acceptance criteria
- [ ] Organizer sees MyEvents tab instead of Shorts; participant sees Shorts
- [ ] Organizer can create a draft, edit it, and submit it
- [ ] Rejected events show reason and allow edit+resubmit
- [ ] Organizer cannot view another organizer's `/events/:id/enrollments` (403)
- [ ] Cover image upload works end-to-end and persists on the event record

---

## SECTION 3 — Approval workflow: free auto-publish, paid stays gated (PRIORITY 2,
build alongside Section 2)

### Decision
Free events publish instantly with no admin review. Paid events still require admin
approval before becoming bookable, because real money is at risk on unvetted listings.

### 3a. Schema
```sql
ALTER TABLE events ADD COLUMN approval_method VARCHAR(20) DEFAULT NULL;
-- values: 'manual' | 'auto' | NULL (null while still pending)
```
This keeps the audit trail honest — distinguishes "admin approved" from "system
auto-approved" in later reporting.

### 3b. Create logic
```typescript
// events.service.ts — create()
async create(dto: CreateEventDto, organizerId: string) {
  const status = dto.isPaid
    ? EventApprovalStatus.PENDING_APPROVAL
    : EventApprovalStatus.APPROVED;

  const event = this.eventRepo.create({
    ...dto,
    organizerId,
    approvalStatus: status,
    approvalMethod: status === EventApprovalStatus.APPROVED ? 'auto' : null,
    approvedAt: status === EventApprovalStatus.APPROVED ? new Date() : null,
  });

  return this.eventRepo.save(event);
}
```
`is_bookable` generated column logic (`status = 'approved'`) needs no change — free
events now hit `approved` immediately, so bookability follows automatically.

### 3c. Close the free→paid loophole
An organizer could list a free event (auto-published, builds an audience), then edit it
to paid afterward — bypassing review entirely. Prevent this:
```typescript
// events.service.ts — update()
async update(id: string, dto: UpdateEventDto) {
  const event = await this.eventRepo.findOneOrFail({ where: { id } });

  const switchingToPaid = !event.isPaid && dto.isPaid === true;
  if (switchingToPaid) {
    dto.approvalStatus = EventApprovalStatus.PENDING_APPROVAL;
    dto.approvalMethod = null;
  }

  await this.eventRepo.update(id, dto);
  return this.eventRepo.findOneOrFail({ where: { id } });
}
```

### 3d. Mobile UI copy
On `CreateEventScreen`, button label depends on the paid toggle state:
- Free event → "Publish Event" (implies immediate)
- Paid event → "Submit for Approval" (implies review wait)
Do not show one static button label regardless of paid/free — organizers submitting a
free event should not be told to expect a pending state that never arrives.

### 3e. Admin dashboard — no query change needed
The approval queue (`WHERE approval_status = 'pending_approval'`) now naturally only
ever contains paid events. Confirm this is already how the query is written; if it
filters some other way, correct it.

### Acceptance criteria
- [ ] Creating a free event results in `approved`/bookable immediately, no admin action
- [ ] Creating a paid event results in `pending_approval`, invisible-to-book until admin
      approves
- [ ] Editing an approved free event to paid forces it back to `pending_approval`
- [ ] Admin approval queue contains only paid, pending events

---

## SECTION 4 — QR ticket generation + check-in (PRIORITY 3)

### 4a. Schema
Add to `enrollments`:
```sql
ALTER TABLE enrollments ADD COLUMN ticket_code VARCHAR(255) UNIQUE;
```
Generate as a signed token (JWT encoding `{ enrollmentId, eventId }`, signed with a
server secret) rather than a raw UUID — this lets the scan endpoint verify authenticity
without a database round-trip before the actual check-in write, and prevents someone
forging a valid-looking ticket code.

### 4b. Generate ticket on confirmation
Whenever an enrollment transitions to `status: 'confirmed'` (immediately for free
events; after payment webhook confirms for paid events, once Razorpay resumes), generate
and store `ticket_code`.

### 4c. Backend — check-in endpoint
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('organizer', 'admin')
@Post('enrollments/check-in')
async checkIn(@Body() dto: { ticketCode: string }, @CurrentUser() user) {
  const payload = this.verifyTicketToken(dto.ticketCode); // throws on invalid/forged
  const enrollment = await this.enrollmentsService.findOne(payload.enrollmentId);

  // verify the organizer checking in owns this event, unless admin
  if (user.role === 'organizer' && enrollment.event.organizerId !== user.id) {
    throw new ForbiddenException();
  }
  if (enrollment.checkedInAt) {
    throw new ConflictException('Already checked in'); // idempotency guard
  }

  enrollment.checkedInAt = new Date();
  return this.enrollmentsService.save(enrollment);
}
```

### 4d. Mobile — organizer check-in screen
Two input methods, not just one:
- **QR scanner** (primary) — use `expo-camera` or `expo-barcode-scanner`, scan → call
  check-in endpoint → show success/already-checked-in/invalid states clearly
- **Search-by-name fallback** (secondary, but required) — a simple searchable list of
  the event's confirmed enrollments, with a manual "Check In" button per row. This
  covers the real-world case of a dead phone or lost ticket at the door; do not ship
  QR-only.

### 4e. Mobile — participant ticket display
`TicketDetailsScreen` renders the QR code from `ticket_code` (use `react-native-qrcode-svg`
or similar — check if a QR rendering library is already a dependency before adding a
new one).

### Acceptance criteria
- [ ] Confirmed enrollment has a signed, unique `ticket_code`
- [ ] Scanning a valid ticket checks it in exactly once; scanning again shows "already
      checked in," not a silent duplicate write
- [ ] Organizer cannot check in tickets for an event they don't own
- [ ] Search-by-name check-in works as a fallback to QR scanning
- [ ] Forged/tampered ticket codes are rejected, not silently accepted

---

## SECTION 5 — Small fixes (do alongside whichever section touches the same files;
not a separate scheduled block)

1. **Guest mode guardrails** — "Continue as Guest" currently drops into Main with no
   auth. Any protected action (booking, Saved Events, Notifications) tapped as a guest
   must show an inline "Login to continue" prompt / redirect to Login, not fail
   silently or crash on a missing JWT.
2. **`bookingId` vs `enrollmentId` naming** — `TicketDetailsScreen` route param is
   `{ bookingId }` while the backend entity is `Enrollment`/`enrollmentId`. Whoever
   wires this screen to the API must explicitly map `enrollmentId → bookingId`, not
   assume the names are interchangeable in a request payload.

### Acceptance criteria
- [ ] Guest tapping a protected action is redirected to Login, not met with a broken
      screen or crash
- [ ] `TicketDetailsScreen` correctly resolves data using the right field name against
      the actual API contract

---

## SECTION 6 — Trust/UX schema prep (schema + display only — full logic waits on
Razorpay resuming; see note at end)

### 6a. Refund/cancellation policy field
```sql
ALTER TABLE events ADD COLUMN refund_policy_type VARCHAR(30) DEFAULT 'no_refunds';
-- values: 'no_refunds' | 'refundable_until_event' | 'custom'
ALTER TABLE events ADD COLUMN refund_policy_text TEXT;
```
Add to `CreateEventScreen` as a required field (dropdown + optional text for `custom`).
Display on `EventDetailsScreen` before the booking button, so participants see the
policy before they pay — do not bury it post-purchase.

### 6b. Fee transparency display prep
On `CheckoutScreen`, prepare the UI to show a line-item breakdown (ticket price +
platform fee = total) rather than one opaque total, even though the actual commission
calculation logic depends on Razorpay resuming. Build the UI layout now using
placeholder/mock commission values so it's ready to wire to real data later without a
UI rebuild.

### Acceptance criteria
- [ ] Organizer must select a refund policy when creating a paid event
- [ ] Refund policy displays on EventDetailsScreen before checkout
- [ ] Checkout UI has a line-item breakdown layout ready, even if using placeholder
      commission values for now

---

## EXPLICITLY DEFERRED — do not build

- Razorpay Route linked-account transfers, KYC-dependent payout logic
- Automatic refund-on-cancellation trigger (depends on Razorpay being live)
- Real commission calculation in the Section 6b checkout breakdown
- Follow-organizer notifications, post-event feedback surveys, multi-tier ticketing,
  team members per organizer account, recurring events, promo codes — all confirmed as
  v1.1+ roadmap, not current scope

Do not implement any of the above even if related code is encountered while working
through Sections 1-6. Leave clearly marked TODO comments instead if a natural
integration point is found (e.g. in the checkout flow) rather than building the feature
itself.

---

## Final checklist before marking this work complete
- [ ] Section 0 audit findings were reported before any code was written
- [ ] All sections' acceptance criteria pass
- [ ] No payment/commission logic was implemented beyond existing skeleton
- [ ] All new migrations are reversible (down() methods implemented, not left empty)
- [ ] No duplicate tables/columns/endpoints were created where partial versions already
      existed
