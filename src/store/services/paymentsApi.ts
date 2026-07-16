import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';

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

export const paymentsApi = createApi({
  reducerPath: 'paymentsApi',
  baseQuery: createFallbackBaseQuery(true),
  endpoints: (builder) => ({
    getFeeEstimate: builder.query<FeeBreakdown, number>({
      query: (ticketPrice) => `payments/fee-estimate?ticketPrice=${ticketPrice}`,
    }),
  }),
});

export const { useGetFeeEstimateQuery } = paymentsApi;
