import { Brain, X } from 'lucide-react';
import type { Task } from '../../types';

interface RevisionRecallModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (recallResult: 'easy' | 'struggled' | 'forgot') => void;
}

export function RevisionRecallModal({ task, isOpen, onClose, onSubmit }: RevisionRecallModalProps) {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm">
      <div className="bg-bg-secondary border-2 border-text-primary w-full max-w-md shadow-[8px_8px_0_0_var(--color-text-primary)]">
        
        <div className="flex items-center justify-between p-6 border-b-2 border-text-primary bg-bg-primary">
          <div className="flex items-center gap-2 text-text-primary font-black uppercase tracking-tight text-lg">
            <Brain size={18} /> Revision Protocol
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-text-primary hover:bg-text-primary hover:text-bg-primary transition-colors border border-transparent hover:border-text-primary">
            <X size={16} />
          </button>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-text-primary mb-2">{task.title}</h3>
            <p className="text-sm font-mono text-text-secondary">
              Can you solve this problem without looking at your previous solution?
            </p>
          </div>

          <div className="bg-bg-tertiary border border-border-strong p-5 mb-8">
            <div className="flex justify-between text-xs font-mono font-semibold uppercase text-text-secondary mb-3">
              <span>Revision Iteration</span>
              <span className="text-text-primary">{task.metadata?.revision_number || 1} / 4</span>
            </div>
            <div className="flex justify-between text-xs font-mono font-semibold uppercase text-text-secondary mb-3">
              <span>Original Difficulty</span>
              <span className="text-text-primary">{task.metadata?.difficulty || 'Easy'}</span>
            </div>
            <div className="flex justify-between text-xs font-mono font-semibold uppercase text-text-secondary">
              <span>Scheduled Date</span>
              <span className="text-text-primary">
                {task.deadline ? new Date(task.deadline).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>

          <div className="label text-center mb-4">Select Recall Accuracy</div>
          <div className="flex flex-col gap-3">
            <button onClick={() => onSubmit('easy')} className="p-4 bg-success-muted border border-success hover:bg-success hover:text-bg-primary transition-colors text-left flex flex-col group">
              <div className="text-sm font-bold text-success group-hover:text-bg-primary uppercase tracking-wider mb-1">Easy</div>
              <div className="text-xs font-mono text-text-secondary group-hover:text-bg-primary opacity-80">I remembered the approach perfectly.</div>
            </button>
            <button onClick={() => onSubmit('struggled')} className="p-4 bg-bg-tertiary border border-border-strong hover:bg-text-primary hover:text-bg-primary transition-colors text-left flex flex-col group">
              <div className="text-sm font-bold text-text-primary group-hover:text-bg-primary uppercase tracking-wider mb-1">Struggled</div>
              <div className="text-xs font-mono text-text-secondary group-hover:text-bg-primary opacity-80">I remembered the idea but needed help.</div>
            </button>
            <button onClick={() => onSubmit('forgot')} className="p-4 bg-accent-muted border border-accent hover:bg-accent hover:text-bg-primary transition-colors text-left flex flex-col group">
              <div className="text-sm font-bold text-accent group-hover:text-bg-primary uppercase tracking-wider mb-1">Forgot</div>
              <div className="text-xs font-mono text-text-secondary group-hover:text-bg-primary opacity-80">I could not remember the solution.</div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
