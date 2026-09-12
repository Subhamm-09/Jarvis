import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../types';
import { MoreVertical } from 'lucide-react';

interface TaskRowProps {
  task: Task;
  reason?: string | null;
  aiScore?: number | null;
  isManualMode?: boolean;
  onClick?: () => void;
  onAddToCollection?: (taskId: string) => void;
}

const priorityConfig: Record<number, { label: string, colorClass: string }> = {
  5: { label: 'CRITICAL', colorClass: 'text-accent font-bold' },
  4: { label: 'HIGH', colorClass: 'text-text-primary font-semibold' },
  3: { label: 'MEDIUM', colorClass: 'text-text-secondary' },
  2: { label: 'LOW', colorClass: 'text-text-muted' },
  1: { label: 'TRIVIAL', colorClass: 'text-text-muted opacity-70' },
};

const statusConfig = {
  todo: { label: 'PENDING', className: 'text-text-secondary' },
  in_progress: { label: 'ACTIVE', className: 'text-accent font-semibold' },
  done: { label: 'COMPLETE', className: 'text-success font-semibold' },
};

function getDaysLeft(deadline: string | null): string {
  if (!deadline) return '—';
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'OVERDUE';
  if (days === 0) return 'TODAY';
  if (days === 1) return '1 DAY';
  return `${days} DAYS`;
}

export function TaskRow({ task, reason, aiScore, isManualMode, onClick, onAddToCollection }: TaskRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || 'transform 250ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 50 : 1,
    position: 'relative' as const,
  };

  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
  const priority = priorityConfig[task.priority] || priorityConfig[3];
  const daysLeft = getDaysLeft(task.deadline ?? null);
  const isOverdue = daysLeft === 'OVERDUE';

  return (
      <div
        ref={setNodeRef}
      className={`data-row group relative grid-cols-[1fr_120px_100px_90px_100px] gap-4 items-center pl-4 ${
        isDragging ? 'shadow-2xl ring-1 ring-border-strong bg-bg-secondary scale-[1.02] cursor-grabbing' : (isManualMode ? 'cursor-grab hover:bg-bg-tertiary' : '')
      }`}
      style={{ ...style, gridTemplateColumns: '1fr 120px 100px 90px 100px' }}
      {...(isManualMode ? attributes : {})}
      {...(isManualMode ? listeners : {})}
      onClick={() => {
        if (!isDragging && onClick) onClick();
      }}
    >
      <div className="min-w-0 pr-4 border-r border-border-subtle flex flex-col justify-center">
        <div className="text-sm text-text-primary font-semibold truncate mb-1">{task.title}</div>
        <div className="flex flex-col gap-0.5">
          <div className="text-xs font-mono text-text-muted uppercase tracking-wider">{task.domain}</div>
          {reason && (
            <div className="text-[10px] italic text-text-muted pl-2 border-l border-border-strong mt-0.5 leading-relaxed">
              "{reason}"
            </div>
          )}
        </div>
      </div>
      <div className="text-xs font-mono">
        <span className={priority.colorClass}>{priority.label}</span>
      </div>
      <div className={`text-xs font-mono text-right ${isOverdue ? 'text-accent font-bold' : 'text-text-secondary'}`}>
        {daysLeft}
      </div>
      <div className="text-right">
        <span className={`text-xs font-mono tracking-wider ${status.className}`}>{status.label}</span>
      </div>
      <div className="text-right flex flex-col gap-0.5 items-end relative">
        <div className="flex items-center gap-2">
          {aiScore !== undefined && aiScore !== null && (
            <span className="text-[10px] font-mono font-bold text-accent px-1.5 py-0.5 border border-accent rounded-sm shadow-sm bg-accent/10">
              {aiScore}/100
            </span>
          )}
          <span className="text-xs font-mono text-text-secondary font-semibold">
            {task.effort_estimate_mins || 30}m
          </span>
          <div className="relative">
            <button 
              className="text-text-muted hover:text-text-primary p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onAddToCollection) {
                  setMenuOpen(!menuOpen);
                }
              }}
              onBlur={() => {
                // Hide after small delay to allow click on menu items
                setTimeout(() => setMenuOpen(false), 150);
              }}
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-bg-secondary border border-border-strong shadow-xl z-[100] py-1">
                {onAddToCollection && (
                  <button
                    className="w-full text-left px-4 py-2 text-xs font-mono text-text-primary hover:bg-bg-tertiary transition-colors"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onAddToCollection(task.id);
                      setMenuOpen(false);
                    }}
                  >
                    Add to Collection
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
