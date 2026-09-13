import { useState } from 'react';
import { X, BookOpen, Brain, Sparkles, Users, DollarSign, Target, Clock } from 'lucide-react';
import type { PersonalPillar } from '../../types';
import { getPersonalExpOnTask } from '../../lib/personalRanking';

interface NewPersonalTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    pillar: PersonalPillar;
    priority: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'boss';
    effort_estimate_mins: number;
    metadata: Record<string, any>;
  }) => Promise<void> | void;
}

type ActivityType = 'knowledge' | 'mindfulness' | 'creative' | 'relationships' | 'finance' | 'personal';

interface QuickQuestTemplate {
  label: string;
  activity: ActivityType;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'boss';
  effortMins: number;
  xp: number;
  metadata?: Record<string, any>;
}

const QUICK_QUESTS: QuickQuestTemplate[] = [
  { label: 'READ 20 PAGES', activity: 'knowledge', title: 'Read 20 pages of Meditations', difficulty: 'medium', effortMins: 30, xp: 25, metadata: { pages_read: 20, book_title: 'Meditations' } },
  { label: '15 MIN MEDITATION', activity: 'mindfulness', title: '15 min mindfulness & stillness', difficulty: 'easy', effortMins: 15, xp: 20, metadata: { practice: 'Vipassana Meditation' } },
  { label: '30 MIN CREATIVE SESSION', activity: 'creative', title: '30 min creative writing & craft', difficulty: 'medium', effortMins: 30, xp: 30, metadata: { creation_type: 'Writing & Craft' } },
  { label: 'CALL FAMILY', activity: 'relationships', title: 'Call family & meaningful check-in', difficulty: 'easy', effortMins: 20, xp: 20, metadata: { relationship_activity: 'Family Check-in' } },
  { label: '30 MIN PERSONAL PROJECT', activity: 'personal', title: '30 min personal project sprint', difficulty: 'medium', effortMins: 30, xp: 35, metadata: { personal_goal: 'Project Sprint' } },
];

const ACTIVITIES: { id: ActivityType; label: string; icon: any; pillar: PersonalPillar }[] = [
  { id: 'knowledge', label: 'KNOWLEDGE', icon: BookOpen, pillar: 'intellect' },
  { id: 'mindfulness', label: 'MINDFULNESS', icon: Brain, pillar: 'mindfulness' },
  { id: 'creative', label: 'CREATIVE', icon: Sparkles, pillar: 'creativity' },
  { id: 'relationships', label: 'RELATIONSHIPS', icon: Users, pillar: 'relationships' },
  { id: 'finance', label: 'FINANCE', icon: DollarSign, pillar: 'finance' },
  { id: 'personal', label: 'PERSONAL', icon: Target, pillar: 'mindfulness' },
];

const DIFFICULTIES: { id: 'easy' | 'medium' | 'hard' | 'boss'; label: string; xp: number }[] = [
  { id: 'easy', label: 'EASY', xp: 15 },
  { id: 'medium', label: 'MEDIUM', xp: 35 },
  { id: 'hard', label: 'HARD', xp: 75 },
  { id: 'boss', label: 'BOSS', xp: 150 },
];

