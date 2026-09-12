import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface LogEntry {
  id: string;
  date: string;
  title: string;
  domain: string;
  priority: number;
  aiVerdict: string;
  exp: number;
  subtitle: string;
}

const PAGE_SIZE = 20;

export function HuntLogPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get total count
      const { count } = await supabase
        .from('exp_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      setTotalCount(count || 0);

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
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
        .order('awarded_at', { ascending: false })
        .range(from, to);

      if (!error && data) {
        const formattedLogs = data.map((row: any) => {
          const task = row.tasks || {};
          const meta = task.metadata || {};
          
          return {
            id: row.id,
            date: new Date(row.awarded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase(),
            title: task.title || 'Unknown Operation',
            domain: (task.domain || 'general').toUpperCase(),
            priority: task.priority || 1,
            aiVerdict: (task.domain || 'general').toLowerCase() === 'projects' && meta.ai_evaluation 
              ? `${meta.ai_evaluation.overall_score}/10` 
              : '-',
            exp: row.exp_awarded,
            subtitle: (task.domain || 'general').toLowerCase() === 'projects' && meta.ai_evaluation?.justification 
              ? meta.ai_evaluation.justification 
              : `${task.effort_estimate_mins || 30} min • Completed on time`
          };
        });
        setLogs(formattedLogs);
      } else {
        console.error(error);
      }
      setLoading(false);
    };

    fetchLogs();

    const handleUpdate = () => {
      fetchLogs();
    };

    window.addEventListener('exp-awarded', handleUpdate);
    return () => window.removeEventListener('exp-awarded', handleUpdate);
  }, [page]);

  return (
    <div className="max-w-[1200px] mx-auto p-12 mt-6 w-full">
      <button 
        onClick={() => navigate('/dashboard')}
        className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2 hover:text-text-primary text-text-secondary transition-colors mb-12"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      <div className="flex items-end justify-between mb-8 border-b-2 border-text-primary pb-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-text-primary leading-none">Hunt Log</h1>
          <div className="text-sm font-mono text-text-secondary mt-2">Record of Conquests</div>
        </div>
        <div className="flex gap-4">
          <select className="select-system text-xs uppercase tracking-wider py-2">
            <option>All Domains</option>
            <option>LeetCode</option>
            <option>Projects</option>
            <option>Hackathon</option>
          </select>
          <select className="select-system text-xs uppercase tracking-wider py-2">
            <option>All Time</option>
            <option>This Week</option>
            <option>This Month</option>
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div className="flex flex-col">
        {/* Header */}
        <div className="grid grid-cols-[100px_1fr_120px_100px_120px_80px] items-center px-6 py-4 border-b-2 border-border-strong gap-6">
          {['Date', 'Operation', 'Domain', 'Priority', 'AI Verdict', 'XP'].map(h => (
            <div key={h} className={`text-xs font-mono font-bold uppercase tracking-wider text-text-secondary ${h === 'XP' ? 'text-right' : h === 'Priority' || h === 'AI Verdict' ? 'text-center' : ''}`}>
              {h}
            </div>
          ))}
        </div>

        {/* Entries */}
        {loading ? (
           <div className="flex justify-center py-12 border-b border-border-subtle">
             <div className="text-sm font-mono text-text-muted uppercase tracking-widest">Retrieving combat logs...</div>
           </div>
        ) : logs.length > 0 ? (
          logs.map((entry) => (
            <div 
              key={entry.id}
              className="grid grid-cols-[100px_1fr_120px_100px_120px_80px] items-center px-6 py-5 border-b border-border-subtle gap-6 cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="text-xs font-mono text-text-secondary">{entry.date}</div>
              <div className="min-w-0 pr-4">
                <div className="text-sm font-bold text-text-primary truncate">{entry.title}</div>
                <div className="text-xs font-mono text-text-muted mt-1 uppercase">{entry.subtitle}</div>
              </div>
              <div className="text-xs font-mono font-semibold text-text-primary">{entry.domain}</div>
              <div className="text-center text-xs font-mono">
                <span className={entry.priority >= 4 ? 'text-accent font-bold' : entry.priority >= 3 ? 'text-text-primary font-semibold' : 'text-text-secondary'}>
                  P{entry.priority}
                </span>
              </div>
              <div className="text-center text-xs font-mono">
                {entry.domain === 'PROJECTS' ? (
                  <span className="text-text-primary font-semibold">
                    {entry.aiVerdict}
                  </span>
                ) : (
                  <span className="text-text-muted opacity-50">-</span>
                )}
              </div>
              <div className="text-right text-sm font-mono font-bold text-text-primary">+{entry.exp}</div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 border-b border-border-subtle">
            <div className="text-lg font-bold text-text-primary mb-2">No Operations Logged</div>
            <div className="text-sm font-mono text-text-secondary uppercase">Your combat history is empty.</div>
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-between items-center px-6 py-6 border-b border-border-strong">
          <button 
            className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed" 
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <div className="text-xs font-mono text-text-muted uppercase">Page {page + 1} of {totalPages}</div>
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
