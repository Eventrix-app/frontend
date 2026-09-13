import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';
import { CACHE_NONE } from './cachePolicy';

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
  tagTypes: ['ChatHistory'],
  // Chat is the one slice that must not reuse a previous visit's cache.
  //
  // useChatSocket renders history + the live socket buffer merged together. A retained
  // history entry would be a snapshot from whenever the screen was last open, while the live
  // buffer only holds what arrived since this mount — so anything sent in between belongs to
  // neither, and the gap renders as silently missing messages rather than as a visible error.
  //
  // Dropping the entry on unmount also means re-entering the chat always refetches, which is
  // what makes blocking take effect on history: the server filters blocked users out of
  // GET /chat/messages, so a fresh read is already correct. (The live half is filtered
  // client-side in useChatSocket — broadcasts are not filtered server-side.)
  keepUnusedDataFor: CACHE_NONE,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getChatHistory: builder.query<ChatMessageRecord[], string>({
      query: (eventId) => `events/${eventId}/chat/messages`,
      providesTags: (_result, _error, eventId) => [{ type: 'ChatHistory', id: eventId }],
    }),
    // Deliberately does not invalidate ChatHistory: the sent message comes back over the
    // Realtime broadcast that useChatSocket is already subscribed to, so refetching the whole
    // history on every send would re-download the entire thread to learn one line the client
    // is about to receive anyway.
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
