import { useState, useEffect } from 'react';
import { Moon, Dumbbell, Check, Plus, Flame } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { HealthTask } from '../../types';

interface HealthTrackerPanelProps {
  onOpenNewTask?: () => void;
  onRefresh?: () => void;
}

export function HealthTrackerPanel({ onOpenNewTask, onRefresh }: HealthTrackerPanelProps) {
  const [activeWorkouts, setActiveWorkouts] = useState<HealthTask[]>([]);

  const fetchWorkouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('health_tasks')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'done')
        .in('pillar', ['strength', 'endurance'])
        .order('priority', { ascending: false })
        .limit(3);

      setActiveWorkouts((data as HealthTask[]) || []);
    } catch (err) {
      console.error('Health workouts fetch error:', err);
    }
  };

  useEffect(() => {
    fetchWorkouts();

    const handleUpdate = () => fetchWorkouts();
    window.addEventListener('health-exp-awarded', handleUpdate);
    window.addEventListener('health-task-created', handleUpdate);
    return () => {
      window.removeEventListener('health-exp-awarded', handleUpdate);
      window.removeEventListener('health-task-created', handleUpdate);
    };
  }, []);

  const handleComplete = async (taskId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('health_tasks')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('id', taskId);

      await supabase
        .from('health_exp_log')
        .insert({
          user_id: user.id,
          task_id: taskId,
          pillar: 'strength',
          exp_awarded: 35,
          metadata: { completed_via: 'radar' },
        });

      window.dispatchEvent(new CustomEvent('health-exp-awarded'));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Sleep & Circadian Anchor Radar */}
      <section className="flex flex-col gap-2">
        <h2 className="label flex items-center justify-between border-b border-border-strong pb-2">
          <span className="flex items-center gap-2">
            <Moon size={14} className="text-accent" />
            Circadian Recovery Radar
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 border bg-bg-tertiary border-border-strong text-text-secondary">
            ANCHOR: 23:00
          </span>
        </h2>

        <div className="bg-bg-secondary border-2 border-text-primary p-5 shadow-[4px_4px_0_0_var(--color-text-primary)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-text-primary uppercase">
              Target 8h Sleep Cycle
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-accent font-bold">
              <Flame size={13} />
              <span>OPTIMAL</span>
            </div>
          </div>
          <p className="text-xs font-mono text-text-secondary leading-relaxed">
            Neurological baseline recovery. Target sleep window: 11:00 PM – 07:00 AM.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 bg-bg-tertiary border border-border-subtle p-2 text-center">
              <div className="text-[10px] font-mono uppercase text-text-muted">Target Duration</div>
              <div className="text-xs font-bold font-mono text-text-primary">8.0 Hours</div>
            </div>
            <div className="flex-1 bg-bg-tertiary border border-border-subtle p-2 text-center">
              <div className="text-[10px] font-mono uppercase text-text-muted">Hydration Goal</div>
              <div className="text-xs font-bold font-mono text-accent">3.0 Liters</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Physical Training Queue */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-border-strong pb-2">
          <h2 className="label flex items-center gap-2">
            <Dumbbell size={14} className="text-text-primary" />
            Active Physical Protocols
          </h2>
          {onOpenNewTask && (
            <button
              onClick={onOpenNewTask}
              className="text-text-muted hover:text-text-primary transition-colors p-0.5"
              title="Add training session"
            >
              <Plus size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {activeWorkouts.length > 0 ? (
            activeWorkouts.map(t => (
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
                  title="Mark protocol completed"
                >
                  <Check size={13} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state py-6">
              <span className="text-xs font-mono text-text-muted">No active training sessions.</span>
              {onOpenNewTask && (
                <button
                  onClick={onOpenNewTask}
                  className="btn-secondary text-2xs py-1.5 px-3 mt-2 font-mono uppercase"
                >
                  Schedule Workout
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
