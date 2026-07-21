import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import type { RootState } from '../store';
import { ChatMessageRecord, useGetChatHistoryQuery } from '../store/services/chatApi';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/';
// The socket.io server is mounted on the app's HTTP server directly, not behind Nest's
// global 'api' prefix (that prefix only applies to REST controller routes) — strip it back
// off the REST base URL to get the actual socket host.
const SOCKET_BASE_URL = API_URL.replace(/\/api\/?$/, '');

const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000];

export function useChatSocket(eventId: string | undefined) {
  const token = useSelector((state: RootState) => state.auth.token);
  const { data: history = [], isLoading: isLoadingHistory } = useGetChatHistoryQuery(eventId!, { skip: !eventId });

  const [liveMessages, setLiveMessages] = useState<ChatMessageRecord[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cleared whenever history reloads for a new event, so switching events doesn't show
    // the previous event's live messages appended after the new one's history.
    setLiveMessages([]);
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !token) return;

    let cancelled = false;

    const connect = () => {
      const socket = io(`${SOCKET_BASE_URL}/chat`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false, // manual backoff below, so we control the retry schedule
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (cancelled) return;
        reconnectAttemptRef.current = 0;
        setIsConnected(true);
        socket.emit('joinEvent', { eventId });
      });

      socket.on('newMessage', (message: ChatMessageRecord) => {
        if (cancelled || message.eventId !== eventId) return;
        setLiveMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      });

      const scheduleReconnect = () => {
        if (cancelled) return;
        setIsConnected(false);
        const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS_MS.length - 1)];
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          socket.connect();
        }, delay);
      };

      socket.on('disconnect', scheduleReconnect);
      socket.on('connect_error', scheduleReconnect);
      socket.on('authError', () => {
        // Bad/expired token — don't keep hammering reconnects with credentials that won't work.
        cancelled = true;
        socket.disconnect();
      });
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.emit('leaveEvent', { eventId });
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [eventId, token]);

  const sendMessage = useCallback((message: string) => {
    const trimmed = message.trim();
    if (!trimmed || !eventId || !socketRef.current?.connected) return;
    socketRef.current.emit('sendMessage', { eventId, message: trimmed });
  }, [eventId]);

  // History is oldest-first (see ChatService.getHistory); live messages arrive in order and
  // are simply appended. Dedup guards the (small) window where a message sent right as
  // history loads could appear in both.
  const seenIds = new Set(history.map((m) => m.id));
  const messages = [...history, ...liveMessages.filter((m) => !seenIds.has(m.id))];

  return { messages, sendMessage, isConnected, isLoadingHistory };
}
