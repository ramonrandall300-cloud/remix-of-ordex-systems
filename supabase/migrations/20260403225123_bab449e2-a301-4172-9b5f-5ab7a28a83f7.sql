
-- Drop old function
DROP FUNCTION IF EXISTS public.decrement_credits(uuid, integer);

-- adjust_credits: general-purpose credit adjustment (positive or negative)
CREATE OR REPLACE FUNCTION public.adjust_credits(_org_id uuid, _amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current integer;
  _new_balance integer;
BEGIN
  -- Validate org exists
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Get current balance (lock row for update)
  SELECT balance INTO _current
  FROM public.org_credits
  WHERE org_id = _org_id
  FOR UPDATE;

  -- If no credits row exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.org_credits (org_id, balance, updated_at)
    VALUES (_org_id, 0, now());
    _current := 0;
  END IF;

  _new_balance := _current + _amount;

  -- Prevent negative balance
  IF _new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient credits: balance would be %', _new_balance;
  END IF;

  UPDATE public.org_credits
  SET balance = _new_balance, updated_at = now()
  WHERE org_id = _org_id;

  RETURN _new_balance;
END;
$$;

-- deduct_credits_for_job: convenience wrapper with explicit insufficient-credits error
CREATE OR REPLACE FUNCTION public.deduct_credits_for_job(_org_id uuid, _cost integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current integer;
  _new_balance integer;
BEGIN
  IF _cost <= 0 THEN
    RAISE EXCEPTION 'Cost must be a positive integer';
  END IF;

  -- Lock row
  SELECT balance INTO _current
  FROM public.org_credits
  WHERE org_id = _org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  IF _current < _cost THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  _new_balance := _current - _cost;

  UPDATE public.org_credits
  SET balance = _new_balance, updated_at = now()
  WHERE org_id = _org_id;

  RETURN _new_balance;
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION public.adjust_credits(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits_for_job(uuid, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.adjust_credits(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.deduct_credits_for_job(uuid, integer) FROM anon;
