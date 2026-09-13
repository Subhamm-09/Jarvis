import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Compass, 
  Zap, 
  Swords, 
  Bot,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { playSolenoidClick } from '../lib/mechanicalAudio';
import { supabase } from '../lib/supabaseClient';
import { getCareerLevel, leetcode as rankingLeetcode } from '../lib/ranking';
import { getHealthLevel, calculateHealthAttributes, getHealthRank } from '../lib/healthRanking';
import { getPersonalLevel, calculatePersonalAttributes, getPersonalRank } from '../lib/personalRanking';
import { resolveTaskAttribute } from '../lib/tactileFeedback';
import type { Task, HealthTask, HealthExpLog, PersonalTask, PersonalExpLog } from '../types';

interface ActiveQuestItem {
  id: string;
  domain: 'career' | 'health' | 'personal';
  title: string;
  exp: number;
  attributeText: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'BOSS';
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  durationMins: number;
}

export function LifeMapPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('PROTAGONIST');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Career Telemetry
  const [careerTasks, setCareerTasks] = useState<Task[]>([]);
  const [careerStats, setCareerStats] = useState<any[]>([]);
  const [careerStreak, setCareerStreak] = useState(0);

  // Health Telemetry
  const [healthTasks, setHealthTasks] = useState<HealthTask[]>([]);
  const [healthExpLogs, setHealthExpLogs] = useState<HealthExpLog[]>([]);
  const [healthStreak, setHealthStreak] = useState(0);

  // Personal Telemetry
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [personalExpLogs, setPersonalExpLogs] = useState<PersonalExpLog[]>([]);
  const [, setPersonalStreak] = useState(0);

  // Transmission
  const [advisorAdvice, setAdvisorAdvice] = useState<string | null>(null);

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

      const cachedName = localStorage.getItem('jarvis_display_name');
      const name = cachedName || user.user_metadata?.full_name || user.email?.split('@')[0]?.toUpperCase() || 'PROTAGONIST';
      setUserName(name);

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

      // Generate intelligent contextual transmission based on actual deficits
      const cCount = (cTasksRes.data || []).filter((t: any) => t.status === 'done').length;
      const hCount = ((hTasksRes.data as HealthTask[]) || []).filter(t => t.status === 'done').length;
      const pCount = ((pTasksRes.data as PersonalTask[]) || []).filter(t => t.status === 'done').length;

      if (hCount === 0 || calcStreak(hExpRes.data?.map((l: any) => l.awarded_at) || []) === 0) {
        setAdvisorAdvice("Career progression is actively advancing. Health consistency requires immediate reinforcement. Complete a 30-minute physical recovery quest today.");
      } else if (pCount < cCount / 3) {
        setAdvisorAdvice("High technical momentum detected. Balance cognitive stamina with deliberate reading or strategic synthesis in the Personal realm.");
      } else {
        setAdvisorAdvice("Tri-realm equilibrium is strong. System telemetry indicates optimal conditions to engage S-Tier trial objectives.");
      }

    } catch (err) {
      console.error('LifeMapPage fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const handleUpdate = () => fetchTelemetry();
    window.addEventListener('exp-awarded', handleUpdate);
    window.addEventListener('health-exp-awarded', handleUpdate);
    window.addEventListener('personal-exp-awarded', handleUpdate);
    return () => {
      window.removeEventListener('exp-awarded', handleUpdate);
      window.removeEventListener('health-exp-awarded', handleUpdate);
      window.removeEventListener('personal-exp-awarded', handleUpdate);
    };
  }, []);

  const handleStartEditName = () => {
    playSolenoidClick();
    setNewNameInput(userName);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    playSolenoidClick();
    setIsEditingName(false);
    setNewNameInput('');
  };

  const handleSaveName = async () => {
    const trimmed = newNameInput.trim().toUpperCase();
    if (!trimmed || trimmed === userName) {
      setIsEditingName(false);
      return;
    }
    playSolenoidClick();
    setIsSavingName(true);
    setUserName(trimmed);
    localStorage.setItem('jarvis_display_name', trimmed);

    try {
      await supabase.auth.updateUser({
        data: { full_name: trimmed }
      });
    } catch (err) {
      console.error('Failed to update protagonist name:', err);
    } finally {
      setIsSavingName(false);
      setIsEditingName(false);
    }
  };

  // Time-aware greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING';

  // 1. Career Realm Calculations
  const totalCareerExp = careerStats.reduce((sum, s) => sum + (s.current_exp || 0), 0);
  const careerProg = getCareerLevel(totalCareerExp);
  let careerRank = 'E';
  const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];
  careerStats.forEach(s => {
    if (s.rank && ranks.indexOf(s.rank) > ranks.indexOf(careerRank)) {
      careerRank = s.rank;
    }
  });

  // 2. Health Realm Calculations
  const totalHealthExp = healthExpLogs.reduce((sum, l) => sum + (l.exp_awarded || 0), 0);
  const healthProg = getHealthLevel(totalHealthExp);
  const healthAttrs = calculateHealthAttributes(healthTasks, healthExpLogs);
  const healthRank = getHealthRank(healthAttrs, false).rank;

  // 3. Personal Realm Calculations
  const totalPersonalExp = personalExpLogs.reduce((sum, l) => sum + (l.exp_awarded || 0), 0);
  const personalProg = getPersonalLevel(totalPersonalExp);
  const personalAttrs = calculatePersonalAttributes(personalTasks, personalExpLogs);
  const personalRank = getPersonalRank(personalAttrs, false).rank;

  // Protagonist Level & XP Bar (Driven by Hunter / Primary Mastery)
  const protagonistLevel = Math.max(careerProg.level, healthProg.level, personalProg.level, 1);
  const currentLevelExp = careerProg.currentLevelExp;
  const expToNext = careerProg.expToNext;
  const progressPct = expToNext > 0 ? Math.min(100, Math.round((currentLevelExp / expToNext) * 100)) : 100;

  // Mathematical Attribute Computations (0 - 100)
  const avgHealthScore = (healthAttrs.STR + healthAttrs.END + healthAttrs.VIT + healthAttrs.REC + healthAttrs.AGI) / 5;
  const attributes = [
    { name: 'INTELLECT', value: Math.min(99, Math.max(35, Math.round(40 + (careerProg.level * 2.2) + (personalAttrs.INT * 0.3)))), color: 'bg-accent' },
    { name: 'DISCIPLINE', value: Math.min(99, Math.max(30, Math.round(35 + (careerStreak * 4) + (healthStreak * 3)))), color: 'bg-[#111111]' },
    { name: 'EXECUTION', value: Math.min(99, Math.max(30, Math.round(30 + (careerProg.level * 2.5) + (careerTasks.filter(t => t.status === 'done').length * 0.4)))), color: 'bg-accent' },
    { name: 'HEALTH', value: Math.min(99, Math.max(25, Math.round(20 + (avgHealthScore * 0.8)))), color: 'bg-success' },
    { name: 'CREATIVITY', value: Math.min(99, Math.max(30, Math.round(35 + (personalAttrs.CRT * 0.6) + (careerTasks.filter(t => t.domain === 'projects').length * 6)))), color: 'bg-[#555555]' },
    { name: 'SOCIAL', value: Math.min(99, Math.max(20, Math.round(25 + (personalAttrs.CHA * 0.5) + (careerTasks.filter(t => t.domain === 'hackathon').length * 8)))), color: 'bg-[#111111]' },
  ];

  // Active Cross-Domain Quests Feed
  const activeQuests: ActiveQuestItem[] = [];

  // Career Quest
  const pendingCareer = careerTasks.find(t => t.status !== 'done' && !(t.domain === 'hackathon' && t.metadata?.is_primary_entry));
  if (pendingCareer) {
    let exp = pendingCareer.effort_estimate_mins || 30;
    if (pendingCareer.domain === 'leetcode') {
      const diff = (pendingCareer.metadata?.difficulty || 'easy').toLowerCase();
      exp = pendingCareer.metadata?.is_revision ? rankingLeetcode.getExpOnRevision(diff) : rankingLeetcode.getExpOnSolve(diff);
    }
    const attr = resolveTaskAttribute('career', pendingCareer.domain);
    activeQuests.push({
      id: pendingCareer.id,
      domain: 'career',
      title: pendingCareer.title,
      exp,
      attributeText: `${attr.name} +${attr.delta}`,
      difficulty: pendingCareer.priority >= 5 ? 'BOSS' : pendingCareer.priority === 4 ? 'HARD' : 'MEDIUM',
      rarity: pendingCareer.priority >= 5 ? 'LEGENDARY' : pendingCareer.priority === 4 ? 'EPIC' : 'RARE',
      durationMins: pendingCareer.effort_estimate_mins || 45,
    });
  }

  // Health Quest
  const pendingHealth = healthTasks.find(t => t.status !== 'done');
  if (pendingHealth) {
    activeQuests.push({
      id: pendingHealth.id,
      domain: 'health',
      title: pendingHealth.title,
      exp: (pendingHealth.effort_estimate_mins || 30) * 2,
      attributeText: `${(pendingHealth.pillar || 'HEALTH').toUpperCase()} +4`,
      difficulty: pendingHealth.priority >= 4 ? 'HARD' : 'MEDIUM',
      rarity: pendingHealth.priority >= 4 ? 'EPIC' : 'RARE',
      durationMins: pendingHealth.effort_estimate_mins || 30,
    });
  }

  // Personal Quest
  const pendingPersonal = personalTasks.find(t => t.status !== 'done');
  if (pendingPersonal) {
    activeQuests.push({
      id: pendingPersonal.id,
      domain: 'personal',
      title: pendingPersonal.title,
      exp: (pendingPersonal.effort_estimate_mins || 20) * 2,
      attributeText: `${(pendingPersonal.pillar || 'INTELLECT').toUpperCase()} +3`,
      difficulty: pendingPersonal.priority >= 4 ? 'HARD' : 'EASY',
      rarity: pendingPersonal.priority >= 4 ? 'EPIC' : 'COMMON',
      durationMins: pendingPersonal.effort_estimate_mins || 20,
    });
  }

  const handleEngageQuest = (quest: ActiveQuestItem) => {
    if (quest.domain === 'career') {
      navigate('/dashboard');
    } else if (quest.domain === 'health') {
      navigate('/health');
    } else {
      navigate('/personal');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-3 h-3 bg-accent animate-ping" />
          <span className="text-2xs font-bold uppercase tracking-widest text-text-muted">
            SYNCHRONIZING PROTAGONIST TELEMETRY...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary px-4 sm:px-8 py-10 max-w-[1400px] mx-auto w-full font-sans">
      
      {/* 1. CHARACTER HERO HEADER */}
      <section className="rpg-panel border border-border-strong p-6 sm:p-8 mb-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent/80 to-transparent" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          
          {/* Protagonist Identity & Level */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 text-2xs font-mono font-bold uppercase tracking-widest text-accent">
              <span className="w-2 h-2 bg-accent shadow-[0_0_8px_rgba(194,89,52,0.4)] rotate-45" />
              <span>JARVIS SYSTEM // PROTAGONIST CONSOLE</span>
            </div>

            {isEditingName ? (
              <div className="flex items-center flex-wrap gap-2 animate-in fade-in duration-200">
                <span className="text-3xl sm:text-4xl md:text-5xl font-serif font-light sm:font-normal tracking-tight text-text-primary">
                  {greeting},
                </span>
                <div className="inline-flex items-center gap-1.5 border-b-2 border-accent pb-0.5 bg-bg-secondary/60 px-2 py-0.5 shadow-2xs">
                  <input
                    type="text"
                    value={newNameInput}
                    onChange={(e) => setNewNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelEditName();
                    }}
                    autoFocus
                    maxLength={24}
                    className="bg-transparent font-serif font-normal text-2xl sm:text-3xl md:text-4xl uppercase text-accent focus:outline-none tracking-tight w-auto min-w-[140px] max-w-[280px] sm:max-w-md"
                    placeholder="DESIGNATION"
                    aria-label="Protagonist designation"
                    disabled={isSavingName}
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={isSavingName}
                    className="p-1 text-success hover:bg-success/15 transition-colors cursor-pointer rounded-xs"
                    title="Confirm designation (Enter)"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditName}
                    disabled={isSavingName}
                    className="p-1 text-text-muted hover:text-crimson hover:bg-crimson/15 transition-colors cursor-pointer rounded-xs"
                    title="Cancel (Esc)"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-light sm:font-normal tracking-tight text-text-primary flex items-center flex-wrap gap-x-3 gap-y-1">
                <span>
                  {greeting}, <span className="italic text-accent">{userName}</span>
                </span>
                <button
                  type="button"
                  onClick={handleStartEditName}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-3xs font-mono font-normal uppercase tracking-widest text-text-muted/50 hover:text-accent hover:border-accent/40 border border-transparent hover:bg-accent/5 transition-all cursor-pointer rounded-xs"
                  title="Change protagonist designation"
                  aria-label="Change protagonist designation"
                >
                  <Pencil size={11} className="transition-transform group-hover:scale-110" />
                  <span className="hidden sm:inline">EDIT</span>
                </button>
              </h1>
            )}

            {/* Three Realms Tier Summary Strip */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 font-mono text-xs">
              <span className="text-text-muted text-2xs uppercase tracking-wider">TIER STANDING:</span>
              <span className="px-2 py-0.5 bg-bg-tertiary border border-border-strong text-text-primary font-medium">
                CAREER <span className="text-accent font-bold">{careerRank}</span>
              </span>
              <span className="px-2 py-0.5 bg-bg-tertiary border border-border-strong text-text-primary font-medium">
                HEALTH <span className="text-success font-bold">{healthRank}</span>
              </span>
              <span className="px-2 py-0.5 bg-bg-tertiary border border-border-strong text-text-primary font-medium">
                PERSONAL <span className="text-accent font-bold">{personalRank}</span>
              </span>
            </div>
          </div>

          {/* Character Level & Rust Orange XP Progress Meter */}
          <div className="w-full lg:w-96 flex flex-col gap-2.5 bg-bg-tertiary/70 border border-border-strong p-5">
            <div className="flex items-center justify-between font-mono">
              <div className="flex items-baseline gap-2">
                <span className="text-3xs uppercase tracking-widest text-text-muted">CURRENT</span>
                <span className="text-xl sm:text-2xl font-serif font-normal text-text-primary tracking-wide">Level {protagonistLevel}</span>
              </div>
              <span className="text-xs font-mono font-bold text-accent">
                {currentLevelExp} / {expToNext} XP
              </span>
            </div>

            {/* RPG XP Bar */}
            <div className="w-full h-2.5 bg-bg-primary border border-border-strong relative overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-500 shadow-[0_0_12px_rgba(194,89,52,0.3)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-3xs font-mono text-text-muted uppercase tracking-widest">
              <span>PROGRESS TO NEXT LEVEL</span>
              <span className="font-bold text-text-secondary">{progressPct}%</span>
            </div>
          </div>

        </div>
      </section>

      {/* 2. THE THREE WORLDS (ONE CHARACTER) */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4 border-b border-border-strong pb-2 font-mono">
          <div className="flex items-center gap-2">
            <Compass size={14} className="text-accent" />
            <span className="label text-text-primary">Three Worlds // Independent Progression</span>
          </div>
          <span className="text-3xs text-text-muted uppercase tracking-widest">ZERO XP CONTAMINATION</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* WORLD 01: CAREER */}
          <div 
            onClick={() => navigate('/dashboard')}
            className="rpg-panel p-6 cursor-pointer hover:border-accent group transition-all relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-accent/10 transition-colors" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="label text-accent">WORLD 01 // CAREER</span>
                <span className="text-3xs font-mono font-bold text-accent border border-accent/40 px-2 py-0.5 bg-accent/10">
                  HUNTER
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-1">
                <span className="text-3xl sm:text-4xl font-serif font-light tracking-tight text-text-primary group-hover:text-accent transition-colors">
                  Rank <span className="font-normal">{careerRank}</span>
                </span>
                <span className="font-mono text-sm font-bold text-text-secondary">
                  LVL {careerProg.level}
                </span>
              </div>

              <p className="text-xs font-mono text-text-muted mb-6">
                {careerTasks.filter(t => t.status === 'done').length} Operations Cleared • {totalCareerExp} Total EXP
              </p>
            </div>

            <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-xs font-mono text-accent font-bold">
              <span>ENTER CAREER REALM</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* WORLD 02: HEALTH */}
          <div 
            onClick={() => navigate('/health')}
            className="rpg-panel p-6 cursor-pointer hover:border-success group transition-all relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-success/10 transition-colors" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="label text-success">WORLD 02 // HEALTH</span>
                <span className="text-3xs font-mono font-bold text-success border border-success/40 px-2 py-0.5 bg-success/10">
                  VANGUARD
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-1">
                <span className="text-3xl sm:text-4xl font-serif font-light tracking-tight text-text-primary group-hover:text-success transition-colors">
                  Rank <span className="font-normal">{healthRank}</span>
                </span>
                <span className="font-mono text-sm font-bold text-text-secondary">
                  LVL {healthProg.level}
                </span>
              </div>

              <p className="text-xs font-mono text-text-muted mb-6">
                {healthTasks.filter(t => t.status === 'done').length} Protocols Cleared • {totalHealthExp} Total EXP
              </p>
            </div>

            <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-xs font-mono text-success font-bold">
              <span>ENTER HEALTH REALM</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* WORLD 03: PERSONAL */}
          <div 
            onClick={() => navigate('/personal')}
            className="rpg-panel p-6 cursor-pointer hover:border-accent group transition-all relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-accent/10 transition-colors" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="label text-accent">WORLD 03 // PERSONAL</span>
                <span className="text-3xs font-mono font-bold text-accent border border-accent/40 px-2 py-0.5 bg-accent/10">
                  POLYMATH
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-1">
                <span className="text-3xl sm:text-4xl font-serif font-light tracking-tight text-text-primary group-hover:text-accent transition-colors">
                  Rank <span className="font-normal">{personalRank}</span>
                </span>
                <span className="font-mono text-sm font-bold text-text-secondary">
                  LVL {personalProg.level}
                </span>
              </div>

              <p className="text-xs font-mono text-text-muted mb-6">
                {personalTasks.filter(t => t.status === 'done').length} Quests Cleared • {totalPersonalExp} Total EXP
              </p>
            </div>

            <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-xs font-mono text-accent font-bold">
              <span>ENTER PERSONAL REALM</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

        </div>
      </section>

      {/* 3. SPLIT GRID: CHARACTER ATTRIBUTES & ACTIVE QUESTS */}
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 mb-12">
        
        {/* LEFT COLUMN: CHARACTER ATTRIBUTES */}
        <section className="rpg-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-border-strong font-mono">
              <span className="label text-accent">CHARACTER ATTRIBUTES</span>
              <span className="text-3xs text-text-muted uppercase">6 STAT VECTORS</span>
            </div>

            <div className="space-y-4">
              {attributes.map(attr => (
                <div key={attr.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-text-secondary tracking-wider">{attr.name}</span>
                    <span className="font-medium text-text-primary">{attr.value} <span className="text-3xs text-text-muted font-normal">/ 100</span></span>
                  </div>
                  
                  {/* Visual Meter */}
                  <div className="w-full h-2 bg-bg-tertiary border border-border-strong relative overflow-hidden">
                    <div 
                      className={`h-full ${attr.color} transition-all duration-500`} 
                      style={{ width: `${attr.value}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-border-subtle font-mono text-3xs text-text-muted flex items-center justify-between">
            <span>TOTAL PROFICIENCY SCORE</span>
            <span className="text-accent font-bold font-mono text-xs">
              {Math.round(attributes.reduce((acc, a) => acc + a.value, 0) / attributes.length)} / 100
            </span>
          </div>
        </section>

        {/* RIGHT COLUMN: ACTIVE CROSS-DOMAIN QUESTS */}
        <section className="rpg-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-border-strong font-mono">
              <div className="flex items-center gap-2">
                <Swords size={15} className="text-accent" />
                <span className="label text-text-primary">ACTIVE QUESTS // CROSS-REALM TRIAGE</span>
              </div>
              <span className="text-3xs text-accent uppercase font-bold tracking-wider">
                {activeQuests.length} AVAILABLE
              </span>
            </div>

            {activeQuests.length > 0 ? (
              <div className="space-y-3">
                {activeQuests.map(quest => (
                  <div 
                    key={quest.id}
                    onClick={() => handleEngageQuest(quest)}
                    className="p-4 bg-bg-tertiary/60 border border-border-strong hover:border-accent cursor-pointer group transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-3xs font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 border border-border-strong text-text-muted bg-bg-secondary">
                          {quest.domain}
                        </span>
                        <span className={`text-3xs font-mono uppercase tracking-wider px-1.5 py-0.5 border ${
                          quest.rarity === 'LEGENDARY' ? 'text-text-primary border-accent bg-accent/20 font-bold' :
                          quest.rarity === 'EPIC' ? 'text-accent border-accent/40 bg-accent/15 font-bold' :
                          quest.rarity === 'RARE' ? 'text-accent border-accent/40 bg-accent/10' :
                          'text-text-muted border-border-subtle'
                        }`}>
                          {quest.rarity}
                        </span>
                        <span className="text-3xs font-mono text-crimson font-bold">
                          {quest.difficulty}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                        {quest.title}
                      </div>

                      <div className="flex items-center gap-3 text-2xs font-mono text-text-muted">
                        <span className="flex items-center gap-1 text-accent font-bold">
                          +{quest.exp} XP
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-text-secondary">
                          <Zap size={11} className="text-accent" /> {quest.attributeText}
                        </span>
                        <span>•</span>
                        <span>{quest.durationMins}m</span>
                      </div>
                    </div>

                    <button 
                      type="button"
                      className="btn-secondary text-2xs py-2 px-4 shrink-0 group-hover:border-accent group-hover:text-accent font-mono"
                    >
                      <span>ENGAGE QUEST →</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-12">
                <span className="text-sm font-bold text-text-primary uppercase tracking-wider mb-1">
                  ALL ACTIVE QUESTS RESOLVED
                </span>
                <span className="text-xs text-text-secondary max-w-sm">
                  Initialize new operations in Career, Health, or Personal to populate the tactical quest board.
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between font-mono text-2xs text-text-muted">
            <span>SELECT ANY QUEST TO LAUNCH ITS REALM CONSOLE</span>
            <span className="text-accent font-bold">DISPATCH READY</span>
          </div>
        </section>

      </div>

      {/* 4. JARVIS TRANSMISSION */}
      {advisorAdvice && (
        <section className="rpg-panel border-l-4 border-l-accent p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 border border-accent/40 bg-accent/10 flex items-center justify-center shrink-0 text-accent">
              <Bot size={18} />
            </div>
            <div>
              <div className="text-2xs font-bold uppercase tracking-widest text-accent mb-1">
                JARVIS TRANSMISSION // TACTICAL ADVISORY
              </div>
              <p className="text-xs text-text-secondary font-serif italic text-sm leading-relaxed max-w-3xl">
                "{advisorAdvice}"
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary text-3xs py-1.5 px-3 self-start sm:self-auto shrink-0 font-mono"
          >
            EXECUTE TRIAGE →
          </button>
        </section>
      )}

    </div>
  );
}
