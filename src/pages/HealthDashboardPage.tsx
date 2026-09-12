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

  // Compute 7-day Activity Grid data for this week (Mon-Sun)
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));

  const recentThisWeek = expLogs.filter(l => new Date(l.awarded_at) >= startOfWeek);
  const activityData = [0, 0, 0, 0, 0, 0, 0];
  recentThisWeek.forEach(l => {
    const d = new Date(l.awarded_at);
    const dow = d.getUTCDay();
    const idx = dow === 0 ? 6 : dow - 1; // 0=Mon, 6=Sun
    activityData[idx] = Math.min(4, activityData[idx] + 1);
  });

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
          <section>
            <h2 className="label mb-4 border-b border-border-strong pb-2">Physical Pillars</h2>
            <div className="flex flex-col gap-2 pt-2">
              {[
                { id: 'strength', name: 'Strength', key: 'STR', val: attributes.STR },
                { id: 'endurance', name: 'Cardio', key: 'END', val: attributes.END },
                { id: 'recovery', name: 'Recovery', key: 'REC', val: attributes.REC },
                { id: 'nutrition', name: 'Consistency', key: 'VIT', val: attributes.VIT },
                { id: 'mobility', name: 'Vitality', key: 'AGI', val: attributes.AGI },
              ].map(p => (
                <div 
                  key={p.id}
                  className="flex items-center justify-between py-1 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-3 bg-text-primary" />
                    <span className="text-sm font-semibold">{p.name}</span>
                  </div>
                  <span className="text-xs font-mono text-text-secondary">{p.val} / 100</span>
                </div>
              ))}
            </div>
          </section>

          {/* Tactical Summary */}
          <section>
            <h2 className="label mb-4 border-b border-border-strong pb-2">Tactical Summary</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-2">
              {[
                { value: pendingTasks.length.toString(), label: 'Pending' },
                { value: healthStreak.toString() + 'D', label: 'Streak' },
                { value: completedTasks.length.toString(), label: 'Completed' },
                { value: totalHealthExp.toLocaleString(), label: 'Total EXP' },
              ].map(stat => (
                <div key={stat.label} className="flex flex-col">
                  <span className="text-2xl font-black font-mono leading-none tracking-tight">{stat.value}</span>
                  <span className="text-xs text-text-secondary mt-1 uppercase tracking-wider">{stat.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* S-Tier Iron Gate Clearance (Dynamic Biological Maintenance) */}
          <section className="panel p-4 border border-border-strong bg-bg-secondary">
            <div className="flex items-center justify-between mb-3 border-b border-border-subtle pb-2">
              <span className="label text-text-primary flex items-center gap-1.5">
                <Trophy size={13} className="text-accent" />
                <span>S-Tier Gate</span>
              </span>
              <span className="text-xs font-mono font-bold text-accent">
                {sTierProgressOverall}%
              </span>
            </div>

            {/* Dynamic Status Banner */}
            {healthRank.rank === 'S' ? (
              <div className="bg-text-primary text-bg-primary p-2 text-2xs font-mono font-bold uppercase mb-3 flex items-center justify-between border border-border-strong">
                <span className="text-accent font-bold">● APEX TITAN</span>
                <span>MAINTAINED</span>
              </div>
            ) : sGate.isSuspended ? (
              <div className="bg-accent/10 border border-accent p-2.5 text-2xs font-mono mb-3">
                <div className="font-bold text-accent uppercase flex items-center justify-between">
                  <span>S-TIER SUSPENDED</span>
                  <span>ATROPHY</span>
                </div>
                <div className="text-3xs text-text-secondary mt-1">
                  Active streak broken. Re-awaken Titan by maintaining an unbroken 14D cadence.
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 text-2xs font-mono text-text-secondary">
              <div className="flex justify-between">
                <span>Workouts ({sGate.totalWorkouts}/{sGate.requiredWorkouts})</span>
                <span className={sGate.totalWorkouts >= sGate.requiredWorkouts ? 'text-success font-bold' : ''}>
                  {sTierWorkoutPct}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Balanced Biometrics</span>
                <span className={sGate.allPillarsBalanced ? 'text-success font-bold' : ''}>
                  {sGate.allPillarsBalanced ? 'CLEARED' : 'PENDING'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Maintenance Streak ({sGate.activeStreak}/{sGate.requiredStreak}d)</span>
                <span className={sGate.activeStreak >= sGate.requiredStreak ? 'text-success font-bold' : 'text-accent'}>
                  {sTierStreakPct}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>7-Day Cadence ({sGate.recent7DayCount}/{sGate.requiredRecentCount})</span>
                <span className={sGate.recent7DayCount >= sGate.requiredRecentCount ? 'text-success font-bold' : ''}>
                  {sTierCadencePct}%
                </span>
              </div>
            </div>
          </section>

        </div>

        {/* CENTER COLUMN: OPERATIONS (MATCHES CAREER) */}
        <div className="flex flex-col gap-10">
          
          {/* Header */}
          <header className="flex items-end justify-between border-b-2 border-text-primary pb-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight uppercase leading-none">Today</h1>
              <div className="text-sm text-text-secondary mt-2 font-mono">
                Health Protocols // {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
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
            <h2 className="label mb-4">Highest Priority</h2>
            {topPriority ? (
              <div className="panel p-6 border-l-2 border-l-accent flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <div className="label text-accent font-semibold flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>Top Priority &bull; {topPriority.pillar.toUpperCase()}</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-accent">
                    +{getHealthExpOnTask(topPriority.metadata?.difficulty || 'medium')} HEALTH XP
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-text-primary tracking-tight">
                    {topPriority.title}
                  </h3>
                  <div className="text-xs font-mono text-text-secondary mt-2 flex flex-wrap items-center gap-3">
                    <span>{topPriority.effort_estimate_mins} MIN</span>
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
                  <span className="text-2xs font-mono text-text-muted uppercase tracking-wider">
                    DIFFICULTY: {(topPriority.metadata?.difficulty || 'medium').toUpperCase()}
                  </span>
                  <button
                    onClick={() => handleCompleteTask(topPriority.id, topPriority.pillar, topPriority.metadata?.difficulty || 'medium')}
                    className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 !bg-accent hover:!bg-accent-hover text-white border-none"
                  >
                    <Check size={14} /> Complete Protocol
                  </button>
                </div>
              </div>
            ) : (
              <div className="panel p-6 border-l-2 border-l-accent">
                <div className="empty-state py-8">
                  <div className="text-sm font-semibold mb-1 text-text-primary">No Active Protocols</div>
                  <div className="text-xs text-text-secondary mb-4 font-mono">Queue is clear. Initialize a health quest to begin.</div>
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
              <h2 className="label">Operation Queue</h2>
              
              {/* Filter pills */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setActiveTabPillar('all')}
                  className={`px-2.5 py-1 text-2xs font-mono font-bold uppercase tracking-wider border transition-colors ${
                    activeTabPillar === 'all'
                      ? 'bg-text-primary text-bg-primary border-text-primary'
                      : 'bg-bg-secondary text-text-secondary border-border-subtle hover:border-text-primary'
                  }`}
                >
                  All ({tasks.filter(t => t.status !== 'done').length})
                </button>
                {HEALTH_PILLARS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveTabPillar(p.id)}
                    className={`px-2 py-1 text-2xs font-mono font-bold uppercase tracking-wider border transition-colors ${
                      activeTabPillar === p.id
                        ? 'bg-text-primary text-bg-primary border-text-primary'
                        : 'bg-bg-secondary text-text-secondary border-border-subtle hover:border-text-primary'
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
