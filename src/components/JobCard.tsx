import { Shield, CheckCircle2, Clock, Archive, ExternalLink, Briefcase, MapPin, GraduationCap, Calendar, Users } from 'lucide-react';
import { Job } from '@/data/mockJobs';

interface JobCardProps {
  job: Job;
}

const getStatusBadge = (job: Job) => {
  if (job.status === 'expired') return <span className="badge-expired">● Expired</span>;
  if (job.status === 'expiring') return <span className="badge-expiring">⚡ Expiring Soon</span>;
  return <span className="badge-active">● Active</span>;
};

const getDaysLeft = (dateStr: string): number | null => {
  if (dateStr === 'N/A') return null;
  const today = new Date();
  const last = new Date(dateStr);
  const diff = Math.ceil((last.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

const formatDate = (dateStr: string): string => {
  if (dateStr === 'N/A') return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const daysLeft = getDaysLeft(job.lastDate);

  return (
    <div className="job-card p-5 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {job.isNew && <span className="badge-new">NEW</span>}
            {getStatusBadge(job)}
            {job.isVerifiedSource ? (
              <span className="badge-verified">
                <Shield className="w-2.5 h-2.5" />
                Verified Source
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200">
                Unverified Domain
              </span>
            )}
          </div>
          <h3 className="font-display text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {job.title}
          </h3>
        </div>
      </div>

      {/* Organization */}
      <div className="flex items-center gap-1.5 mb-3 text-sm text-muted-foreground">
        <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="font-medium text-foreground">{job.organization}</span>
        <span>·</span>
        <span>{job.department}</span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="w-3.5 h-3.5 text-primary/60" />
          <span>
            <span className="text-foreground font-semibold">
              {typeof job.posts === 'number' ? job.posts.toLocaleString('en-IN') : job.posts}
            </span>{' '}
            {job.posts !== 'N/A' ? 'Posts' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary/60" />
          <span className="truncate">{job.location}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <GraduationCap className="w-3.5 h-3.5 text-primary/60" />
          <span className="truncate">{job.qualification}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3.5 h-3.5 text-primary/60" />
          <span>{job.ageLimit}</span>
        </div>
      </div>

      {/* Salary */}
      {job.salary !== 'N/A' && (
        <div className="mb-4 px-3 py-2 rounded-lg" style={{ background: 'hsl(var(--saffron-light))' }}>
          <span className="text-xs font-semibold" style={{ color: 'hsl(36 90% 35%)' }}>
            Pay Scale: {job.salary}
          </span>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {job.tags.slice(0, 4).map(tag => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-md text-xs font-medium"
            style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          {job.lastDate !== 'N/A' ? (
            <span>
              Last Date:{' '}
              <span
                className={`font-semibold ${
                  job.status === 'expired'
                    ? 'text-destructive'
                    : job.status === 'expiring'
                    ? 'text-amber-600'
                    : 'text-foreground'
                }`}
              >
                {formatDate(job.lastDate)}
                {daysLeft !== null && daysLeft > 0 && ` (${daysLeft}d left)`}
                {daysLeft !== null && daysLeft <= 0 && ' (Expired)'}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">N/A</span>
          )}
        </div>

        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent transition-colors"
          style={{ color: 'hsl(var(--saffron))' }}
        >
          Official Site <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Source domain */}
      <div className="mt-2 text-[10px] text-muted-foreground font-mono">
        Source: {job.sourceDomain}
      </div>
    </div>
  );
};

export default JobCard;
