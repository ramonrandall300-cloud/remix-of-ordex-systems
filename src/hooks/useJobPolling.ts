import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PollTarget {
  table: "protein_prediction_jobs" | "docking_jobs";
  id: string;
  navigateTo: string;
  label: string;
}

export function useJobPolling() {
  const navigate = useNavigate();
  const [tracking, setTracking] = useState<PollTarget[]>([]);
  

  const track = (target: PollTarget) => {
    setTracking((prev) => {
      if (prev.find((t) => t.id === target.id)) return prev;
      return [...prev, target];
    });
  };

  const untrack = (id: string) => {
    setTracking((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (tracking.length === 0) return;

    // Subscribe to each tracked job individually with filtered channels
    const channels = tracking.map((target) => {
      const channel = supabase
        .channel(`job-poll-${target.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: target.table, filter: `id=eq.${target.id}` },
          (payload) => {
            const row = payload.new as { id: string; status: string };
            if (row.status === "completed") {
              toast.success(`${target.label} completed!`);
              untrack(row.id);
              navigate(target.navigateTo);
            } else if (row.status === "failed") {
              toast.error(`${target.label} failed`);
              untrack(row.id);
            }
          }
        )
        .subscribe();
      return channel;
    });

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [tracking, navigate]);

  const isTracking = (id: string) => tracking.some((t) => t.id === id);
  const activeCount = tracking.length;

  return { track, untrack, isTracking, activeCount, tracking };
}
