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

export const paymentsApi = createApi({
  reducerPath: 'paymentsApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['PendingRefunds'],
  endpoints: (builder) => ({
    getFeeEstimate: builder.query<FeeBreakdown, number>({
      query: (ticketPrice) => `payments/fee-estimate?ticketPrice=${ticketPrice}`,
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
} = paymentsApi;
