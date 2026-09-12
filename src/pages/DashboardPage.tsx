import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { RankCard } from '../components/dashboard/RankCard';
import { TaskRow } from '../components/dashboard/TaskRow';
import { PriorityPanel } from '../components/dashboard/PriorityPanel';
import { SortablePriorityPanel } from '../components/dashboard/SortablePriorityPanel';
import { ActivityGrid } from '../components/dashboard/ActivityGrid';
import { LeetcodeAnalysisModal } from '../components/dashboard/LeetcodeAnalysisModal';
import { NewTaskModal } from '../components/dashboard/NewTaskModal';
import { RevisionRecallModal } from '../components/dashboard/RevisionRecallModal';
import type { TaskFormData } from '../components/dashboard/NewTaskModal';
import type { Task, Domain } from '../types';
import { Plus, Activity, Bot, User as UserIcon, Trophy, X, FolderGit2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { AddToCollectionModal } from '../components/collections/AddToCollectionModal';
import { HackathonTrackerPanel } from '../components/dashboard/HackathonTrackerPanel';
import { ProjectTrackerPanel } from '../components/dashboard/ProjectTrackerPanel';
import { projects as rankingProjects, leetcode as rankingLeetcode, getCareerLevel } from '../lib/ranking';
import { triggerTactileFeedback, resolveTaskAttribute } from '../lib/tactileFeedback';
import { calculateWeeklyActivity, getStartOfCurrentWeek } from '../lib/domainTelemetry';

const ALL_DOMAINS = [
  { id: 'leetcode', name: 'LeetCode', color: 'bg-rust' },
  { id: 'projects', name: 'Projects', color: 'bg-olive' },
  { id: 'hackathon', name: 'Hackathon', color: 'bg-clay' },
  { id: 'coursework', name: 'Coursework', color: 'bg-stone' },
  { id: 'learning', name: 'Learning', color: 'bg-stone-light' },
  { id: 'general', name: 'General', color: 'bg-muted' }
];

export function DashboardPage() {
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [modalInitialDomain, setModalInitialDomain] = useState<Domain>('leetcode');
  const [addToCollectionTaskId, setAddToCollectionTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalExp, setTotalExp] = useState(0);
  const [highestRank, setHighestRank] = useState('E');
  const [completedCount, setCompletedCount] = useState(0);
  const [activityData, setActivityData] = useState([0,0,0,0,0,0,0]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [domainRanks, setDomainRanks] = useState<Record<string, string>>({});
  const [activeRevisionTask, setActiveRevisionTask] = useState<Task | null>(null);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  
  const [planMode, setPlanMode] = useState<'ai' | 'manual'>('ai');
  const [actionToast, setActionToast] = useState<{ show: boolean; title: string; subtitle?: string; icon: 'hackathon' | 'projects' } | null>(null);
  const rankUpdateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchAiPlan = async () => {
    setIsPlanning(true);
    const { data: planData, error: planError } = await supabase.functions.invoke('daily-plan');
    if (!planError && planData && Array.isArray(planData)) {
      setTasks(prev => prev.map(t => {
        const p = planData.find((x: any) => x.task_id === t.id);
        if (p) {
          return { ...t, ai_rank: planData.indexOf(p) + 1, ai_score: p.ai_score, ai_reason: p.reason };
        }
        return t;
      }));
    } else {
      console.error("AI Plan error:", planError);
    }
    setIsPlanning(false);
  };

  const fetchDashboardStats = async (userId: string) => {
    try {
      // 1. Fetch Stats & Ranks
      const { data: statsData, error: statsError } = await supabase
        .from('stats')
        .select('*')
        .eq('user_id', userId);

      if (!statsError && statsData) {
        let total = 0;
        let rank = 'E';
        const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];
        const currentDomainRanks: Record<string, string> = {};
        
        statsData.forEach((row: any) => {
          total += row.current_exp || 0;
          if (row.domain) {
            currentDomainRanks[row.domain] = row.rank || 'E';
          }
          if (row.rank && ranks.indexOf(row.rank) > ranks.indexOf(rank)) {
            rank = row.rank;
          }
        });
        setTotalExp(total);
        setHighestRank(rank);
        setDomainRanks(currentDomainRanks);
      }

      // 2. Fetch completed count
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'done');
      
      setCompletedCount(count || 0);

      // 3. Fetch completed tasks this week for ActivityGrid (in local calendar time)
      const startOfWeek = getStartOfCurrentWeek();
      const { data: recentCompleted } = await supabase
        .from('tasks')
        .select('updated_at')
        .eq('user_id', userId)
        .eq('status', 'done')
        .gte('updated_at', startOfWeek.toISOString());

      if (recentCompleted) {
        setActivityData(calculateWeeklyActivity(recentCompleted.map(t => t.updated_at)));
      }

      // 4. Fetch recent completions for Dashboard
      const { data: recentExpLogs } = await supabase
        .from('exp_log')
        .select(`
          id,
          awarded_at,
          exp_awarded,
          tasks (
            title,
            domain
          )
        `)
        .eq('user_id', userId)
        .order('awarded_at', { ascending: false })
        .limit(4);

      if (recentExpLogs) {
        setRecentLogs(recentExpLogs);
      }
    } catch (err) {
      console.error("DashboardPage fetchDashboardStats Error:", err);
    }
  };

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        setUser(user);

        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .neq('status', 'done');
        
        if (!error && data) {
          setTasks(data as Task[]);
          
          // Non-blocking fetch for AI Daily Plan
          fetchAiPlan();
        }

        await fetchDashboardStats(user.id);
      } catch (err) {
        console.error("DashboardPage fetchTasks Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    // Listen for exp-awarded events from any source (completions, hackathon results, etc.)
    const handleExpAwarded = () => {
      supabase.auth.getUser().then(({ data: { user: u } }) => {
        if (u) fetchDashboardStats(u.id);
      });
    };

    window.addEventListener('exp-awarded', handleExpAwarded);

    return () => {
      window.removeEventListener('exp-awarded', handleExpAwarded);
      Object.values(rankUpdateTimers.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!actionToast?.show) return;
    const timer = setTimeout(() => {
      setActionToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [actionToast]);

  // Filter out overarching hackathon and project entries from the daily operation queue.
  // They are tracked directly in their respective dashboard Radar panels instead.
  const queueableTasks = tasks.filter(t => 
    !(t.domain === 'hackathon' && (t.metadata?.is_primary_entry === true || t.metadata?.action === 'entered')) &&
    !(t.domain === 'projects' && (t.metadata?.is_primary_entry === true || t.metadata?.action === 'created'))
  );

  const sortedTasks = [...queueableTasks].sort((a, b) => {
    if (planMode === 'ai') {
      const aRank = a.ai_rank ?? Number.MAX_SAFE_INTEGER;
      const bRank = b.ai_rank ?? Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else {
      const aRank = a.manual_rank ?? 0;
      const bRank = b.manual_rank ?? 0;
      if (aRank !== bRank) return aRank - bRank;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
  });

  const topPriority = sortedTasks[0] || null;
  const topReason = planMode === 'ai' ? topPriority?.ai_reason : null;
  const topAiScore = topPriority?.ai_score;
  const queueTasks = sortedTasks.slice(1);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || planMode !== 'manual') return;

    const oldIndex = sortedTasks.findIndex(t => t.id === active.id);
    const newIndex = sortedTasks.findIndex(t => t.id === over.id);

    // Optimistic reorder
    const newTasks = arrayMove(sortedTasks, oldIndex, newIndex);
    
    // Calculate new manual_rank
    let newRank = 0;
    if (newIndex === 0) {
      newRank = (newTasks[1]?.manual_rank || 0) - 1.0;
    } else if (newIndex === newTasks.length - 1) {
      newRank = (newTasks[newTasks.length - 2]?.manual_rank || 0) + 1.0;
    } else {
      const prevRank = newTasks[newIndex - 1].manual_rank || 0;
      const nextRank = newTasks[newIndex + 1].manual_rank || 0;
      newRank = (prevRank + nextRank) / 2.0;
    }

    const draggedTask = newTasks[newIndex];
    draggedTask.manual_rank = newRank;

    setTasks(prev => prev.map(t => t.id === draggedTask.id ? { ...t, manual_rank: newRank } : t));

    // Debounce Supabase write to prevent race conditions during rapid reordering
    if (rankUpdateTimers.current[draggedTask.id]) {
      clearTimeout(rankUpdateTimers.current[draggedTask.id]);
    }

    rankUpdateTimers.current[draggedTask.id] = setTimeout(async () => {
      const { error } = await supabase
        .from('tasks')
        .update({ manual_rank: newRank })
        .eq('id', draggedTask.id);

      if (error) console.error("Error updating manual rank:", error);
      delete rankUpdateTimers.current[draggedTask.id];
    }, 300);
  };

  const handleDragStart = (_event: DragStartEvent) => {
    // Optional: Can handle drag start logic here if needed
  };

  const handleCreateTask = async (data: TaskFormData) => {
    try {
      const activeUser = user || (await supabase.auth.getUser()).data.user;
      if (!activeUser) {
        alert("Session expired or user not loaded. Please refresh and log in.");
        return;
      }
      
      const maxManualRank = tasks.length > 0 ? Math.max(...tasks.map(t => t.manual_rank || 0)) : 0;
      
      const validDeadline = data.deadline && !isNaN(new Date(data.deadline).getTime())
        ? new Date(data.deadline).toISOString()
        : null;

      const newTask = {
        user_id: activeUser.id,
        title: data.title,
        domain: data.domain.toLowerCase(),
        status: 'todo',
        priority: data.priority,
        deadline: validDeadline,
        effort_estimate_mins: data.effort_estimate_mins || 30,
        metadata: data.metadata || {},
        manual_rank: maxManualRank + 1.0,
      };

      const { data: inserted, error } = await supabase
        .from('tasks')
        .insert(newTask)
        .select()
        .single();

      if (!error && inserted) {
        setTasks(prev => [...prev, inserted as Task]);
        setIsNewTaskModalOpen(false);

        // Check if this was a main hackathon entry (not a subtask)
        const isMainHackathon = inserted.domain === 'hackathon' && 
          (inserted.metadata?.is_primary_entry === true || inserted.metadata?.action === 'entered');

        if (isMainHackathon) {
          const hName = (inserted.metadata?.hackathon_name as string) || 
            inserted.title.replace(/^🏆\s*Hackathon:\s*/i, '').replace(/^🏆\s*Hackathon Entry:\s*/i, '');
          setActionToast({ show: true, title: 'Hackathon added', subtitle: `${hName} // Tracked in Radar`, icon: 'hackathon' });
        }

        // Check if this was a main project entry (not a milestone subtask)
        const isMainProject = inserted.domain === 'projects' && 
          (inserted.metadata?.is_primary_entry === true || inserted.metadata?.action === 'created');

        if (isMainProject) {
          const pName = (inserted.metadata?.project_name as string) || 
            inserted.title.replace(/^🚀\s*Project:\s*/i, '');
          setActionToast({ show: true, title: 'Project added', subtitle: `${pName} // Tracked in Radar`, icon: 'projects' });
        }

        // Notify HackathonTrackerPanel, ProjectTrackerPanel, and stats subscribers immediately
        window.dispatchEvent(new CustomEvent('exp-awarded'));
        window.dispatchEvent(new CustomEvent('task-created', { detail: inserted }));
      } else {
        console.error("Database error initializing task:", error);
        alert("System Error: Failed to initialize operation. " + (error?.message || "Check console."));
      }
    } catch (err: any) {
      console.error("handleCreateTask exception:", err);
      alert("Error initializing task: " + (err?.message || "Unknown error"));
    }
  };

  const getOptimisticExp = (t: Task): number => {
    const meta = (t.metadata || {}) as Record<string, any>;
    if (t.domain === 'leetcode') {
      const diff = (meta.difficulty || 'easy').toLowerCase();
      if (meta.is_revision) {
        return rankingLeetcode.getExpOnRevision(diff);
      }
      return rankingLeetcode.getExpOnSolve(diff);
    }
    if (t.domain === 'hackathon') {
      if (meta.action === 'entered') return 30;
      if (meta.action === 'result') {
        const res = (meta.result || '').toLowerCase();
        if (res === 'winner') return 400;
        if (res === 'runner up' || res === 'runner_up' || res === 'finalist') return 150;
        return 0;
      }
      const diff = (meta.difficulty || 'medium').toLowerCase();
      return diff === 'hard' ? 50 : diff === 'medium' ? 25 : 10;
    }
    if (t.domain === 'projects') {
      if (meta.action === 'task') {
        const diff = (meta.difficulty || 'medium').toLowerCase();
        return diff === 'hard' ? 50 : diff === 'medium' ? 25 : 10;
      }
      const rating = meta.ai_evaluation?.overall_score || meta.rating || 7.0;
      return rankingProjects.getExpFromRating(rating) || 100;
    }
    if (t.domain === 'learning') {
      return meta.completed ? 100 : Math.min(5, parseFloat(meta.hours) || 1) * 5;
    }
    return t.effort_estimate_mins || 30;
  };

  const handleCompleteTask = async (taskId: string, recallResult?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.metadata?.is_revision === true && !recallResult) {
      setActiveRevisionTask(task);
      setIsRecallModalOpen(true);
      return;
    }

    if (!task) return;

    const estimatedExp = getOptimisticExp(task);

    // 1. INSTANT OPTIMISTIC STATE UPDATES (<1ms)
    // Remove task from active queue immediately
    setTasks(prev => prev.filter(t => t.id !== taskId));
    
    // Tactile Physical Completion Trigger
    const oldProg = getCareerLevel(totalExp);
    const newProg = getCareerLevel(totalExp + estimatedExp);
    const attr = resolveTaskAttribute('career', task.domain);
    triggerTactileFeedback({
      domain: 'career',
      questTitle: task.title,
      expGained: estimatedExp,
      attributeName: attr.name,
      attributeDelta: attr.delta,
      oldLevel: oldProg.level,
      newLevel: newProg.level,
      currentLevelExp: newProg.currentLevelExp,
      expToNext: newProg.expToNext,
      rank: highestRank,
      rankTitle: `Clearance Level ${newProg.level}`
    });

    // Increment total EXP and completed counter immediately
    setTotalExp(prev => prev + estimatedExp);
    setCompletedCount(prev => prev + 1);

    // Light up today's activity grid cell immediately (in local calendar time)
    const today = new Date();
    const todayDay = today.getDay();
    const todayIndex = todayDay === 0 ? 6 : todayDay - 1;
    setActivityData(prev => {
      const next = [...prev];
      if (todayIndex >= 0 && todayIndex < next.length) {
        next[todayIndex] = Math.min(4, (next[todayIndex] || 0) + 1);
      }
      return next;
    });

    // Prepend to Recent Log immediately
    setRecentLogs(prev => [
      {
        id: 'opt-' + Date.now(),
        awarded_at: new Date().toISOString(),
        exp_awarded: estimatedExp,
        tasks: {
          title: task.title,
          domain: task.domain
        }
      },
      ...prev.slice(0, 3)
    ]);

    // Dispatch exp-awarded immediately so Navbar streak and rank react instantly
    window.dispatchEvent(new CustomEvent('exp-awarded', { detail: { taskId, exp: estimatedExp } }));

    if (isRecallModalOpen) {
      setIsRecallModalOpen(false);
      setActiveRevisionTask(null);
    }

    // 2. BACKGROUND PERSISTENCE & AUTHORITATIVE RECONCILIATION
    let metadataUpdate = task.metadata || {};
    if (recallResult) {
      metadataUpdate = { ...metadataUpdate, recall_result: recallResult };
    }

    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: 'done', 
        updated_at: new Date().toISOString(),
        ...(recallResult ? { metadata: metadataUpdate } : {})
      })
      .eq('id', taskId);
      
    if (error) {
      console.error("Failed to complete task:", error);
      return;
    }

    // Trigger AI replan against remaining tasks in background
    fetchAiPlan();

    // Authoritative EXP calculation via Edge Function
    const { data: expResult, error: fnError } = await supabase.functions.invoke('award-exp', {
      body: { task_id: taskId }
    });
    
    if (fnError) {
      console.error("Failed to award EXP in backend:", fnError);
    } else {
      console.log("Authoritative EXP Awarded:", expResult);
    }

    // Reconcile exact stats and recalculated ranks from DB
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await fetchDashboardStats(currentUser.id);
    }
  };

  if (loading) return null; // Or a sleek loader

  const { level: careerLevel, currentLevelExp, expToNext } = getCareerLevel(totalExp);

  return (
    <div className="px-8 py-10 max-w-[1600px] mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-12">
        
        {/* LEFT COLUMN: OVERVIEW */}
        <div className="flex flex-col gap-10">
          <RankCard 
            rank={highestRank} 
            status="Awakened" 
            level={careerLevel}
            currentExp={currentLevelExp} 
            maxExp={expToNext} 
          />

          {/* Domains */}
          <section>
            <h2 className="label mb-4 border-b border-border-strong pb-2">Active Domains</h2>
            <div className="flex flex-col gap-2 pt-2">
              {ALL_DOMAINS.map(d => {
                const rank = domainRanks[d.id];
                const isLocked = !rank;
                return (
                  <div 
                    key={d.name}
                    className={`flex items-center justify-between py-1 transition-opacity ${isLocked ? 'opacity-40' : 'hover:opacity-80'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-3 ${isLocked ? 'bg-border-strong' : 'bg-text-primary'}`} />
                      <span className="text-sm font-semibold">{d.name}</span>
                    </div>
                    <span className="text-xs font-mono text-text-secondary">{rank || 'LOCKED'}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quick Stats */}
          <section>
            <h2 className="label mb-4 border-b border-border-strong pb-2">Tactical Summary</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-2">
              {[
                { value: tasks.length.toString(), label: 'Pending' },
                { value: tasks.filter(t => t.priority >= 4).length.toString(), label: 'Critical' },
                { value: completedCount.toString(), label: 'Completed' },
                { value: totalExp.toString(), label: 'Total EXP' },
              ].map(stat => (
                <div key={stat.label} className="flex flex-col">
                  <span className="text-2xl font-black font-mono leading-none tracking-tight">{stat.value}</span>
                  <span className="text-xs text-text-secondary mt-1 uppercase tracking-wider">{stat.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* CENTER COLUMN: OPERATIONS */}
        <div className="flex flex-col gap-10">
          {/* Header */}
          <header className="flex items-end justify-between border-b-2 border-text-primary pb-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight uppercase leading-none">Today</h1>
              <div className="text-sm text-text-secondary mt-2 font-mono">
                Operational Focus // {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
              </div>
            </div>
            <button 
              onClick={() => {
                setModalInitialDomain('leetcode');
                setIsNewTaskModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus size={14} /> New Task
            </button>
          </header>

          {/* Unified Sortable Context for both Priority Panel and Queue */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={sortedTasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {/* Priority Panel */}
              <section>
                <h2 className="label mb-4">Highest Priority</h2>
                {planMode === 'ai' ? (
                  <PriorityPanel 
                    task={topPriority}
                    reason={topReason}
                    aiScore={topAiScore}
                    isPlanning={isPlanning}
                    planMode={planMode}
                    onComplete={() => topPriority && handleCompleteTask(topPriority.id)}
                    onReplan={fetchAiPlan}
                    onNewTask={() => {
                      setModalInitialDomain('leetcode');
                      setIsNewTaskModalOpen(true);
                    }}
                    onAddToCollection={setAddToCollectionTaskId}
                  />
                ) : (
                  <SortablePriorityPanel
                    task={topPriority}
                    reason={topReason}
                    aiScore={topAiScore}
                    isPlanning={isPlanning}
                    planMode={planMode}
                    onComplete={() => topPriority && handleCompleteTask(topPriority.id)}
                    onReplan={fetchAiPlan}
                    onNewTask={() => {
                      setModalInitialDomain('leetcode');
                      setIsNewTaskModalOpen(true);
                    }}
                    onAddToCollection={setAddToCollectionTaskId}
                  />
                )}
              </section>

              {/* Operation Queue */}
              <section>
                <div className="flex items-center justify-between mb-4 border-b border-border-strong pb-2">
                  <h2 className="label">Operation Queue</h2>
                  <div className="flex bg-bg-tertiary p-1 rounded border border-border-subtle">
                    <button
                      onClick={() => setPlanMode('ai')}
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 rounded-sm ${planMode === 'ai' ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}
                    >
                      <Bot size={12} /> AI Plan
                    </button>
                    <button
                      onClick={() => setPlanMode('manual')}
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 rounded-sm ${planMode === 'manual' ? 'bg-text-primary text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}
                    >
                      <UserIcon size={12} /> Manual Plan
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col">
                  {queueTasks.length > 0 ? (
                    queueTasks.map(task => (
                      <TaskRow 
                        key={task.id} 
                        task={task} 
                        reason={planMode === 'ai' ? task.ai_reason : undefined}
                        aiScore={planMode === 'ai' ? task.ai_score : undefined}
                        isManualMode={planMode === 'manual'}
                        onAddToCollection={setAddToCollectionTaskId}
                      />
                    ))
                  ) : (
                    <div className="empty-state">
                      <span className="text-sm font-medium text-text-secondary">No operations in queue</span>
                    </div>
                  )}
                </div>
              </section>
            </SortableContext>
          </DndContext>
        </div>

        {/* RIGHT COLUMN: ANALYTICS & HISTORY */}
        <div className="flex flex-col gap-10">
          <section>
            <h2 className="label mb-4 border-b border-border-strong pb-2">Activity Grid</h2>
            <div className="pt-2">
              <ActivityGrid data={activityData} />
            </div>
          </section>

          {/* Action Modals triggers */}
          <section className="flex flex-col gap-3">
             <button 
              onClick={() => setIsAnalysisModalOpen(true)}
              className="panel flex items-center justify-between p-4 hover:border-text-primary transition-colors text-left"
            >
              <div>
                <div className="text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Activity size={14} /> Metrics Review
                </div>
                <div className="text-xs text-text-secondary">Analyze LeetCode recall data</div>
              </div>
              <div className="text-text-secondary">&rarr;</div>
            </button>
          </section>

          {/* Recent Completions */}
          <section>
            <h2 className="label mb-4 border-b border-border-strong pb-2">Recent Log</h2>
            <div className="flex flex-col gap-0">
              {recentLogs.length > 0 ? (
                recentLogs.map(log => (
                  <div key={log.id} className="flex flex-col py-3 border-b border-border-subtle last:border-0">
                    <div className="flex justify-between items-start gap-4 mb-1">
                      <span className="text-sm font-semibold truncate text-text-primary leading-tight">
                        {log.tasks?.title || 'Unknown Operation'}
                      </span>
                      <span className="text-xs font-bold font-mono text-text-primary shrink-0">
                        +{log.exp_awarded} XP
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-text-secondary">
                      <span className="uppercase tracking-wider">{log.tasks?.domain || 'general'}</span>
                      <span className="font-mono">
                        {new Date(log.awarded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-sm text-text-muted">
                  No operations logged.
                </div>
              )}
            </div>
          </section>

          {/* Radars */}
          <div className="flex flex-col gap-6">
            <HackathonTrackerPanel onOpenNewTask={(dom) => {
              setModalInitialDomain(dom || 'hackathon');
              setIsNewTaskModalOpen(true);
            }} />
            <ProjectTrackerPanel onOpenNewTask={(dom) => {
              setModalInitialDomain(dom || 'projects');
              setIsNewTaskModalOpen(true);
            }} />
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onSubmit={handleCreateTask}
        initialDomain={modalInitialDomain}
      />

      <AddToCollectionModal
        taskId={addToCollectionTaskId}
        onClose={() => setAddToCollectionTaskId(null)}
      />

      <RevisionRecallModal
        task={activeRevisionTask}
        isOpen={isRecallModalOpen}
        onClose={() => {
          setIsRecallModalOpen(false);
          setActiveRevisionTask(null);
        }}
        onSubmit={(result) => {
          if (activeRevisionTask) {
            handleCompleteTask(activeRevisionTask.id, result);
          }
        }}
      />

      <LeetcodeAnalysisModal 
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
      />

      {/* Action Toast Pop-up */}
      {actionToast?.show && (
        <div 
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[120] bg-bg-secondary border-2 border-text-primary px-4 py-3 shadow-[4px_4px_0_0_var(--color-text-primary)] flex items-center gap-3 max-w-sm transition-all animate-in fade-in slide-in-from-bottom-3"
        >
          <div className="w-8 h-8 bg-text-primary text-bg-primary flex items-center justify-center shrink-0">
            {actionToast.icon === 'projects' ? <FolderGit2 size={16} /> : <Trophy size={16} />}
          </div>
          <div className="flex flex-col min-w-0 pr-2">
            <div className="text-xs font-mono font-black uppercase tracking-wider text-text-primary">
              {actionToast.title}
            </div>
            {actionToast.subtitle && (
              <div className="text-[11px] font-mono text-text-secondary truncate">
                {actionToast.subtitle}
              </div>
            )}
          </div>
          <button 
            onClick={() => setActionToast(null)}
            className="ml-auto text-text-muted hover:text-text-primary hover:bg-bg-tertiary p-1 transition-colors border border-transparent hover:border-border-strong shrink-0"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
