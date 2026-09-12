import { useState, useEffect } from 'react';
import { Trophy, Award, Medal, Check, Clock, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { Task, Domain } from '../../types';

interface HackathonTrackerPanelProps {
  onOpenNewTask?: (initialDomain?: Domain) => void;
}

function getDeadlineCountdown(deadline: string | null): { label: string; isUrgent: boolean; targetDate: string } {
  if (!deadline) {
    return { label: 'Ongoing (No deadline)', isUrgent: false, targetDate: 'Open-ended' };
  }
  const dateObj = new Date(deadline);
  const targetDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const diffMs = dateObj.getTime() - Date.now();

  if (diffMs <= 0) {
    return { label: 'Deadline crossed', isUrgent: true, targetDate };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 1) return { label: `Deadline coming in ${days} days`, isUrgent: false, targetDate };
  if (days === 1) return { label: `Deadline tomorrow (${remainingHours}h remaining)`, isUrgent: true, targetDate };
  if (hours > 0) return { label: `Deadline today (${hours}h remaining)`, isUrgent: true, targetDate };
  return { label: `Deadline in under an hour!`, isUrgent: true, targetDate };
}

export function HackathonTrackerPanel({ onOpenNewTask }: HackathonTrackerPanelProps) {
  const [hackathons, setHackathons] = useState<Task[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [forceResultsModeId, setForceResultsModeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchHackathons = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('domain', 'hackathon')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Filter to primary hackathon entries whose results have not yet been logged
        const activeEntries = (data as Task[]).filter(t => {
          const meta = t.metadata || {};
          const isPrimary = meta.is_primary_entry !== false && meta.action !== 'result' && meta.action !== 'task';
          const resultsLogged = meta.results_logged === true || !!meta.result;
          return isPrimary && !resultsLogged;
        });

        // Sort: items whose deadline passed or is done first, then upcoming by nearest deadline
        activeEntries.sort((a, b) => {
          const nowMs = Date.now();
          const aPassed = (a.deadline ? new Date(a.deadline).getTime() <= nowMs : a.status === 'done') ? 1 : 0;
          const bPassed = (b.deadline ? new Date(b.deadline).getTime() <= nowMs : b.status === 'done') ? 1 : 0;
          if (aPassed !== bPassed) return bPassed - aPassed;

          const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
          const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        });

        setHackathons(activeEntries);
      }
    } catch (err) {
      console.error("Failed to fetch hackathon tracker data:", err);
    }
  };

  useEffect(() => {
    fetchHackathons();

    const handleUpdate = () => {
      fetchHackathons();
    };

    window.addEventListener('exp-awarded', handleUpdate);
    window.addEventListener('task-created', handleUpdate);
    return () => {
      window.removeEventListener('exp-awarded', handleUpdate);
      window.removeEventListener('task-created', handleUpdate);
    };
  }, []);

  const safeIndex = Math.min(currentIndex, Math.max(0, hackathons.length - 1));
  const activeHackathon = hackathons[safeIndex];

  const handleRecordResult = async (result: 'winner' | 'runner_up' | 'finalist' | 'participated') => {
    if (!activeHackathon) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const meta = activeHackathon.metadata || {};
      const hackathonName = meta.hackathon_name || activeHackathon.title.replace(/^🏆\s*Hackathon:\s*/i, '').replace(/^🏆\s*Hackathon Entry:\s*/i, '');

      // Fire exp-awarded event immediately (<1ms) so navbar & dashboard react instantly
      const optimisticBonus = (result === 'winner' ? 400 : (result === 'runner_up' || result === 'finalist') ? 150 : 0) + 30;
      window.dispatchEvent(new CustomEvent('exp-awarded', { detail: { exp: optimisticBonus } }));

      // 1. Mark original hackathon task as completed & results logged
      const updatedMeta = {
        ...meta,
        result: result === 'runner_up' ? 'finalist' : result,
        results_logged: true,
        result_logged_at: new Date().toISOString()
      };

      await supabase
        .from('tasks')
        .update({
          status: 'done',
          metadata: updatedMeta,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeHackathon.id);

      // Award entry EXP (+30 EXP) if not already awarded
      await supabase.functions.invoke('award-exp', {
        body: { task_id: activeHackathon.id }
      });

      // 2. If winner or finalist, insert result entry task to award bonus EXP (+400 or +150)
      if (result === 'winner' || result === 'runner_up' || result === 'finalist') {
        const bonusLabel = result === 'winner' ? 'WINNER (+400 XP)' : 'RUNNER UP / FINALIST (+150 XP)';
        const normalizedResult = result === 'runner_up' ? 'finalist' : result;

        const { data: resultTask, error: insertError } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title: `🏆 Hackathon Result: ${hackathonName} (${bonusLabel})`,
            domain: 'hackathon',
            status: 'done',
            priority: 5,
            effort_estimate_mins: 0,
            metadata: {
              action: 'result',
              result: normalizedResult,
              hackathon_name: hackathonName,
              original_task_id: activeHackathon.id
            }
          })
          .select()
          .single();

        if (!insertError && resultTask) {
          await supabase.functions.invoke('award-exp', {
            body: { task_id: resultTask.id }
          });
        }
      }

      // 3. Dispatch global exp-awarded event
      window.dispatchEvent(new CustomEvent('exp-awarded'));

      const messageLabel = result === 'winner' 
        ? '🏆 Winner logged! +400 bonus XP awarded.' 
        : result === 'runner_up' || result === 'finalist'
        ? '🥈 Runner Up / Finalist logged! +150 bonus XP awarded.'
        : '🎖️ Participation logged for this competition.';

      setSuccessMessage(messageLabel);

      setTimeout(() => {
        setSuccessMessage(null);
        setHackathons(prev => prev.filter(h => h.id !== activeHackathon.id));
      }, 2000);

    } catch (err) {
      console.error("Error logging hackathon outcome:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // EMPTY STATE: No active competitions registered
  if (!activeHackathon) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="label flex items-center justify-between border-b border-border-strong pb-2">
          <span className="flex items-center gap-2">
            <Trophy size={14} /> Hackathon Radar
          </span>
          <span className="text-[10px] font-mono text-text-muted">STANDBY</span>
        </h2>
        <div className="bg-bg-secondary border-2 border-border-strong p-5 flex flex-col gap-3">
          <div className="text-sm font-bold text-text-primary">No Active Hackathons</div>
          <div className="text-xs font-mono text-text-secondary leading-relaxed">
            Register a competition to track deadlines and resolve outcomes directly on your dashboard.
          </div>
          {onOpenNewTask && (
            <button
              onClick={() => onOpenNewTask('hackathon')}
              className="btn-secondary py-2 text-xs flex items-center justify-center gap-2 w-full mt-1"
            >
              <Plus size={14} /> Register Hackathon
            </button>
          )}
        </div>
      </section>
    );
  }

  const meta = activeHackathon.metadata || {};
  const hackathonName = meta.hackathon_name || activeHackathon.title.replace(/^🏆\s*Hackathon:\s*/i, '').replace(/^🏆\s*Hackathon Entry:\s*/i, '');
  const countdown = getDeadlineCountdown(activeHackathon.deadline ?? null);
  const isDeadlinePassed = (activeHackathon.deadline ? new Date(activeHackathon.deadline).getTime() <= Date.now() : activeHackathon.status === 'done') || forceResultsModeId === activeHackathon.id;

  return (
    <section className="flex flex-col gap-3">
      {/* Header */}
      <h2 className="label flex items-center justify-between border-b border-border-strong pb-2">
        <span className="flex items-center gap-2">
          <Trophy size={14} className={isDeadlinePassed ? 'text-accent' : 'text-text-primary'} />
          Hackathon Radar
        </span>
        <span className={`text-[10px] font-mono px-2 py-0.5 border ${isDeadlinePassed ? 'bg-accent/10 border-accent text-accent font-bold animate-pulse' : 'bg-bg-tertiary border-border-strong text-text-secondary'}`}>
          {isDeadlinePassed ? 'RESULTS OUT?' : 'ACTIVE'}
        </span>
      </h2>

      {/* Main Card */}
      <div className="bg-bg-secondary border-2 border-text-primary p-5 shadow-[4px_4px_0_0_var(--color-text-primary)] flex flex-col gap-4">
        {successMessage ? (
          <div className="py-6 flex items-center gap-3 text-success">
            <Check size={20} className="shrink-0" />
            <div className="text-xs font-mono font-bold leading-tight">{successMessage}</div>
          </div>
        ) : isDeadlinePassed ? (
          /* PHASE 2: Results Out State */
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-base font-black text-text-primary leading-tight">
                {hackathonName}
              </div>
              <div className="text-xs font-mono text-accent font-bold mt-1">
                Deadline crossed ({countdown.targetDate}).
              </div>
              <div className="text-xs font-mono text-text-secondary mt-0.5">
                Have the results been announced? Mark your placement:
              </div>
            </div>

            {/* Outcome Options */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                disabled={submitting}
                onClick={() => handleRecordResult('winner')}
                className="flex items-center justify-between px-3.5 py-2.5 border border-border-strong bg-bg-primary hover:bg-text-primary hover:text-bg-primary transition-colors text-xs font-mono font-bold uppercase group"
              >
                <span className="flex items-center gap-2">
                  <Trophy size={14} className="text-accent group-hover:text-bg-primary" />
                  Winner / 1st Place
                </span>
                <span className="text-[11px] text-accent group-hover:text-bg-primary">+400 XP</span>
              </button>

              <button
                disabled={submitting}
                onClick={() => handleRecordResult('runner_up')}
                className="flex items-center justify-between px-3.5 py-2.5 border border-border-strong bg-bg-primary hover:bg-text-primary hover:text-bg-primary transition-colors text-xs font-mono font-bold uppercase group"
              >
                <span className="flex items-center gap-2">
                  <Medal size={14} className="text-text-secondary group-hover:text-bg-primary" />
                  Runner Up / Finalist
                </span>
                <span className="text-[11px] text-text-secondary group-hover:text-bg-primary">+150 XP</span>
              </button>

              <button
                disabled={submitting}
                onClick={() => handleRecordResult('participated')}
                className="flex items-center justify-between px-3.5 py-2.5 border border-border-strong bg-bg-primary hover:bg-bg-tertiary transition-colors text-xs font-mono text-text-secondary hover:text-text-primary"
              >
                <span className="flex items-center gap-2">
                  <Award size={14} />
                  Just Participated
                </span>
                <span className="text-[11px] opacity-60">+0 XP</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-[11px] font-mono text-text-muted">
              <span className="flex items-center gap-1.5">
                <Clock size={12} /> Awaiting final announcement
              </span>
              {hackathons.length > 1 && (
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    disabled={safeIndex === 0}
                    className="disabled:opacity-30 hover:text-text-primary p-0.5"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <span>{safeIndex + 1}/{hackathons.length}</span>
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.min(hackathons.length - 1, prev + 1))}
                    disabled={safeIndex === hackathons.length - 1}
                    className="disabled:opacity-30 hover:text-text-primary p-0.5"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* PHASE 1: Ongoing Countdown State */
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-base font-black text-text-primary leading-tight">
                {hackathonName}
              </div>
              <div className={`text-xs font-mono mt-2 px-3 py-2 border ${countdown.isUrgent ? 'bg-accent/10 border-accent text-accent font-bold' : 'bg-bg-primary border-border-strong text-text-primary font-semibold'}`}>
                ⏱️ {countdown.label}
                {activeHackathon.deadline && (
                  <span className="block text-[10px] font-normal text-text-muted mt-0.5">Target: {countdown.targetDate}</span>
                )}
              </div>
            </div>

            <div className="text-xs font-mono text-text-secondary leading-relaxed">
              Main competition tracked here. Add sprint tasks below to build towards submission.
            </div>

            <div className="flex items-center gap-2 pt-1">
              {onOpenNewTask && (
                <button
                  onClick={() => onOpenNewTask('hackathon')}
                  className="flex-1 btn-primary py-2 text-xs flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Add Sprint Task
                </button>
              )}
              <button
                onClick={() => setForceResultsModeId(activeHackathon.id)}
                className="px-3 py-2 border border-border-strong bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-mono transition-colors"
                title="If results are already out"
              >
                Results Out?
              </button>
            </div>

            {/* Navigation if multiple */}
            {hackathons.length > 1 && (
              <div className="flex justify-between items-center pt-2 border-t border-border-subtle text-[11px] font-mono text-text-muted">
                <span>Active Competitions</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    disabled={safeIndex === 0}
                    className="disabled:opacity-30 hover:text-text-primary p-0.5"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <span>{safeIndex + 1}/{hackathons.length}</span>
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.min(hackathons.length - 1, prev + 1))}
                    disabled={safeIndex === hackathons.length - 1}
                    className="disabled:opacity-30 hover:text-text-primary p-0.5"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
