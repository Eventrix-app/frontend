import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Used only for Realtime Broadcast (live chat/announcement delivery, see useChatSocket.ts) —
// never for auth or direct table access, this app's own backend/JWT stays the source of
// truth for those. Lazily created and nullable-safe so the app doesn't crash on boot if these
// vars aren't set: chat then falls back to REST-only (history loads and sending still works,
// just without live delivery/the "connected" indicator) — same graceful-degradation pattern
// as EXPO_PUBLIC_SENTRY_DSN.
let client: SupabaseClient | null | undefined;

export function getSupabaseRealtimeClient(): SupabaseClient | null {
  if (client === undefined) {
    client =
      SUPABASE_URL && SUPABASE_KEY
        ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
        : null;
  }
  return client;
}
