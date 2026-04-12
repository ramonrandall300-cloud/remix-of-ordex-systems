
CREATE OR REPLACE FUNCTION public.get_org_members_with_profile(_org_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  role text,
  created_at timestamptz,
  email text,
  full_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a member of this org
  IF NOT is_org_member(_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.user_id,
    m.role,
    m.created_at,
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'full_name', '')::text AS full_name
  FROM public.org_members m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.org_id = _org_id
  ORDER BY m.created_at ASC;
END;
$$;
