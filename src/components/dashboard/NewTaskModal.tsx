import { useState, useEffect } from 'react';
import { X, Trophy, FolderGit2 } from 'lucide-react';
import type { Domain } from '../../types';
import { supabase } from '../../lib/supabaseClient';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void> | void;
  initialDomain?: Domain;
}

export interface TaskFormData {
  title: string;
  domain: string;
  priority: number;
  deadline: string;
  effort_estimate_mins: number;
  metadata: Record<string, unknown>;
  notes: string;
}

const DOMAINS: Domain[] = ['leetcode', 'hackathon', 'learning', 'projects', 'coursework', 'general'];

const DOMAIN_PRIORITY_MAP: Record<string, number> = {
  leetcode: 5,
  projects: 4,
  learning: 3,
  coursework: 2,
  hackathon: 4,
  general: 1
};

export function NewTaskModal({ isOpen, onClose, onSubmit, initialDomain }: NewTaskModalProps) {
  const [form, setForm] = useState<TaskFormData>({
    title: '',
    domain: initialDomain || 'leetcode',
    priority: DOMAIN_PRIORITY_MAP[initialDomain || 'leetcode'] || 5,
    deadline: '',
    effort_estimate_mins: 45,
    metadata: {},
    notes: '',
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiVerdict, setAiVerdict] = useState<{rating: number, justification: string} | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hackathon specific state
  const [existingHackathons, setExistingHackathons] = useState<{ name: string; deadline: string | null }[]>([]);
  const [hackathonMode, setHackathonMode] = useState<'new' | 'existing'>('new');
  const [hackathonName, setHackathonName] = useState('');
  const [selectedHackathon, setSelectedHackathon] = useState('');
  const [hackathonDifficulty, setHackathonDifficulty] = useState('medium');
  const [noDeadline, setNoDeadline] = useState(false);

  // Projects specific state
  const [existingProjects, setExistingProjects] = useState<{ name: string; deadline: string | null; url?: string }[]>([]);
  const [projectMode, setProjectMode] = useState<'new' | 'existing'>('new');
  const [projectName, setProjectName] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [projectDifficulty, setProjectDifficulty] = useState('medium');
  const [projectRepoUrl, setProjectRepoUrl] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const startDomain = initialDomain || 'leetcode';
    setForm({
      title: '',
      domain: startDomain,
      priority: DOMAIN_PRIORITY_MAP[startDomain] || 3,
      deadline: '',
      effort_estimate_mins: 45,
      metadata: {},
      notes: '',
    });
    setHackathonName('');
    setHackathonMode('new');
    setProjectName('');
    setProjectMode('new');
    setProjectRepoUrl('');
    setProjectDifficulty('medium');
    setNoDeadline(false);
    setErrorMessage(null);
    setSubmitting(false);
    setAiVerdict(null);
    setAiError(null);

    const fetchHackathons = async () => {
      try {
        const { data } = await supabase
          .from('tasks')
          .select('title, deadline, metadata')
          .eq('domain', 'hackathon')
          .order('created_at', { ascending: false });

        if (data) {
          const map = new Map<string, string | null>();
          data.forEach((t: any) => {
            const name = t.metadata?.hackathon_name || (t.metadata?.action === 'entered' ? t.title.replace(/^🏆\s*Hackathon:\s*/i, '').replace(/^🏆\s*Hackathon Entry:\s*/i, '') : null);
            if (name && !map.has(name)) {
              map.set(name, t.deadline || null);
            }
          });
          const list = Array.from(map.entries()).map(([name, deadline]) => ({ name, deadline }));
          setExistingHackathons(list);
          if (list.length > 0) {
            setSelectedHackathon(list[0].name);
          }
        }
      } catch (err) {
        console.error("Error fetching hackathons:", err);
      }
    };

    const fetchProjects = async () => {
      try {
        const { data } = await supabase
          .from('tasks')
          .select('title, deadline, metadata')
          .eq('domain', 'projects')
          .order('created_at', { ascending: false });

        if (data) {
          const map = new Map<string, { deadline: string | null; url?: string }>();
          data.forEach((t: any) => {
            const name = t.metadata?.project_name || (t.metadata?.is_primary_entry !== false && t.metadata?.action !== 'task' ? t.title.replace(/^🚀\s*Project:\s*/i, '') : null);
            if (name && !map.has(name)) {
              map.set(name, { deadline: t.deadline || null, url: t.metadata?.url || '' });
            }
          });
          const list = Array.from(map.entries()).map(([name, v]) => ({ name, deadline: v.deadline, url: v.url }));
          setExistingProjects(list);
          if (list.length > 0) {
            setSelectedProject(list[0].name);
          }
        }
      } catch (err) {
        console.error("Error fetching projects:", err);
      }
    };

    fetchHackathons();
    fetchProjects();
  }, [isOpen, initialDomain]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const finalForm: TaskFormData = { ...form };

    if (form.domain === 'hackathon') {
      const isNew = hackathonMode === 'new' || existingHackathons.length === 0;
      const targetName = isNew 
        ? hackathonName.trim() 
        : (selectedHackathon.trim() || hackathonName.trim());

      if (isNew && !targetName) {
        setErrorMessage("Please enter a name for the new hackathon/competition.");
        return;
      }

      if (!targetName) {
        setErrorMessage("Please select or specify a hackathon.");
        return;
      }

      finalForm.metadata = {
        ...finalForm.metadata,
        hackathon_name: targetName,
        action: isNew ? 'entered' : 'task',
        is_primary_entry: isNew,
        ...(isNew ? {} : { difficulty: hackathonDifficulty }),
      };

      if (isNew) {
        finalForm.title = `🏆 Hackathon: ${targetName}`;
      } else {
        finalForm.title = finalForm.title.trim() || `Sprint: ${targetName}`;
      }
    } else if (form.domain === 'projects') {
      const isNew = projectMode === 'new' || existingProjects.length === 0;
      const targetName = isNew 
        ? projectName.trim() 
        : (selectedProject.trim() || projectName.trim());

      if (isNew && !targetName) {
        setErrorMessage("Please enter a name for the software project.");
        return;
      }

      if (!targetName) {
        setErrorMessage("Please select or specify a project.");
        return;
      }

      finalForm.metadata = {
        ...finalForm.metadata,
        project_name: targetName,
        action: isNew ? 'created' : 'task',
        is_primary_entry: isNew,
        url: projectRepoUrl.trim() || (finalForm.metadata.url as string) || '',
        ...(isNew ? {} : { difficulty: projectDifficulty }),
      };

      if (isNew) {
        finalForm.title = `🚀 Project: ${targetName}`;
      } else {
        finalForm.title = finalForm.title.trim() || `Milestone: ${targetName}`;
      }
    } else {
      if (!finalForm.title.trim()) {
        setErrorMessage("Please provide an operation title.");
        return;
      }
    }

    if (noDeadline) {
      finalForm.deadline = '';
    }

    if (!finalForm.effort_estimate_mins || finalForm.effort_estimate_mins <= 0) {
      finalForm.effort_estimate_mins = 45;
    }

    try {
      setSubmitting(true);
      await onSubmit(finalForm);
    } catch (err: any) {
      console.error("Error submitting task form:", err);
      setErrorMessage(err?.message || "Failed to initialize operation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-secondary border-2 border-text-primary w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-8 py-6 border-b-2 border-text-primary flex items-center justify-between bg-bg-primary">
          <div>
            <div className="text-2xl font-black text-text-primary uppercase tracking-tight">New Operation</div>
            <div className="text-xs font-mono text-text-secondary mt-1">Initialize Task Protocol</div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-text-primary hover:bg-text-primary hover:text-bg-primary transition-colors border border-transparent hover:border-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          {/* Domain Selection First */}
          <div>
            <label className="label block mb-2">Domain *</label>
            <select
              value={form.domain}
              onChange={(e) => {
                const newDomain = e.target.value;
                setForm({ ...form, domain: newDomain, priority: DOMAIN_PRIORITY_MAP[newDomain] || 1 });
              }}
              className="select-system"
            >
              {DOMAINS.map(d => (
                <option key={d} value={d}>{d.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Operation Title: Shown for all domains except New Hackathon or New Project registration */}
          {!(form.domain === 'hackathon' && (hackathonMode === 'new' || existingHackathons.length === 0)) && 
           !(form.domain === 'projects' && (projectMode === 'new' || existingProjects.length === 0)) && (
            <div>
              <label className="label block mb-2">
                {form.domain === 'projects' ? 'Milestone Title *' : 'Operation Title *'}
              </label>
              <input
                type="text"
                required
                placeholder={form.domain === 'projects' ? "e.g. Implement WebSocket gateway" : "e.g. Implement Two Pointers Pattern"}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-system text-base"
              />
            </div>
          )}

          {/* Hackathon Specific Section */}
          {form.domain === 'hackathon' && (
            <div className="bg-bg-tertiary border border-border-strong p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="label flex items-center gap-2">
                  <Trophy size={14} className="text-accent" />
                  Hackathon Registry
                </div>
                {existingHackathons.length > 0 && (
                  <div className="flex text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setHackathonMode('new')}
                      className={`px-3 py-1 border border-border-strong transition-colors ${hackathonMode === 'new' ? 'bg-text-primary text-bg-primary font-bold' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
                    >
                      New Competition
                    </button>
                    <button
                      type="button"
                      onClick={() => setHackathonMode('existing')}
                      className={`px-3 py-1 border-y border-r border-border-strong transition-colors ${hackathonMode === 'existing' ? 'bg-text-primary text-bg-primary font-bold' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
                    >
                      Existing ({existingHackathons.length})
                    </button>
                  </div>
                )}
              </div>

              {hackathonMode === 'new' || existingHackathons.length === 0 ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="label block mb-2">Hackathon Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ETHGlobal Bangkok, HackMIT, SIH 2026"
                      value={hackathonName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHackathonName(val);
                        if (!form.title || form.title.startsWith('🏆 Hackathon:')) {
                          setForm(prev => ({ ...prev, title: val ? `🏆 Hackathon: ${val}` : '' }));
                        }
                      }}
                      className="input-system"
                    />
                  </div>
                  <div className="text-xs font-mono text-text-muted leading-relaxed">
                    ★ Registering a competition logs <strong>1 competition entered</strong> (+30 EXP on completion) and tracks its deadline for the outcome resolution prompt.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="label block mb-2">Select Ongoing Hackathon *</label>
                    <select
                      value={selectedHackathon}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedHackathon(val);
                        const match = existingHackathons.find(h => h.name === val);
                        if (match?.deadline && !form.deadline) {
                          setForm(prev => ({ ...prev, deadline: match.deadline?.slice(0, 16) || '' }));
                        }
                      }}
                      className="select-system"
                    >
                      {existingHackathons.map(h => (
                        <option key={h.name} value={h.name}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label block mb-2">Sprint Task Difficulty</label>
                    <div className="flex">
                      {[
                        { id: 'easy', label: 'Easy (+10 XP)' },
                        { id: 'medium', label: 'Medium (+25 XP)' },
                        { id: 'hard', label: 'Hard (+50 XP)' }
                      ].map(diff => (
                        <button
                          key={diff.id}
                          type="button"
                          onClick={() => setHackathonDifficulty(diff.id)}
                          className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all border-y border-l last:border-r ${
                            hackathonDifficulty === diff.id
                              ? 'bg-text-primary border-text-primary text-bg-primary'
                              : 'bg-bg-secondary border-border-strong text-text-secondary hover:bg-bg-tertiary'
                          }`}
                        >
                          {diff.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs font-mono text-text-muted leading-relaxed">
                    🔗 Sprint tasks are linked under <strong>{selectedHackathon}</strong> and award difficulty XP without falsely duplicating your competition count.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Projects Specific Section */}
          {form.domain === 'projects' && (
            <div className="bg-bg-tertiary border border-border-strong p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="label flex items-center gap-2">
                  <FolderGit2 size={14} className="text-accent" />
                  Projects Registry
                </div>
                {existingProjects.length > 0 && (
                  <div className="flex text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setProjectMode('new')}
                      className={`px-3 py-1 border border-border-strong transition-colors ${projectMode === 'new' ? 'bg-text-primary text-bg-primary font-bold' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
                    >
                      New Project
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectMode('existing')}
                      className={`px-3 py-1 border-y border-r border-border-strong transition-colors ${projectMode === 'existing' ? 'bg-text-primary text-bg-primary font-bold' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
                    >
                      Existing ({existingProjects.length})
                    </button>
                  </div>
                )}
              </div>

              {projectMode === 'new' || existingProjects.length === 0 ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="label block mb-2">Project Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Distributed Key-Value Store, Compiler in Rust"
                      value={projectName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProjectName(val);
                        if (!form.title || form.title.startsWith('🚀 Project:')) {
                          setForm(prev => ({ ...prev, title: val ? `🚀 Project: ${val}` : '' }));
                        }
                      }}
                      className="input-system"
                    />
                  </div>
                  <div>
                    <label className="label block mb-2">Repository or Live URL (Optional)</label>
                    <input
                      type="text"
                      placeholder="https://github.com/username/project"
                      value={projectRepoUrl}
                      onChange={(e) => setProjectRepoUrl(e.target.value)}
                      className="input-system"
                    />
                  </div>
                  <div className="text-xs font-mono text-text-muted leading-relaxed">
                    ★ Registering a project establishes a container tracked in your <strong>Project Radar</strong>. Target deadlines and AI quality evaluations resolve upon shipping.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="label block mb-2">Select Ongoing Project *</label>
                    <select
                      value={selectedProject}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedProject(val);
                        const match = existingProjects.find(p => p.name === val);
                        if (match?.deadline && !form.deadline) {
                          setForm(prev => ({ ...prev, deadline: match.deadline?.slice(0, 16) || '' }));
                        }
                        if (match?.url && !projectRepoUrl) {
                          setProjectRepoUrl(match.url);
                        }
                      }}
                      className="select-system"
                    >
                      {existingProjects.map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label block mb-2">Milestone Difficulty Scope</label>
                    <div className="flex">
                      {[
                        { id: 'easy', label: 'Easy (+10 XP)' },
                        { id: 'medium', label: 'Medium (+25 XP)' },
                        { id: 'hard', label: 'Hard (+50 XP)' }
                      ].map(diff => (
                        <button
                          key={diff.id}
                          type="button"
                          onClick={() => setProjectDifficulty(diff.id)}
                          className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all border-y border-l last:border-r ${
                            projectDifficulty === diff.id
                              ? 'bg-text-primary border-text-primary text-bg-primary'
                              : 'bg-bg-secondary border-border-strong text-text-secondary hover:bg-bg-tertiary'
                          }`}
                        >
                          {diff.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs font-mono text-text-muted leading-relaxed">
                    🔗 Milestone tasks link under <strong>{selectedProject}</strong> and award difficulty XP without falsely duplicating your completed project count.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Deadline + Estimate */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label">
                  {form.domain === 'hackathon' && (hackathonMode === 'new' || existingHackathons.length === 0) 
                    ? 'Hackathon Deadline' 
                    : form.domain === 'projects' && (projectMode === 'new' || existingProjects.length === 0)
                    ? 'Project Target Date'
                    : 'Deadline'}
                </label>
                <label className="flex items-center gap-1.5 text-xs font-mono text-text-secondary cursor-pointer hover:text-text-primary select-none">
                  <input
                    type="checkbox"
                    checked={noDeadline}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setNoDeadline(checked);
                      if (checked) {
                        setForm(prev => ({ ...prev, deadline: '' }));
                      }
                    }}
                    className="accent-text-primary w-3.5 h-3.5 rounded-none border border-border-strong cursor-pointer"
                  />
                  <span>No Deadline</span>
                </label>
              </div>

              {noDeadline ? (
                <div className="h-10 px-3 bg-bg-tertiary border border-border-strong text-text-muted font-mono text-xs flex items-center">
                  No deadline assigned
                </div>
              ) : (
                <input
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="input-system"
                />
              )}
            </div>
            <div>
              <label className="label block mb-2">Time Estimate (min)</label>
              <input
                type="number"
                placeholder="45"
                value={form.effort_estimate_mins || ''}
                onChange={(e) => setForm({ ...form, effort_estimate_mins: parseInt(e.target.value) || 0 })}
                className="input-system"
              />
            </div>
          </div>

          {/* LeetCode Section */}
          {form.domain === 'leetcode' && (
            <div className="bg-bg-tertiary border border-border-strong p-5">
              <div className="label mb-4">LeetCode Metadata</div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="label block mb-2">Problem URL</label>
                  <input
                    type="text"
                    placeholder="https://leetcode.com/problems/..."
                    value={(form.metadata.url as string) || ''}
                    className="input-system"
                    onChange={(e) => setForm({ 
                      ...form, 
                      metadata: { ...form.metadata, url: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="label block mb-2">Difficulty</label>
                  <div className="flex">
                    {['Easy', 'Medium', 'Hard'].map(diff => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setForm({
                          ...form,
                          metadata: { ...form.metadata, difficulty: diff.toLowerCase() }
                        })}
                        className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all border-y border-l last:border-r ${
                          form.metadata.difficulty === diff.toLowerCase()
                            ? 'bg-text-primary border-text-primary text-bg-primary'
                            : 'bg-bg-secondary border-border-strong text-text-secondary hover:bg-bg-tertiary'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label block mb-2">Notes (Optional)</label>
            <textarea
              rows={3}
              placeholder="Add context, links, or requirements..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-system resize-y"
            />
          </div>

          {/* AI Preview (Only for Projects) */}
          {form.domain === 'projects' && (
            <div className="bg-bg-tertiary border border-dashed border-border-strong p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-text-primary rounded-full" />
                  <span className="label">System AI Preview</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const desc = (
                      form.notes || 
                      form.title || 
                      (projectMode === 'new' ? projectName : selectedProject) || 
                      ''
                    ).trim();

                    const repoLink = projectRepoUrl.trim() || (form.metadata.url as string) || '';

                    if (!desc) {
                      setAiError("Enter a project name, milestone title, or notes before running verdict.");
                      return;
                    }

                    setAiError(null);
                    setAiLoading(true);

                    try {
                      const { data, error } = await supabase.functions.invoke('project-rater', {
                        body: { 
                          description: desc,
                          repo_link: repoLink || undefined,
                          url: repoLink || undefined 
                        }
                      });

                      if (error) {
                        console.error("AI verdict error:", error);
                        let msg = error.message || "Failed to analyze project.";
                        try {
                          if (error.context && typeof error.context.json === 'function') {
                            const errBody = await error.context.json();
                            if (errBody?.error) msg = errBody.error;
                          }
                        } catch {}
                        setAiError(msg);
                      } else if (data) {
                        const score = data.overall_score ?? data.rating ?? 7.0;
                        setAiVerdict({ rating: score, justification: data.justification || "Quality analysis completed." });
                      } else {
                        setAiError("No response received from evaluation engine.");
                      }
                    } catch (err: any) {
                      console.error("AI verdict unexpected error:", err);
                      setAiError(err?.message || "Failed to contact AI evaluation service.");
                    } finally {
                      setAiLoading(false);
                    }
                  }}
                  disabled={aiLoading}
                  className="btn-secondary py-1.5 px-3 text-[10px]"
                >
                  {aiLoading ? 'ANALYZING...' : 'RUN VERDICT'}
                </button>
              </div>

              {aiError && (
                <div className="mb-3 p-2.5 bg-accent/10 border border-accent text-accent font-mono text-xs flex items-center gap-2">
                  <span className="font-bold">⚠</span>
                  <span>{aiError}</span>
                </div>
              )}

              {aiVerdict ? (
                <div className="flex flex-col gap-2 border-t border-border-strong pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-mono text-text-secondary uppercase">Projected Rating</span>
                    <span className="font-bold text-text-primary font-mono">{aiVerdict.rating} / 10</span>
                  </div>
                  <div className="text-xs text-text-secondary leading-relaxed">
                    {aiVerdict.justification}
                  </div>
                </div>
              ) : (
                <div className="text-xs font-mono text-text-muted leading-relaxed">
                  Run verdict to get a projected quality rating and estimated XP reward before initializing the operation.
                </div>
              )}
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-accent/10 border border-accent text-accent font-mono text-xs flex items-center gap-2">
              <span className="font-bold">⚠</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-ghost disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary min-w-[150px] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'INITIALIZING...' : 'Initialize Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
