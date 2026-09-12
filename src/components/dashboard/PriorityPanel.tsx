import type { Task } from '../../types';
import { RefreshCw, CheckCircle, MoreVertical, GripVertical, Swords, Zap, ShieldAlert } from 'lucide-react';
import { resolveTaskAttribute } from '../../lib/tactileFeedback';
import { leetcode as rankingLeetcode, projects as rankingProjects } from '../../lib/ranking';

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

export function PriorityPanel({ 
  task, 
  reason, 
  aiScore, 
  isPlanning, 
  planMode = 'ai', 
  onComplete, 
  onReplan, 
  onNewTask, 
  onAddToCollection 
}: PriorityPanelProps) {
  if (!task) {
    return (
      <div className="rpg-panel p-6 border-l-4 border-l-accent">
        <div className="flex items-center justify-between mb-5 font-mono">
          <div className="label text-accent font-bold flex items-center gap-2">
            <Swords size={14} className="text-accent" />
            <span>PRIME DIRECTIVE // QUEST STANDBY</span>
          </div>
          {planMode === 'ai' && (
            <button 
              onClick={onReplan} 
              disabled={isPlanning}
              className={`label flex items-center gap-1.5 transition-colors ${isPlanning ? 'text-text-muted cursor-not-allowed' : 'hover:text-accent'}`}
            >
              <RefreshCw size={11} className={isPlanning ? 'animate-[spin_2s_linear_infinite]' : ''} /> 
              <span>{isPlanning ? 'AI TRIAGE ACTIVE...' : 'RE-PLAN AI'}</span>
            </button>
          )}
        </div>
        <div className="empty-state py-8">
          <div className="text-sm font-bold mb-1 text-text-primary uppercase tracking-wider font-mono">NO ACTIVE QUESTS IN QUEUE</div>
          <div className="text-xs text-text-secondary mb-5 font-serif italic">Operational queue is clear. Initialize a new quest to advance your hunter clearance.</div>
          <button onClick={onNewTask} className="btn-primary">
            + INITIALIZE QUEST
          </button>
        </div>
      </div>
    );
  }

  const isBoss = task.priority >= 5 || task.metadata?.difficulty === 'hard';
  const meta = (task.metadata || {}) as Record<string, any>;

  // Compute XP
  let exp = task.effort_estimate_mins || 30;
  if (task.domain === 'leetcode') {
    const diff = (meta.difficulty || 'easy').toLowerCase();
    exp = meta.is_revision ? rankingLeetcode.getExpOnRevision(diff) : rankingLeetcode.getExpOnSolve(diff);
  } else if (task.domain === 'hackathon') {
    exp = meta.action === 'entered' ? 30 : meta.action === 'result' ? 150 : 50;
  } else if (task.domain === 'projects') {
    exp = rankingProjects.getExpFromRating(meta.rating || 7.0) || 100;
  }

  // Attribute Surge
  const attr = resolveTaskAttribute('career', task.domain);

  const daysLeft = task.deadline 
    ? Math.ceil((new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className={`p-6 border transition-all ${
      isBoss 
        ? 'rpg-panel-crimson border-l-4 border-l-crimson' 
        : 'rpg-panel-gold border-l-4 border-l-accent'
    }`}>
      {/* Top Protocol Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 font-mono">
        <div className="flex items-center gap-2">
          {isBoss ? (
            <ShieldAlert size={15} className="text-crimson animate-pulse" />
          ) : (
            <Swords size={15} className="text-accent" />
          )}
          <span className={`label ${isBoss ? 'text-crimson' : 'text-accent'} font-black tracking-widest`}>
            {isBoss ? 'BOSS QUEST // PRIME DIRECTIVE' : 'LEGENDARY QUEST // PRIME DIRECTIVE'}
          </span>
          <span className={`text-3xs px-1.5 py-0.2 border uppercase tracking-wider font-bold ${
            isBoss 
              ? 'bg-crimson/20 border-crimson/50 text-crimson' 
              : 'bg-accent/15 border-accent/50 text-accent'
          }`}>
            {isBoss ? 'CRITICAL THREAT' : 'HIGH PRIORITY'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {planMode === 'ai' && aiScore !== undefined && aiScore !== null && (
            <div className="text-2xs font-mono font-bold text-accent bg-bg-primary px-2 py-0.5 border border-accent/40 shadow-sm">
              AI RANK SCORE: {aiScore}/100
            </div>
          )}

          {planMode === 'manual' && (
            <div className="text-2xs font-mono font-bold uppercase tracking-wider text-text-secondary bg-bg-tertiary px-2 py-0.5 border border-border-strong flex items-center gap-1.5 shadow-sm">
              <GripVertical size={12} className="text-accent" />
              <span>SLIDE PRIORITY ACTIVE</span>
            </div>
          )}

          {planMode === 'ai' && (
            <button 
              onClick={onReplan} 
              disabled={isPlanning}
              className={`text-2xs font-mono uppercase font-bold flex items-center gap-1.5 transition-colors ${
                isPlanning ? 'text-text-muted cursor-not-allowed' : 'text-text-secondary hover:text-accent'
              }`}
            >
              <RefreshCw size={10} className={isPlanning ? 'animate-[spin_2s_linear_infinite]' : ''} /> 
              <span>{isPlanning ? 'TRIAGING...' : 'RE-PLAN AI'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Quest Body Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-5 border border-border-strong bg-bg-tertiary/80">
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="text-lg font-black tracking-tight text-text-primary truncate mb-1 font-display">
            {task.title}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono text-text-secondary">
            <span className="uppercase text-text-muted">{task.domain}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-accent font-bold">
              +{exp} XP
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-text-primary border border-border-strong px-1.5 py-0.2 bg-bg-secondary text-3xs">
              <Zap size={10} className="text-accent" /> {attr.name} +{attr.delta}
            </span>
            {task.effort_estimate_mins && (
              <>
                <span>•</span>
                <span className="text-text-muted">{task.effort_estimate_mins} MIN</span>
              </>
            )}
          </div>

          {reason && (
            <div className="text-xs font-serif italic text-text-muted border-l-2 border-border-strong pl-2.5 mt-2 leading-relaxed">
              "{reason}"
            </div>
          )}
        </div>

        {/* Deadline telemetry */}
        <div className="text-right shrink-0 border-t sm:border-t-0 sm:border-l border-border-strong pt-3 sm:pt-0 sm:pl-5 flex sm:flex-col justify-between items-end">
          <div className="text-xs font-bold font-mono mb-1">
            {daysLeft !== null ? (
              <span className={daysLeft < 0 ? 'text-crimson' : daysLeft === 0 ? 'text-accent' : 'text-text-secondary'}>
                {daysLeft < 0 ? 'EXPIRED' : daysLeft === 0 ? 'DUE TODAY' : `${daysLeft}D REMAINING`}
              </span>
            ) : (
              <span className="text-text-muted">OPEN CADENCE</span>
            )}
          </div>

          {/* Complete / Accept Action */}
          <div className="flex items-center gap-2">
            <button 
              onClick={onComplete}
              className={`btn-primary flex items-center gap-2 !px-4 !py-2 font-mono ${
                isBoss ? 'btn-crimson' : ''
              }`}
            >
              <CheckCircle size={14} /> 
              <span>RESOLVE QUEST</span>
            </button>

            {/* Context Menu */}
            <div className="relative group">
              <button 
                className="text-text-muted hover:text-text-primary p-2 transition-colors"
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
                <MoreVertical size={15} />
              </button>
              <div className="hidden absolute right-0 top-full mt-1 w-44 bg-bg-secondary border border-border-strong shadow-2xl z-[100] py-1 font-mono">
                {onAddToCollection && (
                  <button
                    className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary transition-colors"
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
    </div>
  );
}
