
-- Explicit deny INSERT and DELETE on credits
CREATE POLICY "No direct credit inserts"
ON public.credits FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct credit deletes"
ON public.credits FOR DELETE
USING (false);
