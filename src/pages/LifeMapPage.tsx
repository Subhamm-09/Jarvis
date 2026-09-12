import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, HeartPulse, Brain, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { calculateLifeEquilibrium, type LifeBalanceState } from '../lib/lifeBalance';
import { getCareerLevel } from '../lib/ranking';
import { getHealthLevel, calculateHealthAttributes, getHealthRank, checkHealthSGate } from '../lib/healthRanking';
import { getPersonalLevel, calculatePersonalAttributes, getPersonalRank, checkPersonalSGate } from '../lib/personalRanking';
import type { Task, HealthTask, HealthExpLog, PersonalTask, PersonalExpLog } from '../types';

interface RecentActivity {
  id: string;
  domain: 'Career' | 'Health' | 'Personal';
  title: string;
  exp: number;
  awarded_at: string;
}

export function LifeMapPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Career Telemetry
  const [careerTasks, setCareerTasks] = useState<Task[]>([]);
  const [careerStats, setCareerStats] = useState<any[]>([]);
  const [careerExpLogs, setCareerExpLogs] = useState<any[]>([]);
  const [careerStreak, setCareerStreak] = useState(0);

  // Health Telemetry
  const [healthTasks, setHealthTasks] = useState<HealthTask[]>([]);
  const [healthExpLogs, setHealthExpLogs] = useState<HealthExpLog[]>([]);
  const [healthStreak, setHealthStreak] = useState(0);

  // Personal Telemetry
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [personalExpLogs, setPersonalExpLogs] = useState<PersonalExpLog[]>([]);
  const [personalStreak, setPersonalStreak] = useState(0);

  // Transmission & Activity Ticker
  const [advisorAdvice, setAdvisorAdvice] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  const calcStreak = (dateStrings: string[]): number => {
    const distinctDates = Array.from(new Set(
      dateStrings.map(ds => {
        const d = new Date(ds);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    ));

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

    let checkDate = today;
    let checkDateStr = todayStr;
    let streak = 0;
    
    if (!distinctDates.includes(todayStr) && distinctDates.includes(yesterdayStr)) {
      checkDate = yesterday;
      checkDateStr = yesterdayStr;
    }

    while (distinctDates.includes(checkDateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
      checkDateStr = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
    }
    return streak;
  };

  const fetchTelemetry = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        cTasksRes, cStatsRes, cExpRes,
        hTasksRes, hExpRes,
        pTasksRes, pExpRes
      ] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('stats').select('*').eq('user_id', user.id),
        supabase.from('exp_log').select('*').eq('user_id', user.id),
        supabase.from('health_tasks').select('*').eq('user_id', user.id),
        supabase.from('health_exp_log').select('*').eq('user_id', user.id),
        supabase.from('personal_tasks').select('*').eq('user_id', user.id),
        supabase.from('personal_exp_log').select('*').eq('user_id', user.id),
      ]);

      if (cTasksRes.data) setCareerTasks(cTasksRes.data as Task[]);
      if (cStatsRes.data) setCareerStats(cStatsRes.data);
      if (cExpRes.data) {
        setCareerExpLogs(cExpRes.data);
        setCareerStreak(calcStreak(cExpRes.data.map((l: any) => l.awarded_at)));
      }

      if (hTasksRes.data) setHealthTasks((hTasksRes.data as HealthTask[]) || []);
      if (hExpRes.data) {
        setHealthExpLogs((hExpRes.data as HealthExpLog[]) || []);
        setHealthStreak(calcStreak(hExpRes.data.map((l: any) => l.awarded_at)));
      }

      if (pTasksRes.data) setPersonalTasks((pTasksRes.data as PersonalTask[]) || []);
      if (pExpRes.data) {
        setPersonalExpLogs((pExpRes.data as PersonalExpLog[]) || []);
        setPersonalStreak(calcStreak(pExpRes.data.map((l: any) => l.awarded_at)));
      }

      // Build recent cross-domain activity strip
      const recents: RecentActivity[] = [];
      (cExpRes.data || []).slice(0, 3).forEach((l: any) => {
        recents.push({
          id: l.id,
          domain: 'Career',
          title: l.domain || 'Career Operation',
          exp: l.exp_awarded,
          awarded_at: l.awarded_at
        });
      });
      (hExpRes.data || []).slice(0, 3).forEach((l: any) => {
        recents.push({
          id: l.id,
          domain: 'Health',
          title: l.pillar || 'Health Protocol',
          exp: l.exp_awarded,
          awarded_at: l.awarded_at
        });
      });
      (pExpRes.data || []).slice(0, 3).forEach((l: any) => {
        recents.push({
          id: l.id,
          domain: 'Personal',
          title: l.pillar || 'Personal Quest',
          exp: l.exp_awarded,
          awarded_at: l.awarded_at
        });
      });
      recents.sort((a, b) => new Date(b.awarded_at).getTime() - new Date(a.awarded_at).getTime());
      setRecentActivities(recents.slice(0, 4));

      // Non-blocking Advisor Call
      try {
        const cCount = (cTasksRes.data || []).filter((t: any) => t.status === 'done').length;
        const hDone = ((hTasksRes.data as HealthTask[]) || []).filter(t => t.status === 'done').length;
        const pDone = ((pTasksRes.data as PersonalTask[]) || []).filter(t => t.status === 'done').length;
        const eq = calculateLifeEquilibrium(cCount, hDone, pDone);

        const { data: edgeData } = await supabase.functions.invoke('life-advisor', {
          body: {
            careerCount: cCount,
            healthCount: hDone,
            personalCount: pDone,
            harmonyIndex: eq.harmonyIndex,
            dominantDomain: eq.dominantDomain,
            neglectedDomain: eq.neglectedDomain
          }
        });
        if (edgeData?.advice) {
          setAdvisorAdvice(edgeData.advice);
        }
      } catch {
        // Fallback gracefully
      }

    } catch (err) {
      console.error('Life map error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  // 1. CAREER METRICS
  let careerHighestRank = 'E';
  let totalCareerExp = 0;
  careerExpLogs.forEach(l => { totalCareerExp += l.exp_awarded; });
  careerStats.forEach(s => {
    const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];
    if (s.rank && ranks.indexOf(s.rank) > ranks.indexOf(careerHighestRank)) {
      careerHighestRank = s.rank;
    }
  });
  const { 
    level: careerLevel, 
    progress: careerProgress 
  } = getCareerLevel(totalCareerExp);
  const careerDoneCount = careerTasks.filter(t => t.status === 'done').length;

  // 2. HEALTH METRICS
  const totalHealthExp = healthExpLogs.reduce((sum, l) => sum + l.exp_awarded, 0);
  const { level: healthLevel, progress: healthProgress } = getHealthLevel(totalHealthExp);
  const healthAttrs = calculateHealthAttributes(healthTasks, healthExpLogs);
  const healthCompleted = healthTasks.filter(t => t.status === 'done');
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentHealth7Day = healthExpLogs.filter(l => new Date(l.awarded_at) >= sevenDaysAgo).length;
  const healthSGate = checkHealthSGate(healthAttrs, healthCompleted, healthStreak, recentHealth7Day);
  const healthRank = getHealthRank(healthAttrs, healthSGate.isSReady);

  // 3. PERSONAL METRICS
  const totalPersonalExp = personalExpLogs.reduce((sum, l) => sum + l.exp_awarded, 0);
  const { level: personalLevel, progress: personalProgress } = getPersonalLevel(totalPersonalExp);
  const personalAttrs = calculatePersonalAttributes(personalTasks, personalExpLogs);
  const personalCompleted = personalTasks.filter(t => t.status === 'done');
  const personalSGate = checkPersonalSGate(personalAttrs, personalCompleted);
  const personalRank = getPersonalRank(personalAttrs, personalSGate.isSReady);

  // 4. EQUILIBRIUM
  const equilibrium: LifeBalanceState = calculateLifeEquilibrium(
    careerDoneCount,
    healthCompleted.length,
    personalCompleted.length
  );

  if (loading) return null;

  return (
    <div className="px-6 md:px-12 py-10 max-w-[1500px] mx-auto w-full flex flex-col gap-10">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-text-primary pb-6 gap-4">
        <div>
          <span className="text-2xs font-mono font-bold uppercase tracking-widest text-accent block mb-1">
            LIFE
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-text-primary leading-none">
            Life Map
          </h1>
          <p className="text-xs font-mono text-text-secondary mt-2">
            Visual progression landscape across Career, Health and Personal.
          </p>
        </div>
      </div>

      {/* 2. UNDERSTATED USER STATUS STRIP */}
      <div className="py-2.5 px-4 bg-bg-secondary border border-border-strong flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-text-secondary">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="font-bold text-text-primary uppercase tracking-wider">YOU</span>
          <span>&bull;</span>
          <span className="uppercase">Three Paths Active</span>
        </div>
        <div className="flex items-center gap-6">
          <span>CAREER <strong className="text-text-primary font-bold">{careerHighestRank}</strong></span>
          <span>HEALTH <strong className="text-success font-bold">{healthRank.rank}</strong></span>
          <span>PERSONAL <strong className="text-text-primary font-bold">{personalRank.rank}</strong></span>
        </div>
      </div>

      {/* 3. VISUAL PROGRESSION LANDSCAPE (3 EXPANSIVE TERRITORIES) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* TERRITORY 1: CAREER */}
        <div 
          onClick={() => navigate('/dashboard')}
          className="bg-bg-secondary border-2 border-text-primary p-8 sm:p-10 shadow-[6px_6px_0_0_var(--color-text-primary)] hover:border-accent hover:shadow-[8px_8px_0_0_var(--color-accent)] transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between border-b border-border-strong pb-3">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-text-primary">
                CAREER
              </span>
              <Terminal size={16} className="text-accent" />
            </div>

            <div>
              <span className="text-9xl font-black font-sans leading-none tracking-tighter text-text-primary block">
                {careerHighestRank}
              </span>
              <div className="mt-3">
                <span className="text-lg font-black font-mono uppercase text-text-primary block">
                  LEVEL {careerLevel}
                </span>
                <span className="text-xs font-mono text-text-secondary">
                  {totalCareerExp.toLocaleString()} XP {careerStreak > 0 ? `• STREAK ${careerStreak}D` : ''}
                </span>
              </div>
            </div>

            <div>
              <div className="h-2.5 bg-border-subtle w-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-accent transition-all duration-700" 
                  style={{ width: `${careerProgress}%` }} 
                />
              </div>
              <div className="text-xs font-mono text-text-secondary uppercase flex justify-between">
                <span>Domain Progress</span>
                <span className="font-bold text-text-primary">{careerProgress}%</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border-subtle text-xs font-mono text-text-secondary">
              <span className="text-text-primary font-bold">{careerDoneCount}</span> Operations Completed
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-border-strong">
            <div className="w-full py-3 px-4 bg-accent text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 group-hover:bg-accent-hover transition-colors">
              <span>ENTER CAREER</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>

        {/* TERRITORY 2: HEALTH */}
        <div 
          onClick={() => navigate('/health')}
          className="bg-bg-secondary border-2 border-text-primary p-8 sm:p-10 shadow-[6px_6px_0_0_var(--color-text-primary)] hover:border-success hover:shadow-[8px_8px_0_0_var(--color-success)] transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between border-b border-border-strong pb-3">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-text-primary">
                HEALTH
              </span>
              <HeartPulse size={16} className="text-success" />
            </div>

            <div>
              <span className="text-9xl font-black font-sans leading-none tracking-tighter text-text-primary block">
                {healthRank.rank}
              </span>
              <div className="mt-3">
                <span className="text-lg font-black font-mono uppercase text-text-primary block">
                  LEVEL {healthLevel} &bull; {healthRank.title}
                </span>
                <span className="text-xs font-mono text-text-secondary">
                  {totalHealthExp.toLocaleString()} XP {healthStreak > 0 ? `• STREAK ${healthStreak}D` : ''}
                </span>
              </div>
            </div>

            <div>
              <div className="h-2.5 bg-border-subtle w-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-success transition-all duration-700" 
                  style={{ width: `${healthProgress}%` }} 
                />
              </div>
              <div className="text-xs font-mono text-text-secondary uppercase flex justify-between">
                <span>Domain Progress</span>
                <span className="font-bold text-text-primary">{healthProgress}%</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border-subtle text-xs font-mono text-text-secondary">
              <span className="text-text-primary font-bold">{healthCompleted.length}</span> Protocols Logged
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-border-strong">
            <div className="w-full py-3 px-4 bg-success text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 group-hover:bg-success/90 transition-colors">
              <span>ENTER HEALTH</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>

        {/* TERRITORY 3: PERSONAL */}
        <div 
          onClick={() => navigate('/personal')}
          className="bg-bg-secondary border-2 border-text-primary p-8 sm:p-10 shadow-[6px_6px_0_0_var(--color-text-primary)] hover:border-text-primary hover:shadow-[8px_8px_0_0_var(--color-text-primary)] transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between border-b border-border-strong pb-3">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-text-primary">
                PERSONAL
              </span>
              <Brain size={16} className="text-text-primary" />
            </div>

            <div>
              <span className="text-9xl font-black font-sans leading-none tracking-tighter text-text-primary block">
                {personalRank.rank}
              </span>
              <div className="mt-3">
                <span className="text-lg font-black font-mono uppercase text-text-primary block">
                  LEVEL {personalLevel} &bull; {personalRank.title}
                </span>
                <span className="text-xs font-mono text-text-secondary">
                  {totalPersonalExp.toLocaleString()} XP {personalStreak > 0 ? `• STREAK ${personalStreak}D` : ''}
                </span>
              </div>
            </div>

            <div>
              <div className="h-2.5 bg-border-subtle w-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-text-primary transition-all duration-700" 
                  style={{ width: `${personalProgress}%` }} 
                />
              </div>
              <div className="text-xs font-mono text-text-secondary uppercase flex justify-between">
                <span>Domain Progress</span>
                <span className="font-bold text-text-primary">{personalProgress}%</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border-subtle text-xs font-mono text-text-secondary">
              <span className="text-text-primary font-bold">{personalCompleted.length}</span> Quests Completed
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-border-strong">
            <div className="w-full py-3 px-4 bg-text-primary text-bg-primary font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 group-hover:bg-text-primary/90 transition-colors">
              <span>ENTER PERSONAL</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>

      </div>

      {/* 4. UNDERSTATED JARVIS TRANSMISSION */}
      <div className="bg-bg-secondary border-2 border-text-primary p-6 shadow-[4px_4px_0_0_var(--color-text-primary)]">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-accent" />
          <span className="text-2xs font-mono font-bold uppercase tracking-widest text-text-primary">
            JARVIS TRANSMISSION
          </span>
        </div>
        <p className="text-xs font-mono text-text-secondary leading-relaxed">
          {advisorAdvice || `All three domains active. Life equilibrium at index ${equilibrium.harmonyIndex}/100. Maintain continuous daily momentum across Career, Health and Personal.`}
        </p>
      </div>

      {/* 5. RECENT PROGRESSION TICKER */}
      {recentActivities.length > 0 && (
        <div className="border border-border-strong bg-bg-secondary p-4 flex flex-col gap-3">
          <div className="text-2xs font-mono font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <CheckCircle2 size={12} className="text-success" />
            <span>Recent Progression</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentActivities.map(item => (
              <div key={item.id} className="border border-border-subtle p-2.5 bg-bg-primary text-xs font-mono flex flex-col gap-1">
                <div className="flex items-center justify-between text-2xs text-text-muted uppercase">
                  <span className={item.domain === 'Health' ? 'text-success font-bold' : item.domain === 'Career' ? 'text-accent font-bold' : 'text-text-primary font-bold'}>
                    {item.domain}
                  </span>
                  <span>+{item.exp} XP</span>
                </div>
                <div className="font-bold text-text-primary truncate">
                  {item.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
