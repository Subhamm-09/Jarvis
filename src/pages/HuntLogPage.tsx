import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Terminal, 
  HeartPulse, 
  Brain, 
  Layers, 
  Filter, 
  Calendar, 
  Zap, 
  Search, 
  X,
  RotateCcw,
  Download
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { exportUserDataAsJSON } from '../lib/domainTelemetry';

export interface LogEntry {
  id: string;
  rawDate: string;
  date: string;
  time: string;
  title: string;
  category: 'career' | 'health' | 'personal';
  subDomain: string;
  priority: number;
  aiVerdict: string;
  exp: number;
  subtitle: string;
  badgeDifficulty?: string;
}

const PAGE_SIZE = 20;

const formatDate = (isoStr: string) => {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
};

const formatTime = (isoStr: string) => {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const isDateInRange = (dateStr: string, range: 'all' | 'today' | 'week' | 'month') => {
  if (range === 'all') return true;
  const d = new Date(dateStr);
  const now = new Date();

  if (range === 'today') {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  if (range === 'week') {
    const localDay = now.getDay();
    const daysSinceMonday = localDay === 0 ? 6 : localDay - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday, 0, 0, 0, 0);
    return d >= startOfWeek;
  }

  if (range === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return d >= startOfMonth;
  }

  return true;
};

export function HuntLogPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary domain filter: 'all' | 'career' | 'health' | 'personal'
  const initialDomain = (searchParams.get('domain') as 'all' | 'career' | 'health' | 'personal') || 'all';
  const [domainFilter, setDomainFilter] = useState<'all' | 'career' | 'health' | 'personal'>(
    ['all', 'career', 'health', 'personal'].includes(initialDomain) ? initialDomain : 'all'
  );

  const [subDomainFilter, setSubDomainFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  // Sync state if URL search param changes
  useEffect(() => {
    const param = searchParams.get('domain') as 'all' | 'career' | 'health' | 'personal';
    if (param && ['all', 'career', 'health', 'personal'].includes(param) && param !== domainFilter) {
      setDomainFilter(param);
      setSubDomainFilter('all');
      setPage(0);
    }
  }, [searchParams]);

  const handleDomainChange = (newDomain: 'all' | 'career' | 'health' | 'personal') => {
    setDomainFilter(newDomain);
    setSubDomainFilter('all');
    setPage(0);
    setSearchParams(newDomain === 'all' ? { domain: 'all' } : { domain: newDomain });
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportUserDataAsJSON();
    } finally {
      setIsExporting(false);
    }
  };

  const fetchAllDomainLogs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [careerRes, healthRes, personalRes] = await Promise.all([
        supabase
          .from('exp_log')
          .select(`
            id,
            awarded_at,
            exp_awarded,
            tasks (
              title,
              domain,
              priority,
              metadata,
              effort_estimate_mins
            )
          `)
          .eq('user_id', user.id)
          .order('awarded_at', { ascending: false }),

        supabase
          .from('health_exp_log')
          .select(`
            id,
            awarded_at,
            exp_awarded,
            pillar,
            metadata,
            health_tasks (
              title,
              priority,
              effort_estimate_mins,
              metadata
            )
          `)
          .eq('user_id', user.id)
          .order('awarded_at', { ascending: false }),

        supabase
          .from('personal_exp_log')
          .select(`
            id,
            awarded_at,
            exp_awarded,
            pillar,
            metadata,
            personal_tasks (
              title,
              priority,
              effort_estimate_mins,
              metadata
            )
          `)
          .eq('user_id', user.id)
          .order('awarded_at', { ascending: false }),
      ]);

      // 1. Map Career Logs
      const careerLogs: LogEntry[] = (careerRes.data || []).map((row: any) => {
        const task = row.tasks || {};
        const meta = task.metadata || {};
        const subDomain = (task.domain || 'general').toUpperCase();

        let aiVerdict = '-';
        if ((task.domain || '').toLowerCase() === 'projects' && meta.ai_evaluation) {
          aiVerdict = `${meta.ai_evaluation.overall_score}/10`;
        } else if (meta.difficulty) {
          aiVerdict = String(meta.difficulty).toUpperCase();
        }

        let subtitle = `${task.effort_estimate_mins || 30} min • Completed on time`;
        if ((task.domain || '').toLowerCase() === 'projects' && meta.ai_evaluation?.justification) {
          subtitle = meta.ai_evaluation.justification;
        }

        return {
          id: `career-${row.id}`,
          rawDate: row.awarded_at,
          date: formatDate(row.awarded_at),
          time: formatTime(row.awarded_at),
          title: task.title || 'Career Operation',
          category: 'career' as const,
          subDomain,
          priority: task.priority || 1,
          aiVerdict,
          exp: row.exp_awarded || 0,
          subtitle,
          badgeDifficulty: meta.difficulty ? String(meta.difficulty).toUpperCase() : undefined,
        };
      });

      // 2. Map Health Logs
      const healthLogs: LogEntry[] = (healthRes.data || []).map((row: any) => {
        const task = row.health_tasks || {};
        const meta = task.metadata || row.metadata || {};
        const pillar = (row.pillar || 'general').toUpperCase();

        let verdict = '-';
        if (meta.difficulty) {
          verdict = String(meta.difficulty).toUpperCase();
        }

        return {
          id: `health-${row.id}`,
          rawDate: row.awarded_at,
          date: formatDate(row.awarded_at),
          time: formatTime(row.awarded_at),
          title: task.title || meta.title || `${pillar} Protocol`,
          category: 'health' as const,
          subDomain: pillar,
          priority: task.priority || 3,
          aiVerdict: verdict,
          exp: row.exp_awarded || 0,
          subtitle: `${task.effort_estimate_mins || 30} min • Protocol Completed`,
          badgeDifficulty: meta.difficulty ? String(meta.difficulty).toUpperCase() : undefined,
        };
      });

      // 3. Map Personal Logs
      const personalLogs: LogEntry[] = (personalRes.data || []).map((row: any) => {
        const task = row.personal_tasks || {};
        const meta = task.metadata || row.metadata || {};
        const pillar = (row.pillar || 'general').toUpperCase();

        let verdict = '-';
        if (meta.difficulty) {
          verdict = String(meta.difficulty).toUpperCase();
        }

        return {
          id: `personal-${row.id}`,
          rawDate: row.awarded_at,
          date: formatDate(row.awarded_at),
          time: formatTime(row.awarded_at),
          title: task.title || meta.title || `${pillar} Quest`,
          category: 'personal' as const,
          subDomain: pillar,
          priority: task.priority || 3,
          aiVerdict: verdict,
          exp: row.exp_awarded || 0,
          subtitle: `${task.effort_estimate_mins || 30} min • Mastery Quest Completed`,
          badgeDifficulty: meta.difficulty ? String(meta.difficulty).toUpperCase() : undefined,
        };
      });

      const combined = [...careerLogs, ...healthLogs, ...personalLogs].sort(
        (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
      );

      setAllLogs(combined);
    } catch (err) {
      console.error('Error fetching combat logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDomainLogs();

    const handleUpdate = () => fetchAllDomainLogs();
    window.addEventListener('exp-awarded', handleUpdate);
    window.addEventListener('health-exp-awarded', handleUpdate);
    window.addEventListener('personal-exp-awarded', handleUpdate);

    return () => {
      window.removeEventListener('exp-awarded', handleUpdate);
      window.removeEventListener('health-exp-awarded', handleUpdate);
      window.removeEventListener('personal-exp-awarded', handleUpdate);
    };
  }, []);

  // Breakdown counts for the tabs
  const careerCount = useMemo(() => allLogs.filter(l => l.category === 'career').length, [allLogs]);
  const healthCount = useMemo(() => allLogs.filter(l => l.category === 'health').length, [allLogs]);
  const personalCount = useMemo(() => allLogs.filter(l => l.category === 'personal').length, [allLogs]);
  const totalCount = allLogs.length;

  // Filtered dataset
  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      // 1. Primary domain filter
      if (domainFilter !== 'all' && log.category !== domainFilter) {
        return false;
      }
      // 2. Sub-domain / pillar filter
      if (subDomainFilter !== 'all' && log.subDomain.toLowerCase() !== subDomainFilter.toLowerCase()) {
        return false;
      }
      // 3. Time filter
      if (!isDateInRange(log.rawDate, timeFilter)) {
        return false;
      }
      // 4. Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesTitle = log.title.toLowerCase().includes(q);
        const matchesSub = log.subDomain.toLowerCase().includes(q);
        const matchesVerdict = log.aiVerdict.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSub && !matchesVerdict) return false;
      }
      return true;
    });
  }, [allLogs, domainFilter, subDomainFilter, timeFilter, searchQuery]);

  // Aggregate Metrics for Header
  const totalExp = useMemo(() => filteredLogs.reduce((sum, l) => sum + l.exp, 0), [filteredLogs]);
  const avgExp = filteredLogs.length > 0 ? Math.round(totalExp / filteredLogs.length) : 0;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = filteredLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleBack = () => {
    if (domainFilter === 'health') {
      navigate('/health');
    } else if (domainFilter === 'personal') {
      navigate('/personal');
    } else if (domainFilter === 'career') {
      navigate('/dashboard');
    } else {
      navigate('/life');
    }
  };

  const getDomainBadge = (category: 'career' | 'health' | 'personal') => {
    switch (category) {
      case 'career':
        return {
          label: 'CAREER',
          borderStyle: 'border-accent/40 bg-accent/10 text-accent',
          icon: Terminal,
        };
      case 'health':
        return {
          label: 'HEALTH',
          borderStyle: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
          icon: HeartPulse,
        };
      case 'personal':
        return {
          label: 'PERSONAL',
          borderStyle: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
          icon: Brain,
        };
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-6 sm:p-12 mt-4 w-full">
      {/* Back Button */}
      <button 
        onClick={handleBack}
        className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2 hover:text-text-primary text-text-secondary transition-colors mb-8 group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        <span>
          Back to {domainFilter === 'health' ? 'Health Protocols' : domainFilter === 'personal' ? 'Personal Mastery' : domainFilter === 'career' ? 'Career Dashboard' : 'Life Map'}
        </span>
      </button>

      {/* Main Header & Branding */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b-2 border-text-primary pb-6 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2.5 h-2.5 bg-accent" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary">
              SYSTEM CONQUEST AUDIT // ALL DOMAINS
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-text-primary leading-none">
            Hunt Log
          </h1>
          <div className="text-sm font-mono text-text-secondary mt-2">
            Chronological combat logs, protocol executions, and EXP records across your entire life.
          </div>
        </div>

        {/* Controls: Export & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="btn-secondary text-xs font-mono uppercase tracking-widest flex items-center gap-2 px-3 py-2 border border-border-strong hover:bg-bg-tertiary transition-colors disabled:opacity-50 shrink-0"
            title="Export all operator tasks, EXP logs, and records as JSON backup"
          >
            <Download size={13} className={isExporting ? 'animate-bounce' : ''} />
            <span>{isExporting ? 'Exporting...' : 'Export Backup'}</span>
          </button>

          {/* Quick Search */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search operations..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="w-full bg-bg-secondary border border-border-strong px-3 py-2 pl-9 text-xs font-mono text-text-primary focus:border-text-primary focus:outline-none transition-colors"
            />
            <Search size={14} className="absolute left-3 top-2.5 text-text-muted" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-text-muted hover:text-text-primary"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Domain Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-1 bg-bg-secondary p-1 border border-border-strong">
          <button
            onClick={() => handleDomainChange('all')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
              domainFilter === 'all'
                ? 'bg-text-primary text-bg-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <Layers size={13} />
            <span>All Domains</span>
            <span className={`text-2xs px-1.5 py-0.2 font-mono ${domainFilter === 'all' ? 'bg-bg-primary text-text-primary' : 'bg-bg-tertiary text-text-muted'}`}>
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => handleDomainChange('career')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
              domainFilter === 'career'
                ? 'bg-text-primary text-bg-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <Terminal size={13} className={domainFilter === 'career' ? 'text-accent' : ''} />
            <span>Career</span>
            <span className={`text-2xs px-1.5 py-0.2 font-mono ${domainFilter === 'career' ? 'bg-bg-primary text-text-primary' : 'bg-bg-tertiary text-text-muted'}`}>
              {careerCount}
            </span>
          </button>

          <button
            onClick={() => handleDomainChange('health')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
              domainFilter === 'health'
                ? 'bg-text-primary text-bg-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <HeartPulse size={13} className={domainFilter === 'health' ? 'text-emerald-400' : ''} />
            <span>Health</span>
            <span className={`text-2xs px-1.5 py-0.2 font-mono ${domainFilter === 'health' ? 'bg-bg-primary text-text-primary' : 'bg-bg-tertiary text-text-muted'}`}>
              {healthCount}
            </span>
          </button>

          <button
            onClick={() => handleDomainChange('personal')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
              domainFilter === 'personal'
                ? 'bg-text-primary text-bg-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <Brain size={13} className={domainFilter === 'personal' ? 'text-purple-400' : ''} />
            <span>Personal</span>
            <span className={`text-2xs px-1.5 py-0.2 font-mono ${domainFilter === 'personal' ? 'bg-bg-primary text-text-primary' : 'bg-bg-tertiary text-text-muted'}`}>
              {personalCount}
            </span>
          </button>
        </div>

        {/* Secondary Filters: Sub-domain & Time */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sub-domain Dropdown */}
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-text-muted" />
            <select
              value={subDomainFilter}
              onChange={(e) => {
                setSubDomainFilter(e.target.value);
                setPage(0);
              }}
              className="select-system text-xs uppercase tracking-wider py-1.5 px-3 bg-bg-secondary border border-border-strong font-mono"
            >
              <option value="all">All Sub-Categories</option>
              
              {domainFilter === 'all' && (
                <>
                  <optgroup label="Career Domains">
                    <option value="leetcode">LeetCode</option>
                    <option value="projects">Projects</option>
                    <option value="hackathons">Hackathons</option>
                    <option value="coursework">Coursework</option>
                    <option value="learning">Learning</option>
                    <option value="general">General</option>
                  </optgroup>
                  <optgroup label="Health Pillars">
                    <option value="strength">Strength</option>
                    <option value="endurance">Endurance</option>
                    <option value="nutrition">Nutrition</option>
                    <option value="recovery">Recovery</option>
                    <option value="mobility">Mobility</option>
                  </optgroup>
                  <optgroup label="Personal Pillars">
                    <option value="intellect">Intellect</option>
                    <option value="mindfulness">Mindfulness</option>
                    <option value="creativity">Creativity</option>
                    <option value="relationships">Relationships</option>
                    <option value="finance">Finance</option>
                  </optgroup>
                </>
              )}

              {domainFilter === 'career' && (
                <>
                  <option value="leetcode">LeetCode</option>
                  <option value="projects">Projects</option>
                  <option value="hackathons">Hackathons</option>
                  <option value="coursework">Coursework</option>
                  <option value="learning">Learning</option>
                  <option value="general">General</option>
                </>
              )}

              {domainFilter === 'health' && (
                <>
                  <option value="strength">Strength</option>
                  <option value="endurance">Endurance</option>
                  <option value="nutrition">Nutrition</option>
                  <option value="recovery">Recovery</option>
                  <option value="mobility">Mobility</option>
                </>
              )}

              {domainFilter === 'personal' && (
                <>
                  <option value="intellect">Intellect</option>
                  <option value="mindfulness">Mindfulness</option>
                  <option value="creativity">Creativity</option>
                  <option value="relationships">Relationships</option>
                  <option value="finance">Finance</option>
                </>
              )}
            </select>
          </div>

          {/* Time Window Dropdown */}
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-text-muted" />
            <select
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value as any);
                setPage(0);
              }}
              className="select-system text-xs uppercase tracking-wider py-1.5 px-3 bg-bg-secondary border border-border-strong font-mono"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Reset Filters if modified */}
          {(subDomainFilter !== 'all' || timeFilter !== 'all' || searchQuery !== '') && (
            <button
              onClick={() => {
                setSubDomainFilter('all');
                setTimeFilter('all');
                setSearchQuery('');
                setPage(0);
              }}
              className="text-xs font-mono text-accent hover:underline flex items-center gap-1 px-2 py-1"
              title="Reset all filters"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Quick Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 bg-bg-secondary border border-border-strong p-4">
        <div>
          <span className="text-3xs font-mono uppercase tracking-widest text-text-muted block">EXP Captured</span>
          <span className="text-xl font-mono font-bold text-accent">+{totalExp.toLocaleString()} XP</span>
        </div>
        <div className="border-l border-border-subtle pl-4">
          <span className="text-3xs font-mono uppercase tracking-widest text-text-muted block">Operations Logged</span>
          <span className="text-xl font-mono font-bold text-text-primary">{filteredLogs.length}</span>
        </div>
        <div className="border-l border-border-subtle pl-4">
          <span className="text-3xs font-mono uppercase tracking-widest text-text-muted block">Active Scope</span>
          <span className="text-sm font-mono font-bold uppercase text-text-primary mt-1 block truncate">
            {domainFilter === 'all' ? 'All Life Domains' : domainFilter}
          </span>
        </div>
        <div className="border-l border-border-subtle pl-4">
          <span className="text-3xs font-mono uppercase tracking-widest text-text-muted block">Avg EXP / Op</span>
          <span className="text-xl font-mono font-bold text-text-secondary">{avgExp} XP</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex flex-col border border-border-strong bg-bg-primary overflow-x-auto">
        {/* Table Header */}
        <div className="grid grid-cols-[110px_1fr_170px_80px_130px_90px] items-center px-6 py-4 bg-bg-secondary border-b-2 border-border-strong gap-6 min-w-[850px]">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-text-secondary">Date</div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-text-secondary">Operation</div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-text-secondary">Domain & Pillar</div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-text-secondary text-center">Priority</div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-text-secondary text-center">Details</div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-text-secondary text-right">XP</div>
        </div>

        {/* Entries */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="text-sm font-mono text-text-muted uppercase tracking-widest flex items-center gap-3">
              <Zap size={16} className="animate-spin text-accent" />
              Retrieving multi-domain combat telemetry...
            </div>
          </div>
        ) : paginatedLogs.length > 0 ? (
          paginatedLogs.map((entry) => {
            const badge = getDomainBadge(entry.category);
            const BadgeIcon = badge.icon;

            return (
              <div 
                key={entry.id}
                className="grid grid-cols-[110px_1fr_170px_80px_130px_90px] items-center px-6 py-4 border-b border-border-subtle gap-6 hover:bg-bg-tertiary transition-colors min-w-[850px]"
              >
                {/* Date & Time */}
                <div>
                  <div className="text-xs font-mono font-bold text-text-primary">{entry.date}</div>
                  <div className="text-3xs font-mono text-text-muted mt-0.5">{entry.time}</div>
                </div>

                {/* Operation Title & Subtitle */}
                <div className="min-w-0 pr-4">
                  <div className="text-sm font-bold text-text-primary truncate">{entry.title}</div>
                  <div className="text-xs font-mono text-text-muted mt-1 truncate">{entry.subtitle}</div>
                </div>

                {/* Domain & SubDomain Badge */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 text-3xs font-mono font-bold uppercase tracking-wider border ${badge.borderStyle} flex items-center gap-1`}>
                      <BadgeIcon size={10} />
                      {badge.label}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-text-secondary">
                    {entry.subDomain}
                  </span>
                </div>

                {/* Priority */}
                <div className="text-center text-xs font-mono">
                  <span className={`px-1.5 py-0.5 border ${
                    entry.priority >= 4 
                      ? 'border-accent/50 text-accent font-bold bg-accent/5' 
                      : entry.priority >= 3 
                        ? 'border-border-strong text-text-primary font-semibold' 
                        : 'border-transparent text-text-secondary'
                  }`}>
                    P{entry.priority}
                  </span>
                </div>

                {/* Details / AI Verdict */}
                <div className="text-center text-xs font-mono">
                  {entry.aiVerdict !== '-' ? (
                    <span className="px-2 py-0.5 border border-border-strong bg-bg-secondary text-text-primary font-bold text-2xs uppercase">
                      {entry.aiVerdict}
                    </span>
                  ) : (
                    <span className="text-text-muted opacity-40">—</span>
                  )}
                </div>

                {/* XP */}
                <div className="text-right text-sm font-mono font-black text-text-primary">
                  +{entry.exp}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 border-b border-border-subtle">
            <div className="text-lg font-bold text-text-primary mb-2">No Operations Logged</div>
            <div className="text-sm font-mono text-text-secondary uppercase mb-4">
              {allLogs.length === 0 ? 'Your combat history is empty.' : 'No entries match your current filter parameters.'}
            </div>
            {allLogs.length > 0 && (
              <button
                onClick={() => {
                  setDomainFilter('all');
                  setSubDomainFilter('all');
                  setTimeFilter('all');
                  setSearchQuery('');
                  setSearchParams({ domain: 'all' });
                }}
                className="btn-secondary text-xs font-mono uppercase tracking-widest px-4 py-2"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex justify-between items-center px-6 py-4 bg-bg-secondary border-t border-border-strong">
          <button 
            className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed" 
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          
          <div className="text-xs font-mono text-text-muted uppercase">
            Showing {filteredLogs.length > 0 ? page * PAGE_SIZE + 1 : 0} - {Math.min((page + 1) * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length} operations • Page {page + 1} of {totalPages}
          </div>

          <button 
            className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed" 
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
