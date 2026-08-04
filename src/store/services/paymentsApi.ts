import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';
import { eventsApi } from './eventsApi';

export interface FeeBreakdown {
  ticketPrice: number;
  feePayer: 'organizer' | 'participant';
  platformCommissionAmount: number;
  gatewayFeeAmount: number;
  buyerPrice: number;
  // What the organizer receives per ticket, net of commission + gateway fee — the number
  // the Create Event flow's live payout preview surfaces per tier.
  organizerPayout: number;
}

export type RefundStatus = 'requested' | 'approved' | 'rejected' | 'processed' | 'failed';

export interface RefundRecord {
  id: string;
  enrollmentId: string;
  requestedBy: string;
  reason?: string;
  status: RefundStatus;
  amount: number;
  gatewayRefundId?: string;
  requestedAt: string;
  processedAt?: string;
  // Eager-loaded on GET /payments/refunds/pending only (see PaymentsService.
  // findPendingRefundsForOrganizer / REFUND_SAFE_ENROLLMENT_SELECT) so the approval
  // screen can show what it's approving without a second round-trip.
  enrollment?: {
    id: string;
    bookingReference: string;
    quantity: number;
    totalAmount: number;
    event?: { id: string; title: string; eventDate: string; startTime: string; coverImageUrl?: string };
    user?: { id: string; email: string; fullName: string };
  };
}

export interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentResult {
  id: string;
  status: string;
}

export interface PayUOrderResult {
  txnid: string;
  amount: number;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  key: string;
  hash: string;
  actionUrl: string;
}

// Native SDK's own camelCase field naming — deliberately distinct from PayUOrderResult
// above (the WebView flow's lowercase fields), confirmed by reading payu-non-seam-less-react's
// native source directly. No pre-computed hash: the SDK asks for one on demand.
export interface PayUNativeOrderResult {
  key: string;
  transactionId: string;
  amount: number;
  productInfo: string;
  firstName: string;
  email: string;
  phone: string;
  environment: '0' | '1';
}

// Accepts either the original bare ticketPrice (organizer-side live payout preview, which
// never needed feePayer since it's always previewing the organizer's own default) or the
// richer shape Checkout needs to preview the exact buyer-facing total for a specific event's
// feePayer before enroll() computes the real one — kept as a union instead of a breaking
// signature change so TicketTypeEditor/ManageTicketTypesScreen's existing calls don't move.
export type FeeEstimateArg = number | { ticketPrice: number; feePayer?: 'organizer' | 'participant'; organizerId?: string };

