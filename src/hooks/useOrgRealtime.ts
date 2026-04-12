import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Event = "INSERT" | "UPDATE" | "DELETE" | "*";

interface RealtimeSubscription {
  /** Table to subscribe to */
  table: string;
  /** Events to listen for (default: "*") */
  event?: Event;
  /** Called when a matching change arrives */
  onMessage: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void;
  /** Additional filter column (e.g. "user_id") — combined with org_id filter */
  extraFilter?: { column: string; value: string };
}

/**
 * Secure org-scoped realtime hook.
 *
 * WHY THIS PREVENTS DATA LEAKS:
 * 1. Every subscription filters by `org_id=eq.{orgId}` — Postgres only sends
 *    rows matching the filter AND passing RLS SELECT policies.
 * 2. RLS SELECT policies on jobs/org_credits/etc. already check
 *    `is_org_member(org_id)`, so even if a malicious client tried to
 *    subscribe with a different org_id, the RLS policy would block the rows.
 * 3. No wildcard channels (`realtime:*`) are ever created.
 * 4. Channels are torn down on unmount or when orgId changes.
 */
export function useOrgRealtime(
  orgId: string | undefined,
  subscriptions: RealtimeSubscription[]
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!orgId || subscriptions.length === 0) return;

    // Build a single channel with all subscriptions scoped to org
    let channel = supabase.channel(`org-${orgId}-realtime`);

    for (const sub of subscriptions) {
      const filter = sub.extraFilter
        ? `org_id=eq.${orgId},${sub.extraFilter.column}=eq.${sub.extraFilter.value}`
        : `org_id=eq.${orgId}`;

      channel = channel.on(
        "postgres_changes",
        {
          event: sub.event ?? "*",
          schema: "public",
          table: sub.table,
          filter,
        },
        (payload) => sub.onMessage(payload as any)
      );
    }

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // Re-subscribe when orgId or subscription count changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, subscriptions.length]);
}
