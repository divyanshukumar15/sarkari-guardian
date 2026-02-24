
-- Drop the broken restrictive policies
DROP POLICY IF EXISTS "Jobs are publicly readable" ON public.jobs;
DROP POLICY IF EXISTS "Service role can manage jobs" ON public.jobs;

-- Recreate as PERMISSIVE policies (default) so they OR together
CREATE POLICY "Jobs are publicly readable"
  ON public.jobs FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage jobs"
  ON public.jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
