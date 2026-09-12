import { useState, useEffect } from 'react';
import { Trophy, Award, Medal, Check, X, Clock, Plus, ChevronLeft, ChevronRight, Minimize2, Maximize2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { Task } from '../../types';

interface HackathonResultsWidgetProps {
  onOpenNewTask?: () => void;
}

function getDeadlineCountdown(deadline: string | null): { label: string; isUrgent: boolean; targetDate: string } {
  if (!deadline) {
    return { label: 'Ongoing (No deadline)', isUrgent: false, targetDate: 'Open-ended' };
  }
  const dateObj = new Date(deadline);
  const targetDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const diffMs = dateObj.getTime() - Date.now();

  if (diffMs <= 0) {
    return { label: 'Deadline passed', isUrgent: true, targetDate };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 1) return { label: `Deadline in ${days} days`, isUrgent: false, targetDate };
  if (days === 1) return { label: `Deadline tomorrow (${remainingHours}h left)`, isUrgent: true, targetDate };
  if (hours > 0) return { label: `Deadline today (${hours}h left)`, isUrgent: true, targetDate };
  return { label: `Deadline in under an hour!`, isUrgent: true, targetDate };
}

export function HackathonResultsWidget({ onOpenNewTask }: HackathonResultsWidgetProps) {
  const [hackathons, setHackathons] = useState<Task[]>([]);
  const [snoozedIds, setSnoozedIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
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
    return () => window.removeEventListener('exp-awarded', handleUpdate);
  }, []);

  const visibleHackathons = hackathons.filter(h => !snoozedIds.includes(h.id));

  if (visibleHackathons.length === 0) return null;

  const safeIndex = Math.min(currentIndex, visibleHackathons.length - 1);
  const activeHackathon = visibleHackathons[safeIndex];
  if (!activeHackathon) return null;

  const meta = activeHackathon.metadata || {};
  const hackathonName = meta.hackathon_name || activeHackathon.title.replace(/^🏆\s*Hackathon:\s*/i, '').replace(/^🏆\s*Hackathon Entry:\s*/i, '');
  const countdown = getDeadlineCountdown(activeHackathon.deadline ?? null);
  const isDeadlinePassed = (activeHackathon.deadline ? new Date(activeHackathon.deadline).getTime() <= Date.now() : activeHackathon.status === 'done') || forceResultsModeId === activeHackathon.id;

  const handleRecordResult = async (result: 'winner' | 'runner_up' | 'finalist' | 'participated') => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

  const handleSnooze = () => {
    setSnoozedIds(prev => [...prev, activeHackathon.id]);
  };

  // Minimized floating badge
  if (isMinimized && !isDeadlinePassed) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-40 bg-bg-secondary border-2 border-text-primary px-4 py-2 shadow-[4px_4px_0_0_var(--color-text-primary)] cursor-pointer hover:bg-bg-tertiary transition-all flex items-center gap-3 animate-in fade-in"
      >
        <Trophy size={14} className="text-accent" />
        <span className="text-xs font-mono font-bold text-text-primary">{hackathonName}</span>
        <span className="text-[10px] font-mono text-text-secondary bg-bg-primary px-2 py-0.5 border border-border-strong">
          {countdown.label}
        </span>
        <Maximize2 size={12} className="text-text-muted hover:text-text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] bg-bg-secondary border-2 border-text-primary p-5 shadow-[6px_6px_0_0_var(--color-text-primary)] animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-strong pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={16} className={isDeadlinePassed ? 'text-accent' : 'text-text-primary'} />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary">
            {isDeadlinePassed ? 'Results Out?' : 'Hackathon Tracker'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!isDeadlinePassed && (
            <button
              onClick={() => setIsMinimized(true)}
              className="text-text-muted hover:text-text-primary transition-colors p-1"
              title="Minimize to badge"
            >
              <Minimize2 size={13} />
            </button>
          )}
          <button
            onClick={handleSnooze}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
            title="Dismiss for this session"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {successMessage ? (
        <div className="py-4 flex items-center gap-3 text-success">
          <Check size={18} className="shrink-0" />
          <div className="text-xs font-mono font-bold leading-tight">{successMessage}</div>
        </div>
      ) : isDeadlinePassed ? (
        /* PHASE 2: Results Out Resolution */
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-sm font-bold text-text-primary leading-snug">
              {hackathonName}
            </div>
            <div className="text-xs font-mono text-text-muted mt-1">
              {activeHackathon.deadline 
                ? `Deadline passed (${countdown.targetDate}). Mark your final placement:`
                : 'Competition finished. Mark your final placement:'}
            </div>
          </div>

          {/* Outcome Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              disabled={submitting}
              onClick={() => handleRecordResult('winner')}
              className="flex items-center justify-between px-3 py-2 border border-border-strong bg-bg-primary hover:bg-text-primary hover:text-bg-primary transition-colors text-xs font-mono font-bold uppercase group"
            >
              <span className="flex items-center gap-2">
                <Trophy size={14} className="text-accent group-hover:text-bg-primary" />
                Winner / 1st Place
              </span>
              <span className="text-[10px] text-accent group-hover:text-bg-primary">+400 XP</span>
            </button>

            <button
              disabled={submitting}
              onClick={() => handleRecordResult('runner_up')}
              className="flex items-center justify-between px-3 py-2 border border-border-strong bg-bg-primary hover:bg-text-primary hover:text-bg-primary transition-colors text-xs font-mono font-bold uppercase group"
            >
              <span className="flex items-center gap-2">
                <Medal size={14} className="text-text-secondary group-hover:text-bg-primary" />
                Runner Up / Finalist
              </span>
              <span className="text-[10px] text-text-secondary group-hover:text-bg-primary">+150 XP</span>
            </button>

            <button
              disabled={submitting}
              onClick={() => handleRecordResult('participated')}
              className="flex items-center justify-between px-3 py-2 border border-border-strong bg-bg-primary hover:bg-bg-tertiary transition-colors text-xs font-mono text-text-secondary hover:text-text-primary"
            >
              <span className="flex items-center gap-2">
                <Award size={14} />
                Just Participated
              </span>
              <span className="text-[10px] opacity-60">+0 XP</span>
            </button>
          </div>

          {/* Bottom links */}
          <div className="flex justify-between items-center pt-2 border-t border-border-subtle text-[11px] font-mono text-text-muted">
            <button
              onClick={handleSnooze}
              className="hover:text-text-primary flex items-center gap-1.5 transition-colors"
            >
              <Clock size={12} /> Results not out yet
            </button>
            {visibleHackathons.length > 1 && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={safeIndex === 0}
                  className="disabled:opacity-30 hover:text-text-primary p-0.5"
                >
                  <ChevronLeft size={12} />
                </button>
                <span>{safeIndex + 1}/{visibleHackathons.length}</span>
                <button 
                  onClick={() => setCurrentIndex(prev => Math.min(visibleHackathons.length - 1, prev + 1))}
                  disabled={safeIndex === visibleHackathons.length - 1}
                  className="disabled:opacity-30 hover:text-text-primary p-0.5"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* PHASE 1: Ongoing Countdown & Sprint Task Support */
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-sm font-bold text-text-primary leading-snug">
              {hackathonName}
            </div>
            <div className={`text-xs font-mono mt-1.5 px-2.5 py-1.5 border ${countdown.isUrgent ? 'bg-accent/10 border-accent text-accent font-bold' : 'bg-bg-primary border-border-strong text-text-primary font-semibold'}`}>
              ⏱️ {countdown.label}
              {activeHackathon.deadline && (
                <span className="block text-[10px] font-normal text-text-muted mt-0.5">Target: {countdown.targetDate}</span>
              )}
            </div>
          </div>

          <div className="text-xs font-mono text-text-muted leading-relaxed">
            Main event tracked here. Add subtasks to your queue to work on this competition.
          </div>

          <div className="flex items-center gap-2 pt-1">
            {onOpenNewTask && (
              <button
                onClick={onOpenNewTask}
                className="flex-1 btn-primary py-2 text-xs flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Add Sprint Task
              </button>
            )}
            <button
              onClick={() => setForceResultsModeId(activeHackathon.id)}
              className="px-3 py-2 border border-border-strong bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-mono transition-colors"
              title="Click if competition ended early and results are out"
            >
              Results Out?
            </button>
          </div>

          {/* Navigation if multiple */}
          {visibleHackathons.length > 1 && (
            <div className="flex justify-between items-center pt-2 border-t border-border-subtle text-[11px] font-mono text-text-muted">
              <span>Active Hackathon</span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={safeIndex === 0}
                  className="disabled:opacity-30 hover:text-text-primary p-0.5"
                >
                  <ChevronLeft size={12} />
                </button>
                <span>{safeIndex + 1}/{visibleHackathons.length}</span>
                <button 
                  onClick={() => setCurrentIndex(prev => Math.min(visibleHackathons.length - 1, prev + 1))}
                  disabled={safeIndex === visibleHackathons.length - 1}
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
  );
}
