
-- Block UPDATE on usage_logs
CREATE POLICY "usage_logs_update_blocked"
ON public.usage_logs
FOR UPDATE
TO authenticated
USING (false);

-- Block DELETE on usage_logs
CREATE POLICY "usage_logs_delete_blocked"
ON public.usage_logs
FOR DELETE
TO authenticated
USING (false);
