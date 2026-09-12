import type { Task } from '../../types';
import { RefreshCw, CheckCircle, MoreVertical } from 'lucide-react';

interface PriorityPanelProps {
  task: Task | null;
  reason?: string | null;
  aiScore?: number | null;
  isPlanning?: boolean;
  planMode?: 'ai' | 'manual';
  onComplete: () => void;
  onReplan: () => void;
  onNewTask: () => void;
  onAddToCollection?: (taskId: string) => void;
}

export function PriorityPanel({ task, reason, aiScore, isPlanning, planMode = 'ai', onComplete, onReplan, onNewTask, onAddToCollection }: PriorityPanelProps) {
  if (!task) {
    return (
      <div className="panel p-6 border-l-2 border-l-accent">
        <div className="flex items-center justify-between mb-5">
          <div className="label text-accent font-semibold flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            Top Priority
          </div>
          {planMode === 'ai' && (
            <button 
              onClick={onReplan} 
              disabled={isPlanning}
              className={`label flex items-center gap-1.5 transition-colors ${isPlanning ? 'text-text-muted cursor-not-allowed' : 'hover:text-text-primary'}`}
            >
              <RefreshCw size={10} className={isPlanning ? 'animate-[spin_2s_linear_infinite]' : ''} /> 
              {isPlanning ? 'Re-Planning...' : 'Re-Plan'}
            </button>
          )}
        </div>
        <div className="empty-state py-8">
          <div className="text-sm font-semibold mb-1 text-text-primary">No Active Operations</div>
          <div className="text-xs text-text-secondary mb-4 font-mono">Queue is empty. Initialize a new task to begin.</div>
          <button onClick={onNewTask} className="btn-primary">Initialize Task</button>
        </div>
      </div>
    );
  }

  const daysLeft = task.deadline 
    ? Math.ceil((new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="panel p-6 border-l-2 border-l-accent">
      <div className="flex items-center justify-between mb-5">
        <div className="label text-accent font-semibold flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-accent" />
           Top Priority
        </div>
        <div className="flex items-center gap-4">
          {planMode === 'ai' && aiScore !== undefined && aiScore !== null && (
            <div className="text-xs font-mono font-bold text-text-primary bg-bg-primary px-2 py-1 border border-border-strong rounded-sm shadow-sm">
              AI SCORE: {aiScore}/100
            </div>
          )}
          {planMode === 'ai' && (
            <button 
              onClick={onReplan} 
              disabled={isPlanning}
              className={`label flex items-center gap-1.5 transition-colors ${isPlanning ? 'text-text-muted cursor-not-allowed' : 'hover:text-text-primary'}`}
            >
              <RefreshCw size={10} className={isPlanning ? 'animate-[spin_2s_linear_infinite]' : ''} /> 
              {isPlanning ? 'Re-Planning...' : 'Re-Plan'}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-5 p-4 border border-border-subtle bg-bg-tertiary">
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="text-base text-text-primary font-bold truncate mb-1">{task.title}</div>
          <div className="text-xs font-mono text-text-secondary mb-2">
            <span className="uppercase">{task.domain}</span> • PRIORITY {task.priority} 
            {task.effort_estimate_mins && ` • EST. ${task.effort_estimate_mins} MIN`}
          </div>
          {reason && (
            <div className="text-xs italic text-text-muted border-l-2 border-border-strong pl-2 mt-1">
              " {reason} "
            </div>
          )}
        </div>
        <div className="text-right shrink-0 border-l border-border-strong pl-5 mr-4 hidden sm:block">
          <div className="text-xs font-bold text-accent font-mono mb-1">
            {daysLeft !== null 
              ? daysLeft < 0 ? 'OVERDUE' : daysLeft === 0 ? 'TODAY' : `${daysLeft} DAYS LEFT`
              : 'NO DEADLINE'
            }
          </div>
          <div className="text-xs font-mono text-text-primary">+{task.effort_estimate_mins || 30} XP</div>
        </div>
        <div className="flex items-center gap-2 relative group">
          <button 
            onClick={onComplete}
            className="btn-primary flex items-center gap-2 !bg-success text-bg-primary hover:!bg-success-muted hover:text-success border border-transparent hover:border-success transition-all"
          >
            <CheckCircle size={14} /> Complete
          </button>
          
          <div className="relative">
            <button 
              className="text-text-muted hover:text-text-primary p-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onAddToCollection) {
                  const menu = e.currentTarget.nextElementSibling;
                  if (menu) menu.classList.toggle('hidden');
                }
              }}
              onBlur={(e) => {
                const menu = e.currentTarget.nextElementSibling;
                if (menu) setTimeout(() => menu.classList.add('hidden'), 150);
              }}
            >
              <MoreVertical size={16} />
            </button>
            <div className="hidden absolute right-0 top-full mt-1 w-48 bg-bg-secondary border border-border-strong shadow-xl z-[100] py-1">
              {onAddToCollection && (
                <button
                  className="w-full text-left px-4 py-2 text-xs font-mono text-text-primary hover:bg-bg-tertiary transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCollection(task.id);
                  }}
                >
                  Add to Collection
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
