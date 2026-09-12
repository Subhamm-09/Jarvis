import { useState, useEffect } from 'react';
import { Plus, Check, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { HealthTask, HealthExpLog, HealthPillar } from '../types';
import { 
  HEALTH_PILLARS,
  getHealthLevel,
  getHealthExpOnTask,
  calculateHealthAttributes,
  checkHealthSGate,
  getHealthRank,
  calculateCalendarStreak
} from '../lib/healthRanking';
import { calculateWeeklyActivity } from '../lib/domainTelemetry';
import { RankCard } from '../components/dashboard/RankCard';
import { ActivityGrid } from '../components/dashboard/ActivityGrid';
import { TactileLevelUpModal } from '../components/shared/TactileLevelUpModal';
import { NewHealthTaskModal } from '../components/health/NewHealthTaskModal';
import { HealthTrackerPanel } from '../components/health/HealthTrackerPanel';
import { triggerTactileFeedback, resolveTaskAttribute } from '../lib/tactileFeedback';

export function HealthDashboardPage() {
  const [tasks, setTasks] = useState<HealthTask[]>([]);
  const [expLogs, setExpLogs] = useState<HealthExpLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [activeTabPillar, setActiveTabPillar] = useState<HealthPillar | 'all'>('all');
  
  // Level-up celebration state
  const [levelUpData, setLevelUpData] = useState<{
    isOpen: boolean;
    level: number;
    rank: string;
    rankTitle: string;
    expGained: number;
  } | null>(null);

  const fetchHealthData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [tasksRes, expRes] = await Promise.all([
        supabase.from('health_tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('health_exp_log').select('*').eq('user_id', user.id).order('awarded_at', { ascending: false }),
      ]);

      if (tasksRes.data) setTasks(tasksRes.data as HealthTask[]);
      if (expRes.data) setExpLogs(expRes.data as HealthExpLog[]);
    } catch (err) {
      console.error("Health fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();

    const handleUpdate = () => fetchHealthData();
    window.addEventListener('health-exp-awarded', handleUpdate);
    window.addEventListener('health-task-created', handleUpdate);
    return () => {
      window.removeEventListener('health-exp-awarded', handleUpdate);
      window.removeEventListener('health-task-created', handleUpdate);
    };
  }, []);

  // Compute Independent Health Progress
  const totalHealthExp = expLogs.reduce((sum, log) => sum + log.exp_awarded, 0);
  const { level: healthLevel, currentLevelExp, expToNext } = getHealthLevel(totalHealthExp);
  const completedTasks = tasks.filter(t => t.status === 'done');
  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const attributes = calculateHealthAttributes(tasks, expLogs);
  
  // Active Health Streak calculation from all health exp logs
  const healthStreak = calculateCalendarStreak(expLogs.map(l => l.awarded_at));
  
  // Rolling 7-day protocol count (active weekly maintenance)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recent7DayCount = expLogs.filter(l => new Date(l.awarded_at) >= sevenDaysAgo).length;

  const sGate = checkHealthSGate(attributes, completedTasks, healthStreak, recent7DayCount);
  const healthRank = getHealthRank(attributes, sGate.isSReady);

  // Compute 7-day Activity Grid data for this week (Mon-Sun in local time)
  const activityData = calculateWeeklyActivity(expLogs.map(l => l.awarded_at));

  const handleCreateTask = async (data: {
    title: string;
    pillar: HealthPillar;
    priority: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'boss';
    effort_estimate_mins: number;
    metadata: Record<string, any>;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: inserted, error } = await supabase
      .from('health_tasks')
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
      setTasks(prev => [inserted as HealthTask, ...prev]);
      window.dispatchEvent(new CustomEvent('health-task-created'));
    }
  };

  const handleCompleteTask = async (taskId: string, taskPillar: HealthPillar, difficulty: 'easy' | 'medium' | 'hard' | 'boss' = 'medium') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const expAwarded = getHealthExpOnTask(difficulty);
    const oldLevel = healthLevel;
    const task = tasks.find(t => t.id === taskId);

    // 1. Mark task done
    await supabase
      .from('health_tasks')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', taskId);

    // 2. Insert isolated Health EXP log
    await supabase
      .from('health_exp_log')
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

    window.dispatchEvent(new CustomEvent('health-exp-awarded'));

    // 4. Trigger Tactile Mechanical Feedback HUD
    const newTotalExp = totalHealthExp + expAwarded;
    const { level: newLevel, currentLevelExp: newLevelExp, expToNext: newExpToNext } = getHealthLevel(newTotalExp);
    const attr = resolveTaskAttribute('health', taskPillar);

    triggerTactileFeedback({
      domain: 'health',
      questTitle: task?.title || 'Physical Protocol',
      expGained: expAwarded,
      attributeName: attr.name,
      attributeDelta: attr.delta,
      oldLevel: oldLevel,
      newLevel: newLevel,
      currentLevelExp: newLevelExp,
      expToNext: newExpToNext,
      rank: healthRank.rank,
      rankTitle: healthRank.title
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
  const sTierWorkoutPct = Math.min(100, Math.round((sGate.totalWorkouts / sGate.requiredWorkouts) * 100));
  const sTierStreakPct = Math.min(100, Math.round((sGate.activeStreak / sGate.requiredStreak) * 100));
  const sTierCadencePct = Math.min(100, Math.round((sGate.recent7DayCount / sGate.requiredRecentCount) * 100));
  const sTierProgressOverall = Math.round(
    (sTierWorkoutPct + sTierStreakPct + sTierCadencePct + (sGate.allPillarsBalanced ? 100 : 30)) / 4
  );

  if (loading) return null;

  return (
    <div className="px-8 py-10 max-w-[1600px] mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-12">
        
        {/* LEFT COLUMN: OVERVIEW (MATCHES CAREER) */}
        <div className="flex flex-col gap-10">
          
          {/* Rank Card */}
          <RankCard 
            rank={healthRank.rank} 
            status={healthRank.title} 
            level={healthLevel}
            currentExp={currentLevelExp} 
            maxExp={expToNext} 
          />

          {/* Physical Pillars */}
          <section className="bg-bg-secondary border border-border-strong p-5">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-3">
              <h2 className="text-3xs font-mono font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-rpg-gold rounded-xs" />
                <span>PHYSICAL ATTRIBUTES</span>
              </h2>
              <span className="text-3xs font-mono text-text-muted">BIOMETRICS</span>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              {[
                { id: 'strength', name: 'Strength', key: 'STR', val: attributes.STR },
                { id: 'endurance', name: 'Endurance', key: 'END', val: attributes.END },
                { id: 'recovery', name: 'Recovery', key: 'REC', val: attributes.REC },
                { id: 'nutrition', name: 'Vitality', key: 'VIT', val: attributes.VIT },
                { id: 'mobility', name: 'Agility', key: 'AGI', val: attributes.AGI },
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
                      className={`h-full transition-all duration-700 ${p.val >= 80 ? 'bg-rpg-gold' : 'bg-rpg-green'}`}
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
              <span className="text-3xs font-mono text-text-muted">HEALTH</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              {[
                { value: pendingTasks.length.toString(), label: 'Active Quests', color: 'text-text-primary' },
                { value: healthStreak.toString() + 'D', label: 'Cadence Streak', color: 'text-rpg-gold' },
                { value: completedTasks.length.toString(), label: 'Completed', color: 'text-rpg-green' },
                { value: totalHealthExp.toLocaleString(), label: 'Health EXP', color: 'text-rpg-gold' },
              ].map(stat => (
                <div key={stat.label} className="flex flex-col bg-bg-primary/50 p-3 border border-border-subtle">
                  <span className={`text-xl font-black font-mono leading-none tracking-tight ${stat.color}`}>{stat.value}</span>
                  <span className="text-3xs text-text-secondary mt-1.5 uppercase tracking-wider font-mono">{stat.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* S-Tier Iron Gate Clearance (Dynamic Biological Maintenance) */}
          <section className="bg-bg-secondary border border-border-strong p-5 relative overflow-hidden group hover:border-rpg-gold/40 transition-colors">
            <div className="flex items-center justify-between mb-3 border-b border-border-subtle pb-2">
              <span className="text-3xs font-mono font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
                <Trophy size={13} className="text-rpg-gold" />
                <span>IRON VANGUARD GATE</span>
              </span>
              <span className="text-xs font-mono font-bold text-rpg-gold">
                {sTierProgressOverall}%
              </span>
            </div>

            {/* Dynamic Status Banner */}
            {healthRank.rank === 'S' ? (
              <div className="bg-rpg-gold/15 text-rpg-gold p-2.5 text-3xs font-mono font-bold uppercase mb-3 flex items-center justify-between border border-rpg-gold/40 shadow-[0_0_8px_rgba(28,110,140,0.2)]">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rpg-gold animate-pulse" />
                  APEX TITAN (S-TIER)
                </span>
                <span>MAINTAINED</span>
              </div>
            ) : sGate.isSuspended ? (
              <div className="bg-rpg-crimson/10 border border-rpg-crimson/50 p-2.5 text-3xs font-mono mb-3">
                <div className="font-bold text-rpg-crimson uppercase flex items-center justify-between">
                  <span>S-TIER SUSPENDED</span>
                  <span>ATROPHY DETECTED</span>
                </div>
                <div className="text-3xs text-text-secondary mt-1">
                  Active streak broken. Re-awaken Titan by maintaining an unbroken 14D cadence.
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 text-3xs font-mono text-text-secondary pt-1">
              <div className="flex justify-between">
                <span>Workouts ({sGate.totalWorkouts}/{sGate.requiredWorkouts})</span>
                <span className={sGate.totalWorkouts >= sGate.requiredWorkouts ? 'text-rpg-green font-bold' : 'text-text-primary'}>
                  {sTierWorkoutPct}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Balanced Biometrics</span>
                <span className={sGate.allPillarsBalanced ? 'text-rpg-green font-bold' : 'text-text-primary'}>
                  {sGate.allPillarsBalanced ? 'CLEARED ✓' : 'PENDING'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Maintenance Streak ({sGate.activeStreak}/{sGate.requiredStreak}d)</span>
                <span className={sGate.activeStreak >= sGate.requiredStreak ? 'text-rpg-green font-bold' : 'text-rpg-gold'}>
                  {sTierStreakPct}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>7-Day Cadence ({sGate.recent7DayCount}/{sGate.requiredRecentCount})</span>
                <span className={sGate.recent7DayCount >= sGate.requiredRecentCount ? 'text-rpg-green font-bold' : 'text-text-primary'}>
                  {sTierCadencePct}%
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
                <span className="text-3xs font-mono font-bold uppercase tracking-widest text-rpg-gold">HEALTH PROTOCOL // BIOLOGICAL MATRIX</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight uppercase leading-none font-cinzel text-text-primary">Health Quests</h1>
              <div className="text-xs text-text-secondary mt-2 font-mono">
                CADENCE CYCLE // {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
              </div>
            </div>
            <button 
              onClick={() => setIsNewTaskModalOpen(true)}
              className="btn-primary"
            >
              <Plus size={14} /> New Quest
            </button>
          </header>

          {/* Highest Priority Protocol */}
          <section>
            <h2 className="label mb-4">Highest Priority Protocol</h2>
            {topPriority ? (
              <div className="relative overflow-hidden bg-bg-secondary border-2 border-rpg-gold/40 p-6 flex flex-col justify-between gap-5 group hover:border-rpg-gold transition-colors shadow-sm">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <div className="label text-rpg-gold font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rpg-gold animate-pulse" />
                    <span>PRIME PROTOCOL &bull; {topPriority.pillar.toUpperCase()}</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-rpg-gold px-2.5 py-0.5 bg-rpg-gold/15 border border-rpg-gold/30">
                    +{getHealthExpOnTask(topPriority.metadata?.difficulty || 'medium')} HEALTH XP
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-text-primary tracking-tight font-cinzel">
                    {topPriority.title}
                  </h3>
                  <div className="text-xs font-mono text-text-secondary mt-2 flex flex-wrap items-center gap-3">
                    <span className="px-2 py-0.5 bg-bg-tertiary border border-border-subtle">{topPriority.effort_estimate_mins} MIN</span>
                    {topPriority.metadata?.sets && (
                      <span>&bull; {topPriority.metadata.sets} SETS &times; {topPriority.metadata.reps} REPS</span>
                    )}
                    {topPriority.metadata?.weight_kg && (
                      <span>&bull; {topPriority.metadata.weight_kg} KG</span>
                    )}
                    {topPriority.metadata?.distance_km && (
                      <span>&bull; {topPriority.metadata.distance_km} KM</span>
                    )}
                    {topPriority.metadata?.sleep_hours && (
                      <span>&bull; TARGET {topPriority.metadata.sleep_hours}H</span>
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
                    <Check size={14} /> Execute Protocol
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-bg-secondary border border-border-strong p-6">
                <div className="empty-state py-8 text-center">
                  <div className="text-sm font-semibold mb-1 text-text-primary font-cinzel">All Health Protocols Cleared</div>
                  <div className="text-xs text-text-secondary mb-4 font-mono">Queue is clear. Initialize a physical quest to advance biometrics.</div>
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
                {HEALTH_PILLARS.map(p => (
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
                  const xp = getHealthExpOnTask(diff);
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
                            {meta.sets && <span>&bull; {meta.sets}&times;{meta.reps}</span>}
                            {meta.distance_km && <span>&bull; {meta.distance_km} KM</span>}
                            {meta.sleep_hours && <span>&bull; {meta.sleep_hours}H</span>}
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
                    {topPriority ? 'No other protocols in queue' : 'No protocols in queue'}
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

          {/* Quick Workout / Sleep Log Panel */}
          <div className="flex flex-col gap-6">
            <HealthTrackerPanel 
              onOpenNewTask={() => setIsNewTaskModalOpen(true)}
              onRefresh={fetchHealthData}
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
                        {log.pillar ? log.pillar.toUpperCase() : 'Health Protocol'}
                      </span>
                      <span className="text-xs font-bold font-mono text-accent shrink-0">
                        +{log.exp_awarded} XP
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-text-secondary">
                      <span className="uppercase tracking-wider">{log.pillar || 'health'}</span>
                      <span className="font-mono">
                        {new Date(log.awarded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-sm text-text-muted">
                  No protocols logged.
                </div>
              )}
            </div>
          </section>

        </div>

      </div>

      {/* New Health Quest Modal */}
      <NewHealthTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onSubmit={handleCreateTask}
      />

      {/* Tactile Level Up Modal */}
      {levelUpData && (
        <TactileLevelUpModal
          isOpen={levelUpData.isOpen}
          onClose={() => setLevelUpData(null)}
          domainName="HEALTH"
          level={levelUpData.level}
          rank={levelUpData.rank}
          rankTitle={levelUpData.rankTitle}
          expGained={levelUpData.expGained}
        />
      )}
    </div>
  );
}
