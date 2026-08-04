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

// GET /payments/invoice/:enrollmentId
export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  bookingReference: string;
  event: { id: string; title: string; eventDate: string; venueName: string };
  organizer: { companyName: string };
  participant: { fullName: string; email: string };
  ticketType: string;
  quantity: number;
  currency: string;
  breakdown: FeeBreakdown;
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
    getInvoice: builder.query<InvoiceData, string>({
      query: (enrollmentId) => `payments/invoice/${enrollmentId}`,
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
  useCreateOrderMutation,
  useVerifyPaymentMutation,
  useInitiatePayUOrderMutation,
  useInitiatePayUNativeOrderMutation,
  useSignPayUHashMutation,
  useVerifyPayUNativeMutation,
  useGetInvoiceQuery,
  useGetInvoiceDataQuery,
  useRequestRefundMutation,
  useGetPendingRefundsQuery,
  useApproveRefundMutation,
  useRejectRefundMutation,
} = paymentsApi;
