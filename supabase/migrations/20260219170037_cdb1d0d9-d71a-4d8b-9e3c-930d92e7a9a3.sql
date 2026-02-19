
-- Create the jobs table matching the scraper's output schema
CREATE TABLE IF NOT EXISTS public.jobs (
  id                 TEXT PRIMARY KEY,  -- 16-char MD5 hash of title|organization
  title              TEXT NOT NULL,
  organization       TEXT NOT NULL,
  department         TEXT DEFAULT 'N/A',
  category           TEXT NOT NULL DEFAULT 'latest' CHECK (category IN ('latest', 'admit-card', 'results', 'archived')),
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring', 'expired')),
  posts              TEXT DEFAULT 'N/A',
  last_date          DATE,
  notification_date  DATE,
  source_url         TEXT,
  source_domain      TEXT,
  is_verified_source BOOLEAN DEFAULT TRUE,
  location           TEXT DEFAULT 'N/A',
  qualification      TEXT DEFAULT 'N/A',
  age_limit          TEXT DEFAULT 'N/A',
  salary             TEXT DEFAULT 'N/A',
  tags               TEXT[] DEFAULT '{}',
  scraped_at         TIMESTAMPTZ DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read jobs (public portal)
CREATE POLICY "Jobs are publicly readable"
  ON public.jobs
  FOR SELECT
  USING (true);

-- Only service role (scraper) can insert/update/delete
CREATE POLICY "Service role can manage jobs"
  ON public.jobs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast filtering by category and status
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs (category);
CREATE INDEX IF NOT EXISTS idx_jobs_status   ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_last_date ON public.jobs (last_date);
