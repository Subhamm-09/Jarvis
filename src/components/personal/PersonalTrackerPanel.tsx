import { useState, useEffect } from 'react';
import { BookOpen, Brain, Check, Plus, Bookmark } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { PersonalTask } from '../../types';

interface PersonalTrackerPanelProps {
  onOpenNewTask?: () => void;
  onRefresh?: () => void;
}

export function PersonalTrackerPanel({ onOpenNewTask, onRefresh }: PersonalTrackerPanelProps) {
  const [activeQuests, setActiveQuests] = useState<PersonalTask[]>([]);

  const fetchQuests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('personal_tasks')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'done')
        .in('pillar', ['intellect', 'mindfulness', 'creativity'])
        .order('priority', { ascending: false })
        .limit(3);

      setActiveQuests((data as PersonalTask[]) || []);
    } catch (err) {
      console.error('Personal fetch error:', err);
    }
  };

  useEffect(() => {
    fetchQuests();

    const handleUpdate = () => fetchQuests();
    window.addEventListener('personal-exp-awarded', handleUpdate);
    window.addEventListener('personal-task-created', handleUpdate);
    return () => {
      window.removeEventListener('personal-exp-awarded', handleUpdate);
      window.removeEventListener('personal-task-created', handleUpdate);
    };
  }, []);

  const handleComplete = async (taskId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('personal_tasks')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('id', taskId);

      await supabase
        .from('personal_exp_log')
        .insert({
          user_id: user.id,
          task_id: taskId,
          pillar: 'intellect',
          exp_awarded: 35,
          metadata: { completed_via: 'radar' },
        });

      window.dispatchEvent(new CustomEvent('personal-exp-awarded'));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Deep Reading Radar */}
      <section className="flex flex-col gap-2">
        <h2 className="label flex items-center justify-between border-b border-border-strong pb-2">
          <span className="flex items-center gap-2">
            <BookOpen size={14} className="text-accent" />
            Deep Reading Radar
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 border bg-bg-tertiary border-border-strong text-text-secondary">
            INTELLECT
          </span>
        </h2>

        <div className="bg-bg-secondary border-2 border-text-primary p-5 shadow-[4px_4px_0_0_var(--color-text-primary)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-text-primary uppercase">
              Active Treatise Study
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-accent font-bold">
              <Bookmark size={13} />
              <span>ACTIVE</span>
            </div>
          </div>
          <p className="text-xs font-mono text-text-secondary leading-relaxed">
            Non-fiction synthesis & philosophical foundation. Target: 25-30 pages/day.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 bg-bg-tertiary border border-border-subtle p-2 text-center">
              <div className="text-[10px] font-mono uppercase text-text-muted">Daily Target</div>
              <div className="text-xs font-bold font-mono text-text-primary">30 Pages</div>
            </div>
            <div className="flex-1 bg-bg-tertiary border border-border-subtle p-2 text-center">
              <div className="text-[10px] font-mono uppercase text-text-muted">Meditation Anchor</div>
              <div className="text-xs font-bold font-mono text-accent">20 Minutes</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Mastery & Mind Queue */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-border-strong pb-2">
          <h2 className="label flex items-center gap-2">
            <Brain size={14} className="text-text-primary" />
            Active Mind Protocols
          </h2>
          {onOpenNewTask && (
            <button
              onClick={onOpenNewTask}
              className="text-text-muted hover:text-text-primary transition-colors p-0.5"
              title="Add mind quest"
            >
              <Plus size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {activeQuests.length > 0 ? (
            activeQuests.map(t => (
              <div 
                key={t.id}
                className="panel p-3 flex items-center justify-between hover:border-text-primary transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <div className="text-xs font-bold text-text-primary truncate">{t.title}</div>
                  <div className="text-[10px] font-mono text-text-secondary uppercase mt-0.5">
                    {t.pillar} &bull; P{t.priority} &bull; {t.effort_estimate_mins}m
                  </div>
                </div>
                <button
                  onClick={() => handleComplete(t.id)}
                  className="p-1.5 border border-border-strong hover:bg-success hover:text-bg-primary hover:border-success transition-all shrink-0"
                  title="Mark quest completed"
                >
                  <Check size={13} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state py-6">
              <span className="text-xs font-mono text-text-muted">No active mind quests.</span>
              {onOpenNewTask && (
                <button
                  onClick={onOpenNewTask}
                  className="btn-secondary text-2xs py-1.5 px-3 mt-2 font-mono uppercase"
                >
                  Schedule Quest
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
