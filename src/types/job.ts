export type JobStatus = 'active' | 'expiring' | 'expired';
export type JobCategory = 'latest' | 'admit-card' | 'results' | 'archived';

export interface Job {
  id: string;
  title: string;
  organization: string;
  department: string;
  category: JobCategory;
  status: JobStatus;
  posts: string; // "120" or "N/A"
  last_date: string | null;
  notification_date: string | null;
  source_url: string | null;
  source_domain: string | null;
  is_verified_source: boolean;
  location: string;
  qualification: string;
  age_limit: string;
  salary: string;
  tags: string[];
  scraped_at: string | null;
  created_at: string;
}
