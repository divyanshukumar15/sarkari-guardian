import { useState } from 'react';
import { Job, JobCategory } from '@/types/job';
import { useJobs, filterJobs, computeStats } from '@/hooks/useJobs';
import JobCard from '@/components/JobCard';
import StatsBar from '@/components/StatsBar';
import SearchBar from '@/components/SearchBar';
import heroBanner from '@/assets/hero-banner.jpg';
import {
  Briefcase,
  FileText,
  Trophy,
  Archive,
  Zap,
  RefreshCw,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const TABS: { key: JobCategory; label: string; icon: React.ElementType }[] = [
  { key: 'latest', label: 'Latest Jobs', icon: Briefcase },
  { key: 'admit-card', label: 'Admit Card', icon: FileText },
  { key: 'results', label: 'Results', icon: Trophy },
  { key: 'archived', label: 'Archived', icon: Archive },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<JobCategory>('latest');
  const [search, setSearch] = useState('');

  const { data: jobs = [], isLoading, isError, dataUpdatedAt } = useJobs();

  const stats = computeStats(jobs);
  const filtered = filterJobs(jobs, activeTab, search);

  const lastSyncText = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const tabCount = (tab: JobCategory) => {
    if (tab === 'archived') return jobs.filter(j => j.status === 'expired' || j.category === 'archived').length;
    return jobs.filter(j => j.category === tab && j.status !== 'expired').length;
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Top nav bar */}
      <nav
        className="sticky top-0 z-50 border-b border-white/10"
        style={{ background: 'var(--gradient-nav)', boxShadow: '0 2px 16px hsl(222 65% 10% / 0.4)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'hsl(var(--saffron))' }}
              >
                <Shield className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div>
                <span
                  className="font-display text-xl font-bold leading-none"
                  style={{ color: 'hsl(var(--saffron))' }}
                >
                  SarkariJobs
                </span>
                <span className="text-white/60 text-[10px] block leading-none font-medium tracking-widest">
                  OFFICIAL PORTAL
                </span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-white/70 text-xs">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                Auto-updated every 12 hours
              </span>
              <span className="flex items-center gap-1.5">
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-amber-400' : 'text-green-400'}`} />
                {isLoading ? 'Syncing…' : `Last sync: ${lastSyncText}`}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      <div className="relative h-48 sm:h-56 overflow-hidden">
        <img
          src={heroBanner}
          alt="Sarkari Job Portal"
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center"
          style={{
            background: 'linear-gradient(135deg, hsl(222 65% 14% / 0.88) 0%, hsl(222 55% 22% / 0.75) 100%)',
          }}
        >
          <h1
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2"
            style={{ textShadow: '0 2px 16px hsl(0 0% 0% / 0.4)' }}
          >
            Government Job Portal
          </h1>
          <p className="text-white/70 text-sm sm:text-base max-w-xl">
            100% verified from official{' '}
            <span style={{ color: 'hsl(var(--saffron))' }}>.gov.in</span> &{' '}
            <span style={{ color: 'hsl(var(--saffron))' }}>.nic.in</span> sources only
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs text-white/60">
            <Shield className="w-3.5 h-3.5 text-green-400" />
            <span>AI-extracted &amp; validated · No duplicates · Auto-expiry</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <StatsBar
          total={stats.total}
          active={stats.active}
          expiringSoon={stats.expiringSoon}
          archived={stats.archived}
          verifiedSources={stats.verifiedSources}
        />

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 rounded-xl border border-border bg-card">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`nav-tab flex items-center gap-1.5 ${activeTab === tab.key ? 'active' : ''}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background:
                      activeTab === tab.key ? 'hsl(var(--saffron))' : 'hsl(var(--muted))',
                    color:
                      activeTab === tab.key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {tabCount(tab.key)}
                </span>
              </button>
            ))}
          </div>
          <SearchBar value={search} onChange={setSearch} />
        </div>

        {/* Accuracy Notice */}
        {activeTab === 'latest' && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm"
            style={{
              background: 'hsl(210 70% 92%)',
              borderColor: 'hsl(210 70% 70% / 0.4)',
              color: 'hsl(210 80% 28%)',
            }}
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Accuracy Guard Active:</strong> All job data is extracted by Gemini AI with
              strict validation. Missing fields show as{' '}
              <code className="font-mono bg-blue-100 px-1 rounded">N/A</code> instead of guessing.
              Only official{' '}
              <code className="font-mono">.gov.in</code> &{' '}
              <code className="font-mono">.nic.in</code> source links are accepted.
            </span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading live job data…</p>
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-destructive gap-3">
            <AlertCircle className="w-10 h-10" />
            <p className="text-sm font-medium">Failed to load jobs. Please refresh the page.</p>
          </div>
        )}

        {/* Job Grid */}
        {!isLoading && !isError && (
          <>
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-display font-semibold">
                  {jobs.length === 0 ? 'No jobs yet' : 'No jobs found'}
                </p>
                <p className="text-sm mt-1">
                  {jobs.length === 0
                    ? 'The scraper will populate jobs once the GitHub Action runs.'
                    : 'Try a different search term or category'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer
        className="mt-12 border-t border-border py-8"
        style={{ background: 'hsl(var(--primary) / 0.04)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground space-y-2">
          <p className="font-display text-sm font-semibold text-foreground">SarkariJobs Portal</p>
          <p>
            Automated · AI-Verified · Official Sources Only ·{' '}
            <span style={{ color: 'hsl(var(--saffron))' }}>
              Updates every 12 hours via GitHub Actions
            </span>
          </p>
          <p>Disclaimer: Always verify from the official notification before applying.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
