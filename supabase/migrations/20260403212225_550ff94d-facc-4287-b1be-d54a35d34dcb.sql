
-- Drop the old permissive update policy
DROP POLICY IF EXISTS "Members can update org credits" ON public.credits;

-- Block all direct updates
CREATE POLICY "No direct credit updates"
ON public.credits FOR UPDATE
USING (false);

-- Secure function to decrement credits
CREATE OR REPLACE FUNCTION public.decrement_credits(_org_id uuid, _amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.credits
  SET balance = balance - _amount
  WHERE org_id = _org_id;
END;
$$;

-- Only authenticated users can call it
REVOKE ALL ON FUNCTION public.decrement_credits(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_credits(uuid, int) TO authenticated;
