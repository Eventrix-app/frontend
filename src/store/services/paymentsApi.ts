import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';
import { eventsApi } from './eventsApi';

export interface FeeBreakdown {
  ticketPrice: number;
  feePayer: 'organizer' | 'participant';
  platformCommissionAmount: number;
  gatewayFeeAmount: number;
  // GST on the platform's commission (not on the ticket price). 0 whenever the backend's
  // TAX_GST_RATE is unset, which is the default — so anything rendering this must treat 0
  // as "no tax line", not "tax of zero".
  gstAmount: number;
  // buyerPrice minus gstAmount. Only differs from buyerPrice when the participant absorbs
  // fees; when the organizer does, both collapse to the bare ticket price.
  subtotalBeforeTax: number;
  buyerPrice: number;
  // What the organizer receives per ticket, net of commission + gateway fee.
  organizerPayout: number;
}

// GET /payments/checkout-estimate — the authoritative pre-booking total. Computed by the
// same FeeCalculationService call EventsService.enroll() makes, so `total` is exactly what
// will be persisted as enrollment.totalAmount and charged by PayU.
//
// `lines` contains ONLY fees the buyer actually pays, and is empty under
// feePayer=organizer, where the buyer is charged the bare ticket price and the organizer
// absorbs everything. Never reconstruct any of this client-side: which fees apply depends on
// the event's feePayer and the organizer's own commission rate, neither of which the app
// knows. A hardcoded platform fee / GST rate here will silently disagree with the charge.
export interface CheckoutEstimate {
  ticketTypeId: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  feePayer: 'organizer' | 'participant';
  // True when the tier is priced at 0. The buyer still pays a flat registration fee, so the
  // UI has to explain why a "free" event is asking for money rather than looking broken.
  isFreeEvent: boolean;
  currency: string;
  lines: { label: string; amount: number }[];
  total: number;
}


// One settlement in the organizer's payout history (GET /payments/my-payouts). Mirrors
// OrganizerPayoutView in Backend src/payments/payments.service.ts.
//
// Only three statuses exist server-side (Backend src/entities/payout.entity.ts):
//   pending — the T+3 sweep has computed what is owed. NOTHING has been sent to a bank.
//   paid    — a transfer was confirmed, and transferReference is the evidence.
//   failed  — a transfer was attempted and did not go through.
// Do not add speculative in-between states here; `paidAt` being set is the only thing that
// means money actually moved.
export interface OrganizerPayout {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate?: string;
  eventCoverImageUrl?: string;
  ticketCount: number;
  // Rupees, already rounded to 2dp by the server. Not paise.
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  processedAt?: string;
  paidAt?: string;
  transferReference?: string;
  // An ESTIMATE, and only present once a transfer has been sent. Must always be rendered as
  // an approximation — it does not model bank holidays.
  estimatedArrivalDate?: string;
}

export interface MyPayoutsPage {
  payouts: OrganizerPayout[];
  total: number;
  page: number;
  totalPages: number;
}

// Mirrors the shape returned by GET /payments/invoices/:enrollmentId on the backend.
// All monetary amounts are in rupees (not paise) and are already rounded to 2 decimal places.
export interface TaxInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  enrollmentId: string;
  bookingReference: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  subtotalBeforeTax: number;
  gstRate: number;
  gstAmount: number;
  platformFeeAmount: number;
  totalAmountPaid: number;
  buyerName: string;
  buyerEmail: string;
  organizerName: string;
  organizerGstin?: string;
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

// Returned by POST /payments/payu/initiate — used by the WebView checkout flow.
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

// Native SDK's camelCase field naming — distinct from PayUOrderResult (the WebView flow).
// No pre-computed hash: the SDK requests hashes on demand via signPayUHash.
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

export type FeeEstimateArg = number | { ticketPrice: number; feePayer?: 'organizer' | 'participant'; organizerId?: string };

export const paymentsApi = createApi({
  reducerPath: 'paymentsApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['PendingRefunds', 'MyPayouts'],
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
          // Verification failed client-side — webhook is the durable confirmation path.
        }
      },
    }),
    // WebView-based PayU checkout — mints txnid+hash for a pending-payment enrollment.
    initiatePayUOrder: builder.mutation<PayUOrderResult, { enrollmentId: string }>({
      query: (body) => ({ url: 'payments/payu/initiate', method: 'POST', body }),
    }),
    // Native SDK checkout (payu-non-seam-less-react) — no pre-computed hash.
    initiatePayUNativeOrder: builder.mutation<PayUNativeOrderResult, { enrollmentId: string }>({
      query: (body) => ({ url: 'payments/payu/initiate-native', method: 'POST', body }),
    }),
    // Hashes mid-checkout signed server-side (salt must never reach the client).
    signPayUHash: builder.mutation<{ hash: string }, { hashString: string }>({
      query: (body) => ({ url: 'payments/payu/sign-hash', method: 'POST', body }),
    }),
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
          // Verification failed client-side.
        }
      },
    }),
    // Buyer-facing checkout total. Distinct from getFeeEstimate above, which is the
    // organizer-facing payout preview and 403s for anyone querying an organizer that isn't
    // their own — this one takes no organizerId at all, so an attendee can call it.
    getCheckoutEstimate: builder.query<CheckoutEstimate, { ticketTypeId: string; quantity: number }>({
      query: ({ ticketTypeId, quantity }) =>
        `payments/checkout-estimate?ticketTypeId=${encodeURIComponent(ticketTypeId)}&quantity=${quantity}`,
    }),
    getInvoiceData: builder.query<TaxInvoice, string>({
      query: (enrollmentId) => `payments/invoices/${enrollmentId}`,
    }),
    requestRefund: builder.mutation<RefundRecord, { enrollmentId: string; reason?: string }>({
      query: (body) => ({ url: 'payments/refunds', method: 'POST', body }),
      async onQueryStarted({ enrollmentId }, { queryFulfilled, dispatch }) {
        try {
          await queryFulfilled;
          dispatch(eventsApi.util.invalidateTags([{ type: 'Enrollment', id: enrollmentId }]));
        } catch {
          // Refund request failed — nothing to invalidate.
        }
      },
    }),
    // The organizer's own settlement history. Takes no organizerId — the server scopes it to
    // the session — so there is nothing to pass and nothing to get wrong.
    getMyPayouts: builder.query<MyPayoutsPage, { page?: number; limit?: number } | void>({
      query: (arg) => {
        const { page = 1, limit = 20 } = arg ?? {};
        return `payments/my-payouts?page=${page}&limit=${limit}`;
      },
      providesTags: ['MyPayouts'],
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
  useGetCheckoutEstimateQuery,
  useCreateOrderMutation,
  useVerifyPaymentMutation,
  useInitiatePayUOrderMutation,
  useInitiatePayUNativeOrderMutation,
  useSignPayUHashMutation,
  useVerifyPayUNativeMutation,
  useGetInvoiceDataQuery,
  useRequestRefundMutation,
  useGetMyPayoutsQuery,
  useGetPendingRefundsQuery,
  useApproveRefundMutation,
  useRejectRefundMutation,
} = paymentsApi;
