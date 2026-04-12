import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SubscriptionInfo {
  subscribed: boolean;
  tier: string | null;
  subscription_end: string | null;
  product_id: string | null;
  subscription_id: string | null;
  seat_count: number;
  seat_price: number;
  retention_days: number;
}

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  elite: "Elite",
};

const TIER_CREDITS: Record<string, number> = {
  starter: 500,
  professional: 2000,
  elite: 5000,
};

const TIER_SEAT_PRICES: Record<string, number> = {
  starter: 15,
  professional: 25,
  elite: 35,
};

export function useSubscription() {
  const { user } = useAuth();

  const query = useQuery<SubscriptionInfo>({
    queryKey: ["subscription", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      return data as SubscriptionInfo;
    },
  });

  const tierLabel = query.data?.tier ? TIER_LABELS[query.data.tier] ?? query.data.tier : null;
  const tierCredits = query.data?.tier ? TIER_CREDITS[query.data.tier] ?? 0 : 0;
  const seatCount = query.data?.seat_count ?? 0;
  const seatPrice = query.data?.seat_price ?? 0;
  const seatPricePerMonth = query.data?.tier ? TIER_SEAT_PRICES[query.data.tier] ?? 0 : 0;
  const retentionDays = query.data?.retention_days ?? 7;

  return {
    ...query,
    subscribed: query.data?.subscribed ?? false,
    tier: query.data?.tier ?? null,
    tierLabel,
    tierCredits,
    subscriptionEnd: query.data?.subscription_end ?? null,
    subscriptionId: query.data?.subscription_id ?? null,
    seatCount,
    seatPrice,
    seatPricePerMonth,
    retentionDays,
  };
}
