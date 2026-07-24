import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseRealtimeClient } from '../utils/supabaseRealtimeClient';
import { ChatMessageRecord, useGetChatHistoryQuery, useSendChatMessageMutation } from '../store/services/chatApi';

// Live delivery via Supabase Realtime Broadcast, one channel per event ('event:<eventId>',
// matching the topic ChatRealtimeService broadcasts to on the backend). Sending is a plain
// REST call (chatApi's sendChatMessage) — decoupled from this subscription on purpose, so a
// user can still send while the broadcast channel is reconnecting; `isConnected` here only
// reflects whether *live* delivery is currently up, not whether sending will work.
//
// This used to be a self-hosted socket.io connection straight to this app's own backend
// (ChatGateway) — that broke once the backend moved to Vercel Serverless Functions, which
// can't hold a WebSocket connection open. Supabase's Realtime server is a separate, always-on
// service, so it doesn't have that problem.
export function useChatSocket(eventId: string | undefined) {
  const { data: history = [], isLoading: isLoadingHistory, error: historyError } = useGetChatHistoryQuery(eventId!, {
    skip: !eventId,
  });
  // Chat is scoped to the event's organizer/admin/confirmed attendees (see ChatService on the
  // backend) — a 403 here means "signed in fine, just not allowed in this event's chat",
  // distinct from a loading/network failure.
  const isForbidden = (historyError as { status?: number } | undefined)?.status === 403;
  const [sendChatMessage] = useSendChatMessageMutation();

  const [liveMessages, setLiveMessages] = useState<ChatMessageRecord[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Cleared whenever history reloads for a new event, so switching events doesn't show
    // the previous event's live messages appended after the new one's history.
    setLiveMessages([]);
  }, [eventId]);

  useEffect(() => {
    if (!eventId || isForbidden) return;
    const client = getSupabaseRealtimeClient();
    if (!client) return; // Realtime not configured — history + sending still work, see getSupabaseRealtimeClient.

    let cancelled = false;
    const channel = client.channel(`event:${eventId}`);
    channelRef.current = channel;

    channel.on('broadcast', { event: 'newMessage' }, ({ payload }: { payload: ChatMessageRecord }) => {
      if (cancelled || payload.eventId !== eventId) return;
      setLiveMessages((prev) => (prev.some((m) => m.id === payload.id) ? prev : [...prev, payload]));
    });

    channel.subscribe((status) => {
      if (cancelled) return;
      setIsConnected(status === 'SUBSCRIBED');
    });

    return () => {
      cancelled = true;
      client.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [eventId, isForbidden]);

  // Throws on failure so the caller can restore the user's draft text / show an error —
  // matches EventDetailsScreen's CommunityTab handling.
  const sendMessage = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || !eventId) return;
      const record = await sendChatMessage({ eventId, message: trimmed }).unwrap();
      // Local echo — don't wait for the broadcast round-trip to show the sender their own
      // message. Dedup below covers the (small) window where the broadcast also arrives.
      setLiveMessages((prev) => (prev.some((m) => m.id === record.id) ? prev : [...prev, record]));
    },
    [eventId, sendChatMessage],
  );

  // History is oldest-first (see ChatService.getHistory); live messages arrive in order and
  // are simply appended. Dedup guards the (small) window where a message sent right as
  // history loads could appear in both.
  const seenIds = new Set(history.map((m) => m.id));
  const messages = [...history, ...liveMessages.filter((m) => !seenIds.has(m.id))];

  return { messages, sendMessage, isConnected, isLoadingHistory, isForbidden };
}
