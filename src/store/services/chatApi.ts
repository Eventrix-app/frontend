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

// REST fallback for chat history only — sending a message always goes through the
// useChatSocket hook's socket connection (see hooks/useChatSocket.ts). This just backfills
// the Community tab before that socket finishes connecting.
export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: createFallbackBaseQuery(true),
  endpoints: (builder) => ({
    getChatHistory: builder.query<ChatMessageRecord[], string>({
      query: (eventId) => `events/${eventId}/chat/messages`,
    }),
  }),
});

export const { useGetChatHistoryQuery } = chatApi;
