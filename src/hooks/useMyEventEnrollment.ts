import { EnrollmentRecord, useGetMyEnrollmentsQuery } from '../store/services/eventsApi';

// Single place that answers "does the current user already have a live booking for this
// event" — used by EventDetailsScreen (footer CTA), CheckoutScreen (resume-payment mode),
// and BookingsScreen (tap-to-pay on an Unpaid card) so the three screens can't drift on what
// counts as "active" the way three separate inline `.find()`s eventually would.
export function useMyEventEnrollment(eventId: string | undefined, options?: { skip?: boolean }) {
  const { data: myEnrollments = [] } = useGetMyEnrollmentsQuery(undefined, { skip: options?.skip || !eventId });

  const activeEnrollment: EnrollmentRecord | undefined = eventId
    ? myEnrollments.find((e) => e.eventId === eventId && e.status !== 'cancelled' && e.status !== 'refunded')
    : undefined;

  // Preserves EventDetailsScreen's original formula exactly (a free, ₹0 enrollment reads as
  // "not paid" here too, by design — it never had a payment to view/receipt for via this
  // flag, see the pre-existing footer behavior this hook replaces). Do not use this alone to
  // decide whether a real payment is outstanding — use `needsPayment` for that.
  const isPaid =
    !!activeEnrollment && Number(activeEnrollment.totalAmount) > 0 && activeEnrollment.paymentStatus === 'paid';

  // The actual "does this booking have a real, unpaid charge" signal — true only for a
  // genuinely priced ticket whose payment hasn't gone through yet. Unlike `isPaid` above,
  // this is false (not true) for free events, since there's nothing to pay/resume for them.
  const needsPayment =
    !!activeEnrollment && Number(activeEnrollment.totalAmount) > 0 && activeEnrollment.paymentStatus !== 'paid';

  return { activeEnrollment, isPaid, needsPayment };
}
