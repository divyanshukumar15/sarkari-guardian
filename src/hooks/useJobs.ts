import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Job, JobCategory } from '@/types/job';

const fetchJobs = async (): Promise<Job[]> => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data ?? []) as Job[];
};

export const useJobs = () => {
  return useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
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
