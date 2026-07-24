import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';

export interface ChatMessageRecord {
  id: string;
  eventId: string;
  userId: string;
  message: string;
  createdAt: string;
  user?: { id: string; fullName: string; profilePictureUrl?: string | null };
}

// getChatHistory backfills the Community tab; sendChatMessage persists a new message (moderation/
// auth enforced server-side). Live delivery to other viewers happens over Supabase Realtime, not
// this API — see hooks/useChatSocket.ts.
export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: createFallbackBaseQuery(true),
  endpoints: (builder) => ({
    getChatHistory: builder.query<ChatMessageRecord[], string>({
      query: (eventId) => `events/${eventId}/chat/messages`,
    }),
    sendChatMessage: builder.mutation<ChatMessageRecord, { eventId: string; message: string }>({
      query: ({ eventId, message }) => ({
        url: `events/${eventId}/chat/messages`,
        method: 'POST',
        body: { message },
      }),
    }),
  }),
});

export const { useGetChatHistoryQuery, useSendChatMessageMutation } = chatApi;
