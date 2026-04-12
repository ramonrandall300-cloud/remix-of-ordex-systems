
-- Cache subscription state locally for fast reads
CREATE TABLE public.subscription_cache (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  tier text,
  seat_count integer NOT NULL DEFAULT 0,
  seat_price integer NOT NULL DEFAULT 0,
  subscription_id text,
  subscription_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subcache_select_members" ON public.subscription_cache
  FOR SELECT TO authenticated
  USING (is_org_member(org_id));

CREATE POLICY "subcache_insert_blocked" ON public.subscription_cache
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "subcache_update_blocked" ON public.subscription_cache
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "subcache_delete_blocked" ON public.subscription_cache
  FOR DELETE TO authenticated
  USING (false);

-- Security definer function for backend to upsert cache
CREATE OR REPLACE FUNCTION public.upsert_subscription_cache(
  _org_id uuid,
  _tier text,
  _seat_count integer,
  _seat_price integer,
  _subscription_id text,
  _subscription_end timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscription_cache (org_id, tier, seat_count, seat_price, subscription_id, subscription_end, updated_at)
  VALUES (_org_id, _tier, _seat_count, _seat_price, _subscription_id, _subscription_end, now())
  ON CONFLICT (org_id) DO UPDATE
  SET tier = EXCLUDED.tier,
      seat_count = EXCLUDED.seat_count,
      seat_price = EXCLUDED.seat_price,
      subscription_id = EXCLUDED.subscription_id,
      subscription_end = EXCLUDED.subscription_end,
      updated_at = now();
END;
$$;
