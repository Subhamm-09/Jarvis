import { useState, useEffect } from 'react';
import { Plus, Check, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { PersonalTask, PersonalExpLog, PersonalPillar } from '../types';
import { 
  PERSONAL_PILLARS,
  getPersonalLevel,
  getPersonalExpOnTask,
  calculatePersonalAttributes,
  checkPersonalSGate,
  getPersonalRank
} from '../lib/personalRanking';
import { calculateCalendarStreak, calculateWeeklyActivity } from '../lib/domainTelemetry';
import { RankCard } from '../components/dashboard/RankCard';
import { ActivityGrid } from '../components/dashboard/ActivityGrid';
import { TactileLevelUpModal } from '../components/shared/TactileLevelUpModal';
import { NewPersonalTaskModal } from '../components/personal/NewPersonalTaskModal';
import { PersonalTrackerPanel } from '../components/personal/PersonalTrackerPanel';
import { triggerTactileFeedback, resolveTaskAttribute } from '../lib/tactileFeedback';

export function PersonalDashboardPage() {
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [expLogs, setExpLogs] = useState<PersonalExpLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [activeTabPillar, setActiveTabPillar] = useState<PersonalPillar | 'all'>('all');
  
  // Level-up celebration state
  const [levelUpData, setLevelUpData] = useState<{
    isOpen: boolean;
    level: number;
    rank: string;
    rankTitle: string;
    expGained: number;
  } | null>(null);

  const fetchPersonalData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [tasksRes, expRes] = await Promise.all([
        supabase.from('personal_tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('personal_exp_log').select('*').eq('user_id', user.id).order('awarded_at', { ascending: false }),
      ]);

      if (tasksRes.data) setTasks(tasksRes.data as PersonalTask[]);
      if (expRes.data) setExpLogs(expRes.data as PersonalExpLog[]);
    } catch (err) {
      console.error("Personal fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalData();

    const handleUpdate = () => fetchPersonalData();
    window.addEventListener('personal-exp-awarded', handleUpdate);
    window.addEventListener('personal-task-created', handleUpdate);
    return () => {
      window.removeEventListener('personal-exp-awarded', handleUpdate);
      window.removeEventListener('personal-task-created', handleUpdate);
    };
  }, []);

  // Compute Independent Personal Progress
  const totalPersonalExp = expLogs.reduce((sum, log) => sum + log.exp_awarded, 0);
  const { level: personalLevel, currentLevelExp, expToNext } = getPersonalLevel(totalPersonalExp);
  const completedTasks = tasks.filter(t => t.status === 'done');
  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const attributes = calculatePersonalAttributes(tasks, expLogs);
  const sGate = checkPersonalSGate(attributes, completedTasks);
  const personalRank = getPersonalRank(attributes, sGate.isSReady);

  const personalStreak = calculateCalendarStreak(expLogs.map(l => l.awarded_at));
  const activityData = calculateWeeklyActivity(expLogs.map(l => l.awarded_at));

  const handleCreateTask = async (data: {
    title: string;
    pillar: PersonalPillar;
    priority: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'boss';
    effort_estimate_mins: number;
    metadata: Record<string, any>;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: inserted, error } = await supabase
      .from('personal_tasks')
      .insert({
        user_id: user.id,
        title: data.title,
        pillar: data.pillar,
        priority: data.priority,
        effort_estimate_mins: data.effort_estimate_mins,
        metadata: data.metadata,
      })
      .select()
      .single();

    if (!error && inserted) {
      setTasks(prev => [inserted as PersonalTask, ...prev]);
      window.dispatchEvent(new CustomEvent('personal-task-created'));
    }
  };

  const handleCompleteTask = async (taskId: string, taskPillar: PersonalPillar, difficulty: 'easy' | 'medium' | 'hard' | 'boss' = 'medium') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const expAwarded = getPersonalExpOnTask(difficulty);
    const oldLevel = personalLevel;
    const task = tasks.find(t => t.id === taskId);

    // 1. Mark task done
    await supabase
      .from('personal_tasks')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', taskId);

    // 2. Insert isolated Personal EXP log
    await supabase
      .from('personal_exp_log')
      .insert({
        user_id: user.id,
        task_id: taskId,
        pillar: taskPillar,
        exp_awarded: expAwarded,
        metadata: { difficulty },
      });

    // 3. Optimistically update state
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' } : t));
    setExpLogs(prev => [{
      id: crypto.randomUUID(),
      user_id: user.id,
      task_id: taskId,
      pillar: taskPillar,
      exp_awarded: expAwarded,
      metadata: { difficulty },
      awarded_at: new Date().toISOString()
    }, ...prev]);

    window.dispatchEvent(new CustomEvent('personal-exp-awarded'));

    // 4. Trigger Tactile Mechanical Feedback HUD
    const newTotalExp = totalPersonalExp + expAwarded;
    const { level: newLevel, currentLevelExp: newLevelExp, expToNext: newExpToNext } = getPersonalLevel(newTotalExp);
    const attr = resolveTaskAttribute('personal', taskPillar);

    triggerTactileFeedback({
      domain: 'personal',
      questTitle: task?.title || 'Personal Quest',
      expGained: expAwarded,
      attributeName: attr.name,
      attributeDelta: attr.delta,
      oldLevel: oldLevel,
      newLevel: newLevel,
      currentLevelExp: newLevelExp,
      expToNext: newExpToNext,
      rank: personalRank.rank,
      rankTitle: personalRank.title
    });
  };

  const filteredTasks = tasks.filter(t => {
    if (activeTabPillar === 'all') return true;
    return t.pillar === activeTabPillar;
  });

  const filteredPending = filteredTasks.filter(t => t.status !== 'done');
  const topPriority = filteredPending.length > 0 ? filteredPending[0] : null;
  const queueTasks = filteredPending.length > 0 ? filteredPending.slice(1) : [];

  // S-Tier progress calculations
  const sTierBooksPct = Math.min(100, Math.round((sGate.totalSynthesizedBooks / sGate.requiredBooks) * 100));
  const sTierMeditationPct = Math.min(100, Math.round((sGate.meditationHours / sGate.requiredMeditationHours) * 100));
  const allAttrsBalanced = Object.values(attributes).every(v => v >= 70);
  const sTierProgressOverall = Math.round((sTierBooksPct + sTierMeditationPct + (allAttrsBalanced ? 100 : 30)) / 3);

  if (loading) return null;

  return (
    <div className="px-8 py-10 max-w-[1600px] mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-12">
        
        {/* LEFT COLUMN: OVERVIEW (MATCHES CAREER) */}
        <div className="flex flex-col gap-10">
          
          {/* Rank Card */}
          <RankCard 
            rank={personalRank.rank} 
            status={personalRank.title} 
            level={personalLevel}
            currentExp={currentLevelExp} 
            maxExp={expToNext} 
          />

          {/* Growth Pillars */}
          <section className="bg-bg-secondary border border-border-strong p-5">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-3">
              <h2 className="text-3xs font-mono font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-rpg-gold rounded-xs" />
                <span>GROWTH ATTRIBUTES</span>
              </h2>
              <span className="text-3xs font-mono text-text-muted">MASTERY</span>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              {[
                { id: 'intellect', name: 'Knowledge', key: 'INT', val: attributes.INT },
                { id: 'mindfulness', name: 'Willpower', key: 'WIL', val: attributes.WIL },
                { id: 'creativity', name: 'Creativity', key: 'CRT', val: attributes.CRT },
                { id: 'relationships', name: 'Charisma', key: 'CHA', val: attributes.CHA },
                { id: 'finance', name: 'Resilience', key: 'RES', val: attributes.RES },
              ].map(p => (
                <div 
                  key={p.id}
                  className="flex flex-col gap-1 py-1 px-2 rounded-xs bg-bg-primary/40 border border-border-subtle hover:border-border-strong transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold tracking-wide text-text-primary">{p.name} ({p.key})</span>
                    <span className={`font-mono text-xs font-bold ${p.val >= 80 ? 'text-rpg-gold' : 'text-text-secondary'}`}>
                      {p.val} / 100
                    </span>
                  </div>
                  <div className="h-1 bg-bg-primary w-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-700 ${p.val >= 80 ? 'bg-rpg-gold' : 'bg-rpg-rare'}`}
                      style={{ width: `${Math.min(100, p.val)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tactical Summary */}
          <section className="bg-bg-secondary border border-border-strong p-5">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-4">
              <h2 className="text-3xs font-mono font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-rpg-gold rounded-xs" />
                <span>TACTICAL SUMMARY</span>
              </h2>
              <span className="text-3xs font-mono text-text-muted">PERSONAL</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              {[
                { value: pendingTasks.length.toString(), label: 'Active Quests', color: 'text-text-primary' },
                { value: personalStreak.toString() + 'D', label: 'Cadence Streak', color: 'text-rpg-gold' },
                { value: completedTasks.length.toString(), label: 'Completed', color: 'text-rpg-green' },
                { value: totalPersonalExp.toLocaleString(), label: 'Personal EXP', color: 'text-rpg-gold' },
              ].map(stat => (
                <div key={stat.label} className="flex flex-col bg-bg-primary/50 p-3 border border-border-subtle">
                  <span className={`text-xl font-black font-mono leading-none tracking-tight ${stat.color}`}>{stat.value}</span>
                  <span className="text-3xs text-text-secondary mt-1.5 uppercase tracking-wider font-mono">{stat.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* S-Tier Polymath Gate Clearance */}
          <section className="bg-bg-secondary border border-border-strong p-5 relative overflow-hidden group hover:border-rpg-gold/40 transition-colors">
            <div className="flex items-center justify-between mb-3 border-b border-border-subtle pb-2">
              <span className="text-3xs font-mono font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
                <Trophy size={13} className="text-rpg-gold" />
                <span>POLYMATH SOVEREIGN GATE</span>
              </span>
              <span className="text-xs font-mono font-bold text-rpg-gold">
                {sTierProgressOverall}%
              </span>
            </div>

            {/* Dynamic Status Banner */}
            {personalRank.rank === 'S' && (
              <div className="bg-rpg-gold/15 text-rpg-gold p-2.5 text-3xs font-mono font-bold uppercase mb-3 flex items-center justify-between border border-rpg-gold/40 shadow-[0_0_8px_rgba(194,89,52,0.2)]">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rpg-gold animate-pulse" />
                  POLYMATH SOVEREIGN (S-TIER)
                </span>
                <span>CLEARED</span>
              </div>
            )}

            <div className="flex flex-col gap-2 text-3xs font-mono text-text-secondary pt-1">
              <div className="flex justify-between">
                <span>Books Read ({sGate.totalSynthesizedBooks}/{sGate.requiredBooks})</span>
                <span className={sGate.totalSynthesizedBooks >= sGate.requiredBooks ? 'text-rpg-green font-bold' : 'text-text-primary'}>
                  {sTierBooksPct}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Mindfulness ({sGate.meditationHours}/{sGate.requiredMeditationHours}h)</span>
                <span className={sGate.meditationHours >= sGate.requiredMeditationHours ? 'text-rpg-green font-bold' : 'text-text-primary'}>
                  {sTierMeditationPct}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Balanced Attributes</span>
                <span className={allAttrsBalanced ? 'text-rpg-green font-bold' : 'text-text-primary'}>
                  {allAttrsBalanced ? 'CLEARED ✓' : 'PENDING'}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-border-subtle">
              <div className="h-1 bg-bg-primary w-full overflow-hidden">
                <div 
                  className="h-full bg-rpg-gold transition-all duration-700"
                  style={{ width: `${sTierProgressOverall}%` }}
                />
              </div>
            </div>
          </section>

        </div>

        {/* CENTER COLUMN: OPERATIONS (MATCHES CAREER) */}
        <div className="flex flex-col gap-10">
          
          {/* Header */}
          <header className="flex items-end justify-between border-b-2 border-border-strong pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 bg-rpg-gold rounded-xs" />
                <span className="text-3xs font-mono font-bold uppercase tracking-widest text-rpg-gold">PERSONAL PROTOCOL // MASTERY MATRIX</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight uppercase leading-none font-cinzel text-text-primary">Personal Quests</h1>
              <div className="text-xs text-text-secondary mt-2 font-mono">
                MASTERY CYCLE // {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
              </div>
            </div>
            <button 
              onClick={() => setIsNewTaskModalOpen(true)}
              className="btn-primary"
            >
              <Plus size={14} /> New Quest
            </button>
          </header>

          {/* Highest Priority Quest */}
          <section>
            <h2 className="label mb-4">Highest Priority Protocol</h2>
            {topPriority ? (
              <div className="relative overflow-hidden bg-bg-secondary border-2 border-rpg-gold/40 p-6 flex flex-col justify-between gap-5 group hover:border-rpg-gold transition-colors shadow-sm">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <div className="label text-rpg-gold font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rpg-gold animate-pulse" />
                    <span>PRIME QUEST &bull; {topPriority.pillar.toUpperCase()}</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-rpg-gold px-2.5 py-0.5 bg-rpg-gold/15 border border-rpg-gold/30">
                    +{getPersonalExpOnTask(topPriority.metadata?.difficulty || 'medium')} PERSONAL XP
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-text-primary tracking-tight font-cinzel">
                    {topPriority.title}
                  </h3>
                  <div className="text-xs font-mono text-text-secondary mt-2 flex flex-wrap items-center gap-3">
                    <span className="px-2 py-0.5 bg-bg-tertiary border border-border-subtle">{topPriority.effort_estimate_mins} MIN</span>
                    {topPriority.metadata?.book_title && (
                      <span>&bull; BOOK: {topPriority.metadata.book_title}</span>
                    )}
                    {topPriority.metadata?.pages_read && (
                      <span>&bull; {topPriority.metadata.pages_read} PAGES</span>
                    )}
                    {topPriority.metadata?.practice && (
                      <span>&bull; {topPriority.metadata.practice}</span>
                    )}
                    {topPriority.metadata?.creation_type && (
                      <span>&bull; {topPriority.metadata.creation_type}</span>
                    )}
                    {topPriority.metadata?.amount_saved && (
                      <span>&bull; ${topPriority.metadata.amount_saved}</span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                  <span className="text-3xs font-mono text-rpg-gold uppercase tracking-wider font-bold">
                    DIFFICULTY: {(topPriority.metadata?.difficulty || 'medium').toUpperCase()}
                  </span>
                  <button
                    onClick={() => handleCompleteTask(topPriority.id, topPriority.pillar, topPriority.metadata?.difficulty || 'medium')}
                    className="btn-primary py-2 px-5 text-xs flex items-center gap-1.5"
                  >
                    <Check size={14} /> Execute Quest
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-bg-secondary border border-border-strong p-6">
                <div className="empty-state py-8 text-center">
                  <div className="text-sm font-semibold mb-1 text-text-primary font-cinzel">All Personal Quests Cleared</div>
                  <div className="text-xs text-text-secondary mb-4 font-mono">Queue is clear. Initialize a personal quest to expand knowledge.</div>
                  <button onClick={() => setIsNewTaskModalOpen(true)} className="btn-primary">
                    Initialize Quest
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Operation Queue */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-border-strong pb-2 gap-3">
              <h2 className="label">Quest Queue</h2>
              
              {/* Filter pills */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setActiveTabPillar('all')}
                  className={`px-2.5 py-1 text-3xs font-mono font-bold uppercase tracking-wider border transition-colors ${
                    activeTabPillar === 'all'
                      ? 'bg-rpg-gold text-bg-primary border-rpg-gold font-black'
                      : 'bg-bg-secondary text-text-secondary border-border-subtle hover:border-rpg-gold/40'
                  }`}
                >
                  All ({tasks.filter(t => t.status !== 'done').length})
                </button>
                {PERSONAL_PILLARS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveTabPillar(p.id)}
                    className={`px-2 py-1 text-3xs font-mono font-bold uppercase tracking-wider border transition-colors ${
                      activeTabPillar === p.id
                        ? 'bg-rpg-gold text-bg-primary border-rpg-gold font-black'
                        : 'bg-bg-secondary text-text-secondary border-border-subtle hover:border-rpg-gold/40'
                    }`}
                  >
                    {p.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col">
              {queueTasks.length > 0 ? (
                queueTasks.map(task => {
                  const meta = task.metadata || {};
                  const diff = meta.difficulty || 'medium';
                  const xp = getPersonalExpOnTask(diff);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 border-b border-border-subtle hover:bg-bg-secondary transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div className="w-1 h-3 bg-text-primary shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-2xs font-mono uppercase font-bold text-text-muted">
                              {task.pillar}
                            </span>
                            <span className="text-sm font-semibold text-text-primary truncate">
                              {task.title}
                            </span>
                          </div>
                          <div className="text-2xs font-mono text-text-secondary flex items-center gap-2">
                            <span>{task.effort_estimate_mins} MIN</span>
                            {meta.book_title && <span>&bull; {meta.book_title}</span>}
                            {meta.pages_read && <span>&bull; {meta.pages_read}p</span>}
                            {meta.practice && <span>&bull; {meta.practice}</span>}
                            {meta.creation_type && <span>&bull; {meta.creation_type}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono font-bold text-accent">+{xp} XP</span>
                        <button
                          onClick={() => handleCompleteTask(task.id, task.pillar, diff)}
                          className="btn-primary py-1.5 px-3 text-2xs flex items-center gap-1 !bg-text-primary hover:!bg-text-secondary text-bg-primary border-none"
                        >
                          <Check size={12} /> Complete
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state py-8">
                  <span className="text-sm font-medium text-text-secondary">
                    {topPriority ? 'No other quests in queue' : 'No quests in queue'}
                  </span>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: ANALYTICS & HISTORY (MATCHES CAREER) */}
        <div className="flex flex-col gap-10">
          
          {/* Activity Grid */}
          <section>
            <h2 className="label mb-4 border-b border-border-strong pb-2">Activity Grid</h2>
            <div className="pt-2">
              <ActivityGrid data={activityData} />
            </div>
          </section>

          {/* Quick Quests / Action Panel */}
          <div className="flex flex-col gap-6">
            <PersonalTrackerPanel 
              onOpenNewTask={() => setIsNewTaskModalOpen(true)}
              onRefresh={fetchPersonalData}
            />
          </div>

          {/* Recent Completions Log */}
          <section>
            <h2 className="label mb-4 border-b border-border-strong pb-2">Recent Log</h2>
            <div className="flex flex-col gap-0">
              {expLogs.length > 0 ? (
                expLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex flex-col py-3 border-b border-border-subtle last:border-0">
                    <div className="flex justify-between items-start gap-4 mb-1">
                      <span className="text-sm font-semibold truncate text-text-primary leading-tight">
                        {log.pillar ? log.pillar.toUpperCase() : 'Personal Quest'}
                      </span>
                      <span className="text-xs font-bold font-mono text-accent shrink-0">
                        +{log.exp_awarded} XP
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-text-secondary">
                      <span className="uppercase tracking-wider">{log.pillar || 'personal'}</span>
                      <span className="font-mono">
                        {new Date(log.awarded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-sm text-text-muted">
                  No quests logged.
                </div>
              )}
            </div>
          </section>

        </div>

      </div>

      {/* New Personal Quest Modal */}
      <NewPersonalTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onSubmit={handleCreateTask}
      />

      {/* Tactile Level Up Modal */}
      {levelUpData && (
        <TactileLevelUpModal
          isOpen={levelUpData.isOpen}
          onClose={() => setLevelUpData(null)}
          domainName="PERSONAL"
          level={levelUpData.level}
          rank={levelUpData.rank}
          rankTitle={levelUpData.rankTitle}
          expGained={levelUpData.expGained}
        />
      )}
    </div>
  );
}
