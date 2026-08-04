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

// Returned by POST /payments/payu/initiate — every field is fed directly into the
// self-submitting HTML form that opens PayU's hosted checkout page inside a WebView.
export interface PayUInitiateResponse {
  txnid: string;
  amount: number;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  key: string;
  hash: string;
  // The URL the form POSTs to, e.g. https://test.payu.in/_payment
  actionUrl: string;
}

// Result of POST /payments/payu/verify-native — used by the native SDK path.
export interface PayUVerifyNativeResponse {
  success: boolean;
}

// Mirrors the shape returned by GET /payments/invoices/:enrollmentId on the backend.
// All monetary amounts are in rupees (not paise) and are already rounded to 2 decimal places.
export interface TaxInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  // Booking / enrollment identifiers
  enrollmentId: string;
  bookingReference: string;
  // Event details
  eventTitle: string;
  eventDate: string;
  venueName: string;
  // Ticket line-item
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  subtotalBeforeTax: number;
  // GST breakdown (18% Indian GST on platform convenience fee and ticket price)
  gstRate: number;
  gstAmount: number;
  platformFeeAmount: number;
  // Total amount charged to the buyer
  totalAmountPaid: number;
  // Payer / recipient details
  buyerName: string;
  buyerEmail: string;
  // Organizer details for B2B invoices
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

export const paymentsApi = createApi({
  reducerPath: 'paymentsApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['PendingRefunds'],
  endpoints: (builder) => ({
    getFeeEstimate: builder.query<FeeBreakdown, number>({
      query: (ticketPrice) => `payments/fee-estimate?ticketPrice=${ticketPrice}`,
    }),
    getInvoiceData: builder.query<TaxInvoice, string>({
      // enrollmentId — GET /payments/invoices/:enrollmentId
      query: (enrollmentId) => `payments/invoices/${enrollmentId}`,
    }),
    initiatePayUOrder: builder.mutation<PayUInitiateResponse, { enrollmentId: string }>({
      query: (body) => ({ url: 'payments/payu/initiate', method: 'POST', body }),
    }),
    verifyPayUNative: builder.mutation<PayUVerifyNativeResponse, {
      txnid: string;
      mihpayid: string;
      status: 'success' | 'failure';
      amount: string;
      productinfo: string;
      firstname: string;
      email: string;
      hash: string;
    }>({
      query: (body) => ({ url: 'payments/payu/verify-native', method: 'POST', body }),
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
  useGetInvoiceDataQuery,
  useInitiatePayUOrderMutation,
  useVerifyPayUNativeMutation,
  useRequestRefundMutation,
  useGetPendingRefundsQuery,
  useApproveRefundMutation,
  useRejectRefundMutation,
} = paymentsApi;