export function NewPersonalTaskModal({ isOpen, onClose, onSubmit }: NewPersonalTaskModalProps) {
  const [activity, setActivity] = useState<ActivityType>('knowledge');
  const [title, setTitle] = useState('Read 25 pages of Meditations');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'boss'>('medium');
  const [customXp, setCustomXp] = useState<number | null>(null);
  const [durationMins, setDurationMins] = useState(30);

  // Progressive disclosure fields
  const [bookTitle, setBookTitle] = useState('');
  const [pagesRead, setPagesRead] = useState('');
  const [mindfulnessPractice, setMindfulnessPractice] = useState('');
  const [creationType, setCreationType] = useState('');
  const [relationshipActivity, setRelationshipActivity] = useState('');
  const [financeGoal, setFinanceGoal] = useState('');
  const [financeAmount, setFinanceAmount] = useState('');
  const [personalGoal, setPersonalGoal] = useState('');
  const [deadline, setDeadline] = useState('');

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentActivityConfig = ACTIVITIES.find(a => a.id === activity) || ACTIVITIES[0];
  const standardXp = getPersonalExpOnTask(difficulty);
  const displayXp = customXp !== null ? customXp : standardXp;

  const applyTemplate = (template: QuickQuestTemplate) => {
    setActivity(template.activity);
    setTitle(template.title);
    setDifficulty(template.difficulty);
    setCustomXp(template.xp);
    setDurationMins(template.effortMins);

    // Reset conditional fields
    setBookTitle('');
    setPagesRead('');
    setMindfulnessPractice('');
    setCreationType('');
    setRelationshipActivity('');
    setFinanceGoal('');
    setFinanceAmount('');
    setPersonalGoal('');
    setDeadline('');

    if (template.metadata?.book_title) setBookTitle(template.metadata.book_title);
    if (template.metadata?.pages_read) setPagesRead(String(template.metadata.pages_read));
    if (template.metadata?.practice) setMindfulnessPractice(template.metadata.practice);
    if (template.metadata?.creation_type) setCreationType(template.metadata.creation_type);
    if (template.metadata?.relationship_activity) setRelationshipActivity(template.metadata.relationship_activity);
    if (template.metadata?.personal_goal) setPersonalGoal(template.metadata.personal_goal);
  };

  const handleDifficultySelect = (diff: 'easy' | 'medium' | 'hard' | 'boss') => {
    setDifficulty(diff);
    setCustomXp(null); // Return to standard difficulty XP
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim();
    if (!finalTitle) return;

    setSubmitting(true);
    try {
      const metadata: Record<string, any> = {
        difficulty,
        activity_type: activity,
      };

      if (customXp !== null) {
        metadata.custom_exp = customXp;
      }

      // Category-specific progressive fields
      if (activity === 'knowledge') {
        if (bookTitle) metadata.book_title = bookTitle.trim();
        if (pagesRead) metadata.pages_read = parseInt(pagesRead, 10);
      } else if (activity === 'mindfulness') {
        if (mindfulnessPractice) metadata.practice = mindfulnessPractice.trim();
      } else if (activity === 'creative') {
        if (creationType) metadata.creation_type = creationType.trim();
      } else if (activity === 'relationships') {
        if (relationshipActivity) metadata.relationship_activity = relationshipActivity.trim();
      } else if (activity === 'finance') {
        if (financeGoal) metadata.finance_goal = financeGoal.trim();
        if (financeAmount) metadata.amount_saved = parseFloat(financeAmount);
      } else if (activity === 'personal') {
        if (personalGoal) metadata.personal_goal = personalGoal.trim();
        if (deadline) metadata.deadline = deadline.trim();
      }

      await onSubmit({
        title: finalTitle,
        pillar: currentActivityConfig.pillar,
        priority: difficulty === 'boss' ? 5 : difficulty === 'hard' ? 4 : difficulty === 'medium' ? 3 : 2,
        difficulty,
        effort_estimate_mins: durationMins,
        metadata,
      });

      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[150] bg-text-primary/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-primary border-2 border-text-primary w-full max-w-2xl shadow-[8px_8px_0_0_var(--color-text-primary)] max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b-2 border-text-primary flex items-center justify-between bg-bg-secondary">
          <div>
            <div className="text-xl font-black text-text-primary uppercase tracking-tight">
              NEW PERSONAL QUEST
            </div>
            <div className="text-xs font-mono text-text-secondary mt-0.5">
              Define today's personal objective.
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors border border-transparent hover:border-text-primary cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-5">
          
          {/* Quick Quests Template Row */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={12} className="text-accent" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                Quick Quests
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTS.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="py-1.5 px-3 bg-bg-secondary hover:bg-bg-tertiary border border-border-strong hover:border-text-primary text-2xs font-mono font-bold text-text-secondary hover:text-text-primary transition-all flex items-center gap-2 group cursor-pointer shadow-xs"
                >
                  <span className="whitespace-nowrap">{tpl.label}</span>
                  <span className="text-[10px] font-mono text-accent font-bold group-hover:text-accent-hover">
                    +{tpl.xp} XP
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 1. Activity Selector */}
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted block mb-2">
              Activity Pillar
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ACTIVITIES.map((act) => {
                const Icon = act.icon;
                const active = activity === act.id;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => {
                      setActivity(act.id);
                      if (!title || QUICK_QUESTS.some(q => q.title === title) || title.startsWith('Read 25 pages')) {
                        if (act.id === 'knowledge') setTitle('Read 25 pages of Meditations');
                        else if (act.id === 'mindfulness') setTitle('20 min Vipassana meditation');
                        else if (act.id === 'creative') setTitle('Write 500 words of creative essay');
                        else if (act.id === 'relationships') setTitle('Call family or mentor');
                        else if (act.id === 'finance') setTitle('Weekly net worth & budget review');
                        else if (act.id === 'personal') setTitle('Organize workspace & daily plan');
                      }
                    }}
                    className={`py-2.5 px-1.5 border font-mono font-bold uppercase tracking-tight transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center ${
                      active
                        ? 'border-text-primary bg-text-primary text-bg-primary shadow-sm'
                        : 'border-border-strong bg-bg-secondary text-text-secondary hover:text-text-primary hover:border-text-primary'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-accent' : 'text-text-muted'} />
                    <span className="text-[10px] leading-tight font-mono tracking-tight block w-full truncate">
                      {act.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Quest Title */}
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted block mb-1.5">
              Quest Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Read 25 pages of Meditations"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-bg-secondary border-2 border-text-primary px-3.5 py-2.5 text-sm font-sans font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted"
            />
          </div>

          {/* 3. Difficulty */}
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2">
              Difficulty & Base XP
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIFFICULTIES.map((d) => {
                const active = difficulty === d.id && customXp === null;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleDifficultySelect(d.id)}
                    className={`py-2.5 px-2 text-center border font-mono transition-all cursor-pointer ${
                      active
                        ? 'bg-text-primary text-bg-primary border-text-primary shadow-sm'
                        : 'bg-bg-secondary text-text-secondary border-border-strong hover:border-text-primary'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider">{d.label}</div>
                    <div className="text-[11px] font-bold mt-0.5 text-accent">
                      +{d.xp} XP
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prominent XP Reward Readout */}
          <div className="py-2.5 px-4 bg-bg-secondary border border-border-strong flex items-center justify-between">
            <span className="text-2xs font-mono font-bold uppercase tracking-wider text-text-muted">
              Estimated Reward
            </span>
            <span className="text-sm font-mono font-black tracking-wider text-accent">
              +{displayXp} PERSONAL XP
            </span>
          </div>

          {/* 4. Duration */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-text-muted" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                Estimated Duration
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMins(mins)}
                  className={`px-3 py-1.5 text-2xs font-mono font-bold border transition-colors cursor-pointer ${
                    durationMins === mins
                      ? 'bg-text-primary text-bg-primary border-text-primary'
                      : 'bg-bg-secondary text-text-secondary border-border-subtle hover:border-text-primary'
                  }`}
                >
                  {mins}M
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={durationMins}
                  onChange={(e) => setDurationMins(parseInt(e.target.value, 10) || 15)}
                  className="w-16 text-center bg-bg-secondary border border-text-primary py-1 text-xs font-mono font-bold text-text-primary focus:outline-none"
                />
                <span className="text-2xs font-mono font-bold text-text-muted">MIN</span>
              </div>
            </div>
          </div>

          {/* 5. Progressive Disclosure: Conditional Category Fields */}
          {activity === 'knowledge' && (
            <div className="p-3.5 bg-bg-secondary border border-border-strong flex flex-col gap-2.5 transition-all">
              <span className="text-2xs font-mono font-bold uppercase text-text-muted tracking-wider">
                Reading Parameters (Optional)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">Book / Article</label>
                  <input
                    type="text"
                    placeholder="e.g. Meditations"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">Pages Read</label>
                  <input
                    type="number"
                    placeholder="e.g. 25"
                    value={pagesRead}
                    onChange={(e) => setPagesRead(e.target.value)}
                    className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {activity === 'mindfulness' && (
            <div className="p-3.5 bg-bg-secondary border border-border-strong flex flex-col gap-2.5 transition-all">
              <span className="text-2xs font-mono font-bold uppercase text-text-muted tracking-wider">
                Mindfulness Practice (Optional)
              </span>
              <input
                type="text"
                placeholder="e.g. Vipassana, Breathwork, Stillness, Evening reflection"
                value={mindfulnessPractice}
                onChange={(e) => setMindfulnessPractice(e.target.value)}
                className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
              />
            </div>
          )}

          {activity === 'creative' && (
            <div className="p-3.5 bg-bg-secondary border border-border-strong flex flex-col gap-2.5 transition-all">
              <span className="text-2xs font-mono font-bold uppercase text-text-muted tracking-wider">
                Creation Type (Optional)
              </span>
              <input
                type="text"
                placeholder="e.g. Essay writing, UI Design, Music composition, Code architecture"
                value={creationType}
                onChange={(e) => setCreationType(e.target.value)}
                className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
              />
            </div>
          )}

          {activity === 'relationships' && (
            <div className="p-3.5 bg-bg-secondary border border-border-strong flex flex-col gap-2.5 transition-all">
              <span className="text-2xs font-mono font-bold uppercase text-text-muted tracking-wider">
                Relationship Activity (Optional)
              </span>
              <input
                type="text"
                placeholder="e.g. Call parents, mentor 1-on-1, deep conversation with close friend"
                value={relationshipActivity}
                onChange={(e) => setRelationshipActivity(e.target.value)}
                className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
              />
            </div>
          )}

          {activity === 'finance' && (
            <div className="p-3.5 bg-bg-secondary border border-border-strong flex flex-col gap-2.5 transition-all">
              <span className="text-2xs font-mono font-bold uppercase text-text-muted tracking-wider">
                Financial Goal (Optional)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">Goal Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Weekly budget review, Portfolio rebalancing"
                    value={financeGoal}
                    onChange={(e) => setFinanceGoal(e.target.value)}
                    className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">Amount ($)</label>
                  <input
                    type="number"
                    placeholder="e.g. 250"
                    value={financeAmount}
                    onChange={(e) => setFinanceAmount(e.target.value)}
                    className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {activity === 'personal' && (
            <div className="p-3.5 bg-bg-secondary border border-border-strong flex flex-col gap-2.5 transition-all">
              <span className="text-2xs font-mono font-bold uppercase text-text-muted tracking-wider">
                Personal Goal (Optional)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">Target Objective</label>
                  <input
                    type="text"
                    placeholder="e.g. Deep clean workspace, Build side-project module"
                    value={personalGoal}
                    onChange={(e) => setPersonalGoal(e.target.value)}
                    className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">Deadline / Date</label>
                  <input
                    type="text"
                    placeholder="e.g. Today 8:00 PM"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t-2 border-text-primary flex items-center justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors border border-transparent hover:border-border-strong cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="btn-primary py-2.5 px-6 text-xs font-mono font-bold uppercase tracking-wider !bg-accent hover:!bg-accent-hover text-white border-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {submitting ? 'Initializing...' : 'Initialize Quest'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
