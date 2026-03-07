import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Job, JobCategory } from '@/types/job';

const normalizeJob = (job: Partial<Job> & Record<string, unknown>): Job => ({
  id: String(job.id ?? ''),
  title: String(job.title ?? 'N/A'),
  organization: String(job.organization ?? 'N/A'),
  department: String(job.department ?? 'N/A'),
  category: (job.category ?? 'latest') as JobCategory,
  status: (job.status ?? 'active') as Job['status'],
  posts: String(job.posts ?? 'N/A'),
  last_date: (job.last_date as string | null) ?? null,
  notification_date: (job.notification_date as string | null) ?? null,
  source_url: (job.source_url as string | null) ?? null,
  source_domain: (job.source_domain as string | null) ?? null,
  is_verified_source: Boolean(job.is_verified_source),
  location: String(job.location ?? 'N/A'),
  qualification: String(job.qualification ?? 'N/A'),
  age_limit: String(job.age_limit ?? 'N/A'),
  salary: String(job.salary ?? 'N/A'),
  tags: Array.isArray(job.tags) ? (job.tags as string[]) : [],
  scraped_at: (job.scraped_at as string | null) ?? null,
  created_at: String(job.created_at ?? new Date().toISOString()),
});

const fetchJobs = async (): Promise<Job[]> => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data ?? []).map((row) => normalizeJob(row as Partial<Job> & Record<string, unknown>));
};

export const useJobs = () => {
  return useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
};

export const filterJobs = (jobs: Job[], activeTab: JobCategory, search: string): Job[] => {
  return jobs
    .filter(job => {
      if (activeTab === 'archived') {
        return job.status === 'expired' || job.category === 'archived';
      }
      return job.category === activeTab && job.status !== 'expired';
    })
    .filter(job => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        job.title.toLowerCase().includes(q) ||
        job.organization.toLowerCase().includes(q) ||
        job.department.toLowerCase().includes(q) ||
        job.tags.some(t => t.toLowerCase().includes(q))
      );
    });
};

export const computeStats = (jobs: Job[]) => ({
  total: jobs.filter(j => j.status !== 'expired').length,
  active: jobs.filter(j => j.status === 'active').length,
  expiringSoon: jobs.filter(j => j.status === 'expiring').length,
  archived: jobs.filter(j => j.status === 'expired' || j.category === 'archived').length,
  verifiedSources: jobs.filter(j => j.is_verified_source && j.status !== 'expired').length,
});
