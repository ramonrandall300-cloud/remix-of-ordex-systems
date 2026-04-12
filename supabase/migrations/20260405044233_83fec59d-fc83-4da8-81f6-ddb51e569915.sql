
CREATE OR REPLACE FUNCTION public.adjust_credits(_org_id uuid, _amount integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _current integer;
  _new_balance integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  SELECT balance INTO _current
  FROM public.org_credits
  WHERE org_id = _org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.org_credits (org_id, balance, updated_at)
    VALUES (_org_id, 0, now());
    _current := 0;
  END IF;

  _new_balance := _current + _amount;

  IF _new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient credits: balance would be %', _new_balance;
  END IF;

  UPDATE public.org_credits
  SET balance = _new_balance, updated_at = now()
  WHERE org_id = _org_id;

  RETURN _new_balance;
END;
$function$;