export const paymentsApi = createApi({
  reducerPath: 'paymentsApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['PendingRefunds'],
  endpoints: (builder) => ({
    getFeeEstimate: builder.query<FeeBreakdown, FeeEstimateArg>({
      query: (arg) => {
        const { ticketPrice, feePayer, organizerId } = typeof arg === 'number' ? { ticketPrice: arg } : arg;
        const params = new URLSearchParams({ ticketPrice: String(ticketPrice) });
        if (feePayer) params.set('feePayer', feePayer);
        if (organizerId) params.set('organizerId', organizerId);
        return `payments/fee-estimate?${params.toString()}`;
      },
    }),
    // Real-money checkout: create the Razorpay order for an already-created (pending-payment)
    // enrollment, then verify() below after the checkout sheet reports success. See
    // PaymentsService.createOrder/verifyPayment — both already exist and are tested server-side,
    // this was simply never called from the app before CheckoutScreen wired it up.
    createOrder: builder.mutation<CreateOrderResult, { enrollmentId: string }>({
      query: (body) => ({ url: 'payments/create-order', method: 'POST', body }),
    }),
    verifyPayment: builder.mutation<
      VerifyPaymentResult,
      { enrollmentId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }
    >({
      query: (body) => ({ url: 'payments/verify', method: 'POST', body }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          await queryFulfilled;
          dispatch(eventsApi.util.invalidateTags(['MyEnrollments']));
        } catch {
          // Verification failed client-side — the async webhook is the durable confirmation
          // path and will resolve this independently, so nothing to invalidate yet.
        }
      },
    }),
    // Active gateway checkout: mints a PayU txnid+hash for an already-created (pending-
    // payment) enrollment. Unlike Razorpay's createOrder/verifyPayment pair above (kept but
    // now dormant), there's no separate client-driven verify step — PayU's surl/furl callback
    // is handled entirely server-side (see PaymentsController.handlePayUReturn) before the
    // WebView ever reaches a page reporting success, so by the time PayUCheckoutModal's
    // onSuccess fires, the enrollment is already confirmed — just refetch MyEnrollments.
    initiatePayUOrder: builder.mutation<PayUOrderResult, { enrollmentId: string }>({
      query: (body) => ({ url: 'payments/payu/initiate', method: 'POST', body }),
    }),
    // Native SDK checkout (payu-non-seam-less-react, see Frontend/src/services/
    // payuNativeService.ts) — same enrollment validation as initiatePayUOrder above, but no
    // pre-computed hash, since the SDK requests hashes on demand via signPayUHash below.
    initiatePayUNativeOrder: builder.mutation<PayUNativeOrderResult, { enrollmentId: string }>({
      query: (body) => ({ url: 'payments/payu/initiate-native', method: 'POST', body }),
    }),
    // Called from the native SDK's generateHash event handler — the salt must never reach
    // the client, so every hash the SDK asks for mid-checkout is signed here instead.
    signPayUHash: builder.mutation<{ hash: string }, { hashString: string }>({
      query: (body) => ({ url: 'payments/payu/sign-hash', method: 'POST', body }),
    }),
    // Called once the native SDK's onPaymentSuccess/onPaymentFailure fires directly in the
    // app — unlike the WebView flow's server-side-only confirmation, this is a normal
    // authenticated call the app makes itself with whatever payuResponse fields it parsed.
    verifyPayUNative: builder.mutation<
      { success: boolean },
      { txnid: string; mihpayid: string; status: 'success' | 'failure'; amount: string; productinfo: string; firstname: string; email: string; hash: string }
    >({
      query: (body) => ({ url: 'payments/payu/verify-native', method: 'POST', body }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          await queryFulfilled;
          dispatch(eventsApi.util.invalidateTags(['MyEnrollments']));
        } catch {
          // Verification failed client-side — nothing to invalidate yet.
        }
      },
    }),
    requestRefund: builder.mutation<RefundRecord, { enrollmentId: string; reason?: string }>({
      query: (body) => ({ url: 'payments/refunds', method: 'POST', body }),
      // requestRefund lives on paymentsApi but the data it stales is eventsApi's
      // getEnrollmentById cache (TicketDetailsScreen) — a stale read there let a user
      // attempt a second refund request instead of seeing the now-pending status.
      // RTK Query tags don't cross api instances, so this reaches over explicitly.
      async onQueryStarted({ enrollmentId }, { queryFulfilled, dispatch }) {
        try {
          await queryFulfilled;
          dispatch(eventsApi.util.invalidateTags([{ type: 'Enrollment', id: enrollmentId }]));
        } catch {
          // Refund request failed — nothing to invalidate.
        }
      },
    }),
    getPendingRefunds: builder.query<RefundRecord[], void>({
      query: () => 'payments/refunds/pending',
      providesTags: ['PendingRefunds'],
    }),
    approveRefund: builder.mutation<RefundRecord, string>({
      query: (refundId) => ({ url: `payments/refunds/${refundId}/approve`, method: 'PATCH' }),
      invalidatesTags: ['PendingRefunds'],
    }),
    rejectRefund: builder.mutation<RefundRecord, { refundId: string; reason: string }>({
      query: ({ refundId, reason }) => ({
        url: `payments/refunds/${refundId}/reject`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: ['PendingRefunds'],
    }),
  }),
});

export const {
  useGetFeeEstimateQuery,
  useRequestRefundMutation,
  useGetPendingRefundsQuery,
  useApproveRefundMutation,
  useRejectRefundMutation,
  useCreateOrderMutation,
  useVerifyPaymentMutation,
  useInitiatePayUOrderMutation,
  useInitiatePayUNativeOrderMutation,
  useSignPayUHashMutation,
  useVerifyPayUNativeMutation,
} = paymentsApi;
