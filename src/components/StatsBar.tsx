import { TrendingUp, Clock, Archive, ShieldCheck } from 'lucide-react';

interface StatsProps {
  total: number;
  active: number;
  expiringSoon: number;
  archived: number;
  verifiedSources: number;
}

const StatsBar: React.FC<StatsProps> = ({ total, active, expiringSoon, archived, verifiedSources }) => {
  const stats = [
    {
      label: 'Total Live Jobs',
      value: total,
      icon: TrendingUp,
      color: 'hsl(var(--primary))',
      bg: 'hsl(var(--primary) / 0.08)',
    },
    {
      label: 'Active',
      value: active,
      icon: ShieldCheck,
      color: 'hsl(var(--gov-green))',
      bg: 'hsl(var(--gov-green-light))',
    },
    {
      label: 'Expiring Soon',
      value: expiringSoon,
      icon: Clock,
      color: 'hsl(36 90% 38%)',
      bg: 'hsl(var(--warning-light))',
    },
    {
      label: 'Archived',
      value: archived,
      icon: Archive,
      color: 'hsl(var(--error))',
      bg: 'hsl(var(--error-light))',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div key={stat.label} className="stat-card flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: stat.bg }}
          >
            <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
          </div>
          <div>
            <div className="text-2xl font-display font-bold text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground leading-tight">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;
