
-- Add retention_days column
ALTER TABLE public.subscription_cache
ADD COLUMN retention_days integer NOT NULL DEFAULT 7;

-- Update existing rows based on tier
UPDATE public.subscription_cache SET retention_days = 30 WHERE tier = 'starter';
UPDATE public.subscription_cache SET retention_days = 90 WHERE tier = 'professional';
UPDATE public.subscription_cache SET retention_days = 365 WHERE tier = 'elite';

-- Recreate the upsert function to include retention_days
CREATE OR REPLACE FUNCTION public.upsert_subscription_cache(
  _org_id uuid,
  _tier text,
  _seat_count integer,
  _seat_price integer,
  _subscription_id text,
  _subscription_end timestamp with time zone,
  _retention_days integer DEFAULT 7
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscription_cache (org_id, tier, seat_count, seat_price, subscription_id, subscription_end, retention_days, updated_at)
  VALUES (_org_id, _tier, _seat_count, _seat_price, _subscription_id, _subscription_end, _retention_days, now())
  ON CONFLICT (org_id) DO UPDATE
  SET tier = EXCLUDED.tier,
      seat_count = EXCLUDED.seat_count,
      seat_price = EXCLUDED.seat_price,
      subscription_id = EXCLUDED.subscription_id,
      subscription_end = EXCLUDED.subscription_end,
      retention_days = EXCLUDED.retention_days,
      updated_at = now();
END;
$$;
