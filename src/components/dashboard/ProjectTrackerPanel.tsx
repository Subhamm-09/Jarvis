import { useState, useEffect } from 'react';
import { FolderGit2, Check, Clock, Plus, ChevronLeft, ChevronRight, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { Task, Domain } from '../../types';
import { projects as rankingProjects } from '../../lib/ranking';

interface ProjectTrackerPanelProps {
  onOpenNewTask?: (initialDomain?: Domain) => void;
}

function getDeadlineCountdown(deadline: string | null): { label: string; isUrgent: boolean; targetDate: string } {
  if (!deadline) {
    return { label: 'Ongoing (No target date)', isUrgent: false, targetDate: 'Open-ended' };
  }
  const dateObj = new Date(deadline);
  const targetDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const diffMs = dateObj.getTime() - Date.now();

  if (diffMs <= 0) {
    return { label: 'Target date crossed', isUrgent: true, targetDate };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 1) return { label: `Target launch in ${days} days`, isUrgent: false, targetDate };
  if (days === 1) return { label: `Target launch tomorrow (${remainingHours}h remaining)`, isUrgent: true, targetDate };
  if (hours > 0) return { label: `Target launch today (${hours}h remaining)`, isUrgent: true, targetDate };
  return { label: `Target launch in under an hour!`, isUrgent: true, targetDate };
}

export function ProjectTrackerPanel({ onOpenNewTask }: ProjectTrackerPanelProps) {
  const [activeProjects, setActiveProjects] = useState<Task[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [forceReviewModeId, setForceReviewModeId] = useState<string | null>(null);
  const [submittingMode, setSubmittingMode] = useState<'ai_evaluate' | 'mark_shipped' | null>(null);
  const evaluating = submittingMode !== null;
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('domain', 'projects')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Filter to primary project entries whose completion has not yet been resolved
        const activeEntries = (data as Task[]).filter(t => {
          const meta = t.metadata || {};
          const isPrimary = meta.is_primary_entry !== false && meta.action !== 'task';
          const completed = t.status === 'done' && (meta.completed === true || !!meta.ai_evaluation);
          return isPrimary && !completed;
        });

        // Sort: items whose target date passed or status is done first, then upcoming
        activeEntries.sort((a, b) => {
          const nowMs = Date.now();
          const aPassed = (a.deadline ? new Date(a.deadline).getTime() <= nowMs : a.status === 'done') ? 1 : 0;
          const bPassed = (b.deadline ? new Date(b.deadline).getTime() <= nowMs : b.status === 'done') ? 1 : 0;
          if (aPassed !== bPassed) return bPassed - aPassed;

          const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
          const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        });

        setActiveProjects(activeEntries);
      }
    } catch (err) {
      console.error("Failed to fetch project tracker data:", err);
    }
  };

  useEffect(() => {
    fetchProjects();

    const handleUpdate = () => {
      fetchProjects();
    };

    window.addEventListener('exp-awarded', handleUpdate);
    window.addEventListener('task-created', handleUpdate);
    return () => {
      window.removeEventListener('exp-awarded', handleUpdate);
      window.removeEventListener('task-created', handleUpdate);
    };
  }, []);

  const safeIndex = Math.min(currentIndex, Math.max(0, activeProjects.length - 1));
  const activeProject = activeProjects[safeIndex];

  useEffect(() => {
    if (activeProject) {
      const meta = activeProject.metadata || {};
      setRepoUrlInput((meta.url as string) || '');
    }
  }, [activeProject]);

  const handleShipProject = async (mode: 'ai_evaluate' | 'mark_shipped') => {
    if (!activeProject) return;
    setSubmittingMode(mode);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const meta = activeProject.metadata || {};
      const projectName = meta.project_name || activeProject.title.replace(/^🚀\s*Project:\s*/i, '');
      const finalUrl = repoUrlInput.trim() || (meta.url as string) || '';

      let awardedExp = 100;
      let aiEvaluation: any = null;

      if (mode === 'ai_evaluate') {
        const { data: raterData, error: raterError } = await supabase.functions.invoke('project-rater', {
          body: {
            description: meta.description || activeProject.title,
            url: finalUrl || undefined
          }
        });

        if (!raterError && raterData) {
          aiEvaluation = raterData;
          const rating = raterData.overall_score || 7.0;
          awardedExp = rankingProjects.getExpFromRating(rating) || 100;
        } else {
          console.warn("AI evaluation fallback to baseline:", raterError);
          awardedExp = 125;
        }
      }

      // Optimistic event dispatch
      window.dispatchEvent(new CustomEvent('exp-awarded', { detail: { exp: awardedExp } }));

      // 1. Update project task status to done with evaluation metadata
      const updatedMeta = {
        ...meta,
        url: finalUrl,
        completed: true,
        completed_at: new Date().toISOString(),
        ...(aiEvaluation ? { ai_evaluation: aiEvaluation } : { rating: 7.0 })
      };

      await supabase
        .from('tasks')
        .update({
          status: 'done',
          metadata: updatedMeta,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeProject.id);

      // 2. Authoritative EXP log via edge function
      await supabase.functions.invoke('award-exp', {
        body: { task_id: activeProject.id }
      });

      window.dispatchEvent(new CustomEvent('exp-awarded'));
      window.dispatchEvent(new CustomEvent('task-created'));

      const scoreText = aiEvaluation ? `Rating: ${aiEvaluation.overall_score}/10` : 'Shipped';
      setSuccessMessage(`★ ${projectName} Completed! ${scoreText} (+${awardedExp} XP)`);

      setTimeout(() => {
        setSuccessMessage(null);
        setForceReviewModeId(null);
        fetchProjects();
      }, 2500);

    } catch (err) {
      console.error("Failed to ship project:", err);
      alert("Error completing project. Check console.");
    } finally {
      setSubmittingMode(null);
    }
  };

  // STANDBY STATE: No active projects registered
  if (!activeProject) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="label flex items-center justify-between border-b border-border-strong pb-2">
          <span className="flex items-center gap-2">
            <FolderGit2 size={14} /> Project Radar
          </span>
          <span className="text-[10px] font-mono text-text-muted">STANDBY</span>
        </h2>
        <div className="bg-bg-secondary border-2 border-border-strong p-5 flex flex-col gap-3">
          <div className="text-sm font-bold text-text-primary">No Active Projects</div>
          <div className="text-xs font-mono text-text-secondary leading-relaxed">
            Initialize a software project to track milestone sprints, target deadlines, and AI quality ratings directly on your dashboard.
          </div>
          {onOpenNewTask && (
            <button
              onClick={() => onOpenNewTask('projects')}
              className="btn-secondary py-2 text-xs flex items-center justify-center gap-2 w-full mt-1"
            >
              <Plus size={14} /> Start New Project
            </button>
          )}
        </div>
      </section>
    );
  }

  const meta = activeProject.metadata || {};
  const projectName = meta.project_name || activeProject.title.replace(/^🚀\s*Project:\s*/i, '');
  const countdown = getDeadlineCountdown(activeProject.deadline ?? null);
  const isDeadlinePassed = (activeProject.deadline ? new Date(activeProject.deadline).getTime() <= Date.now() : activeProject.status === 'done') || forceReviewModeId === activeProject.id;
  const repoUrl = (meta.url as string) || '';

  return (
    <section className="flex flex-col gap-3">
      {/* Header */}
      <h2 className="label flex items-center justify-between border-b border-border-strong pb-2">
        <span className="flex items-center gap-2">
          <FolderGit2 size={14} className={isDeadlinePassed ? 'text-accent' : 'text-text-primary'} />
          Project Radar
        </span>
        <span className={`text-[10px] font-mono px-2 py-0.5 border ${isDeadlinePassed ? 'bg-accent/10 border-accent text-accent font-bold animate-pulse' : 'bg-bg-tertiary border-border-strong text-text-secondary'}`}>
          {isDeadlinePassed ? 'READY TO SHIP?' : 'ACTIVE'}
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
          /* PHASE 2: Ready to Ship / Review Mode */
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-base font-black text-text-primary leading-tight">
                {projectName}
              </div>
              <div className="text-xs font-mono text-accent font-bold mt-1">
                {activeProject.deadline ? `Target date reached (${countdown.targetDate}).` : 'Project in review state.'}
              </div>
              <div className="text-xs font-mono text-text-secondary mt-0.5">
                Ready to ship? Run AI quality evaluation or record completion:
              </div>
            </div>

            {/* Repo URL confirmation */}
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="text-[11px] font-mono text-text-secondary">Repository or Live URL (Optional)</label>
              <input
                type="text"
                value={repoUrlInput}
                onChange={(e) => setRepoUrlInput(e.target.value)}
                placeholder="https://github.com/..."
                className="input-system text-xs py-1.5"
                disabled={evaluating}
              />
            </div>

            {/* Outcome Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                disabled={evaluating}
                onClick={() => handleShipProject('ai_evaluate')}
                className="flex items-center justify-between px-3.5 py-2.5 border border-border-strong bg-bg-primary hover:bg-text-primary hover:text-bg-primary transition-colors text-xs font-mono font-bold uppercase group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  {submittingMode === 'ai_evaluate' ? (
                    <Loader2 size={14} className="animate-spin text-accent" />
                  ) : (
                    <Sparkles size={14} className="text-accent group-hover:text-bg-primary" />
                  )}
                  {submittingMode === 'ai_evaluate' ? 'Evaluating Project with AI...' : 'Run AI Evaluation & Ship'}
                </span>
                <span className="text-[10px] opacity-70">
                  {submittingMode === 'ai_evaluate' ? 'ANALYZING' : 'UP TO +350 XP'}
                </span>
              </button>

              {submittingMode === 'ai_evaluate' && (
                <div className="p-3 bg-bg-primary border border-accent/50 flex flex-col gap-2 animate-pulse">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-accent">
                    <Loader2 size={13} className="animate-spin" />
                    <span>Neural Project Evaluation in Progress...</span>
                  </div>
                  <div className="text-[11px] font-mono text-text-secondary leading-relaxed">
                    Analyzing codebase architecture, repo documentation, stack depth, and production readiness. This may take a few seconds...
                  </div>
                  <div className="w-full bg-bg-tertiary h-1.5 overflow-hidden relative">
                    <div className="h-full bg-accent animate-pulse w-3/4"></div>
                  </div>
                </div>
              )}

              <button
                disabled={evaluating}
                onClick={() => handleShipProject('mark_shipped')}
                className="flex items-center justify-between px-3.5 py-2 border border-border-strong bg-bg-primary hover:bg-text-primary hover:text-bg-primary transition-colors text-xs font-mono font-bold uppercase group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  {submittingMode === 'mark_shipped' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  {submittingMode === 'mark_shipped' ? 'Completing Project...' : 'Mark Shipped (Standard)'}
                </span>
                <span className="text-[10px] opacity-70">+100 XP</span>
              </button>

              <button
                disabled={evaluating}
                onClick={() => setForceReviewModeId(null)}
                className="text-[11px] font-mono text-text-muted hover:text-text-primary underline text-center pt-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Keep Developing (Not ready yet)
              </button>
            </div>
          </div>
        ) : (
          /* PHASE 1: Active In-Progress Mode */
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between">
                <div className="text-base font-black text-text-primary leading-tight truncate">
                  {projectName}
                </div>
                {repoUrl && (
                  <a 
                    href={repoUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-text-muted hover:text-text-primary p-1"
                    title="Open Repository"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>

              {/* Countdown */}
              <div className="flex items-center gap-1.5 mt-2 text-xs font-mono">
                <Clock size={12} className={countdown.isUrgent ? 'text-accent' : 'text-text-muted'} />
                <span className={countdown.isUrgent ? 'text-accent font-bold' : 'text-text-secondary'}>
                  {countdown.label}
                </span>
              </div>
            </div>

            <div className="text-xs font-mono text-text-secondary leading-relaxed">
              Main project tracked here. Add milestone subtasks below to build toward completion.
            </div>

            <div className="flex items-center gap-2 pt-1">
              {onOpenNewTask && (
                <button
                  onClick={() => onOpenNewTask('projects')}
                  className="flex-1 btn-primary py-2 text-xs flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Add Milestone
                </button>
              )}
              <button
                onClick={() => setForceReviewModeId(activeProject.id)}
                className="px-3 py-2 border border-border-strong bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-mono transition-colors"
                title="If ready to evaluate or complete"
              >
                Ready to Ship?
              </button>
            </div>

            {/* Navigation if multiple projects */}
            {activeProjects.length > 1 && (
              <div className="flex justify-between items-center pt-2 border-t border-border-subtle text-[11px] font-mono text-text-muted">
                <span>Active Projects</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    disabled={safeIndex === 0}
                    className="disabled:opacity-30 hover:text-text-primary p-0.5"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <span>{safeIndex + 1}/{activeProjects.length}</span>
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.min(activeProjects.length - 1, prev + 1))}
                    disabled={safeIndex === activeProjects.length - 1}
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
