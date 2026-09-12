import { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { 
  TIER_SCORE_THRESHOLDS,
  getTierFromScoreAndGate,
  leetcode,
  hackathon,
  learning,
  projects,
  coursework,
  placement,
  getCareerLevel
} from '../lib/ranking';

export function StatusPage() {
  const [loading, setLoading] = useState(true);
  const [totalXp, setTotalXp] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [overallLevel, setOverallLevel] = useState(1);
  const [expToNext, setExpToNext] = useState(100);
  const [currentLevelExp, setCurrentLevelExp] = useState(0);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  
  const [trialObjectives, setTrialObjectives] = useState<any[]>([]);
  const [domainStats, setDomainStats] = useState<any[]>([]);
  const [placementData, setPlacementData] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // 1. Define base active domains (excluding general)
        const uniqueDomains = ['leetcode', 'hackathon', 'learning', 'projects', 'coursework'];

        // 2. Fetch exp_log for streak and total xp
        const { data: expLogData } = await supabase
          .from('exp_log')
          .select('awarded_at, exp_awarded, domain')
          .eq('user_id', user.id)
          .order('awarded_at', { ascending: false });

        // Fetch completed tasks for counts & metadata
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('domain, metadata')
          .eq('user_id', user.id)
          .eq('status', 'done');

        let calculatedStreak = 0;
        let calculatedTotalXp = 0;

        if (expLogData && expLogData.length > 0) {
          
          const distinctDates = Array.from(new Set(
            expLogData.map(log => {
              calculatedTotalXp += log.exp_awarded;
              const d = new Date(log.awarded_at);
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
          
          if (!distinctDates.includes(todayStr) && distinctDates.includes(yesterdayStr)) {
              checkDate = yesterday;
              checkDateStr = yesterdayStr;
          }

          while (distinctDates.includes(checkDateStr)) {
              calculatedStreak++;
              checkDate.setDate(checkDate.getDate() - 1);
              checkDateStr = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
          }
        }

        setTotalXp(calculatedTotalXp);
        setStreak(calculatedStreak);
        setTasksCompleted(tasksData?.length || 0);

        // 3. Compute Overall Level
        const { level: lvl, currentLevelExp: lvlExp, expToNext: nextThreshold } = getCareerLevel(calculatedTotalXp);
        setOverallLevel(lvl);
        setExpToNext(nextThreshold);
        setCurrentLevelExp(lvlExp);

        // 4. Fetch domain stats & compute dynamically
        if (tasksData || expLogData) {
          const rawScores: Record<string, number> = {
            leetcode: 0,
            hackathon: 0,
            learning: 0,
            projects: 0,
            coursework: 0,
          };
          let allS = true;
          const objectives: any[] = [];

          const mappedStats = uniqueDomains.map(domain => {
            const domainLogs = (expLogData || []).filter(log => log.domain === domain);
            const domainTasks = (tasksData || []).filter(t => t.domain === domain);
            const totalDomainXp = domainLogs.reduce((sum, log) => sum + log.exp_awarded, 0);

            let metric = 0;
            let score = 0;
            let tier = 'E';

            if (domain === 'leetcode') {
              const lcMetrics = {
                totalSolved: domainTasks.filter(t => !t.metadata?.is_revision).length,
                mediumSolved: domainTasks.filter(t => !t.metadata?.is_revision && t.metadata?.difficulty === 'medium').length,
                hardSolved: domainTasks.filter(t => !t.metadata?.is_revision && t.metadata?.difficulty === 'hard').length
              };
              metric = lcMetrics.totalSolved;
              score = leetcode.getScore(metric);
              const isReady = leetcode.isSReady(lcMetrics);
              tier = getTierFromScoreAndGate(score, isReady);

              objectives.push({
                domain: 'LeetCode Crucible',
                requirement: '300+ Solves (150 Medium, 20 Hard)',
                current: `${lcMetrics.totalSolved}/300 Total (${lcMetrics.mediumSolved}/150 Med, ${lcMetrics.hardSolved}/20 Hard)`,
                cleared: isReady,
                pct: Math.min(100, Math.round((lcMetrics.totalSolved / 300) * 100)),
              });
            } else if (domain === 'hackathon') {
              const hackMetrics = {
                competitionsEntered: domainTasks.filter(t => t.metadata?.action === 'entered').length,
                finalistCount: domainTasks.filter(t => {
                  const res = (t.metadata?.result || '').toLowerCase();
                  return res === 'finalist' || res === 'winner' || res === 'runner up' || res === 'runner_up';
                }).length
              };
              metric = hackMetrics.competitionsEntered;
              score = hackathon.getScore(metric);
              const isReady = hackathon.isSReady(hackMetrics);
              tier = getTierFromScoreAndGate(score, isReady);

              objectives.push({
                domain: 'Hackathon Arena',
                requirement: '8+ Competitions & 2+ Podium / Finalist Finishes',
                current: `${hackMetrics.competitionsEntered}/8 Entered, ${hackMetrics.finalistCount}/2 Finalist`,
                cleared: isReady,
                pct: Math.min(100, Math.round(((hackMetrics.competitionsEntered + hackMetrics.finalistCount * 3) / 14) * 100)),
              });
            } else if (domain === 'learning') {
              let totalHours = 0;
              let courseCount = 0;
              domainTasks.forEach(t => {
                if (t.metadata?.completed) courseCount++;
                else totalHours += (parseFloat(t.metadata?.hours) || 1);
              });
              metric = totalHours;
              score = learning.getScore(metric);
              const isReady = learning.isSReady({ totalHours, courseCount });
              tier = getTierFromScoreAndGate(score, isReady);

              objectives.push({
                domain: 'Knowledge Synthesis',
                requirement: '300+ Deep Study Hours & 5+ Completed Syllabi',
                current: `${Math.round(totalHours)}/300 Hours, ${courseCount}/5 Syllabi`,
                cleared: isReady,
                pct: Math.min(100, Math.round((totalHours / 300) * 100)),
              });
            } else if (domain === 'projects') {
              let totalQuality = 0;
              let meaningfulCount = 0;
              let substantialCount = 0;
              let deployedCount = 0;
              let hasDocs = false;
              
              domainTasks.forEach(t => {
                // Only primary project container entries count toward meaningful projects
                if (t.metadata?.action === 'task' && !t.metadata?.is_primary_entry) return;

                const ai = t.metadata?.ai_evaluation;
                if (ai && ai.overall_score > 0) {
                   totalQuality += ai.overall_score;
                   meaningfulCount++;
                   if (ai.technical_depth >= 7 && ai.problem_complexity >= 7) substantialCount++;
                   if (ai.deployment_quality >= 7) deployedCount++;
                   if (ai.documentation >= 7) hasDocs = true;
                } else if (t.metadata?.last_rating_justification) {
                   meaningfulCount++;
                   totalQuality += 5;
                }
              });
              const avgQuality = meaningfulCount > 0 ? totalQuality / meaningfulCount : 0;
              const projMetrics = { qualityScore: avgQuality, projectCount: meaningfulCount, deployedCount, hasDocs, substantialCount };
              metric = meaningfulCount;
              score = projects.getScore(projMetrics);
              const isReady = projects.isSReady(projMetrics);
              tier = getTierFromScoreAndGate(score, isReady);

              objectives.push({
                domain: 'Production Engineering',
                requirement: '2+ Deployed Systems (Quality >= 8.0, Substantial Depth)',
                current: `${deployedCount}/2 Deployed, ${meaningfulCount} Projects, Avg Q: ${avgQuality.toFixed(1)}/10`,
                cleared: isReady,
                pct: Math.min(100, Math.round((deployedCount / 2) * 100)),
              });
            } else if (domain === 'coursework') {
              let maxGpa = 0;
              domainTasks.forEach(t => {
                 const gpa = parseFloat(t.metadata?.gpa) || 0;
                 if (gpa > maxGpa) maxGpa = gpa;
              });
              metric = totalDomainXp;
              score = coursework.getScore(metric);
              const isReady = coursework.isSReady({ latestGpa: maxGpa });
              tier = getTierFromScoreAndGate(score, isReady);

              objectives.push({
                domain: 'Academic Foundation',
                requirement: 'Maintain GPA >= 3.5 & Coursework Protocols',
                current: maxGpa > 0 ? `Current GPA: ${maxGpa.toFixed(2)}` : 'No GPA logged',
                cleared: isReady,
                pct: maxGpa >= 3.5 ? 100 : Math.min(100, Math.round((maxGpa / 3.5) * 100)),
              });
            }

            rawScores[domain] = score;
            if (tier !== 'S') allS = false;

            let nextThreshold = 1000;
            for (let i = 0; i < TIER_SCORE_THRESHOLDS.length; i++) {
               if (score < TIER_SCORE_THRESHOLDS[i].minScore) {
                   nextThreshold = TIER_SCORE_THRESHOLDS[i].minScore;
                   break;
               }
            }
            
            return {
              domain,
              rank: tier,
              metric: score,
              metricName: 'Score',
              nextThreshold: score >= 1000 ? score : nextThreshold,
              maxed: score >= 1000,
              tasksCompleted: domainTasks.length,
              totalDomainXp
            };
          });
          
          const placementScore = placement.getPlacementReadinessScore(rawScores as any);
          const isReady = placement.isPlacementReady(placementScore, rawScores, allS);
          
          setPlacementData({ score: placementScore, isReady });
          setDomainStats(mappedStats);
          setTrialObjectives(objectives);
        }
      } catch (err) {
        console.error("StatusPage Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    const handleUpdate = () => {
      fetchStatus();
    };

    window.addEventListener('exp-awarded', handleUpdate);
    return () => window.removeEventListener('exp-awarded', handleUpdate);
  }, []);

  if (loading) return null;

  const totalClearedObjectives = trialObjectives.filter(o => o.cleared).length;
  const trialProgressPct = trialObjectives.length > 0 
    ? Math.round((totalClearedObjectives / trialObjectives.length) * 100) 
    : 0;

  // Generate ASCII block progress meter
  const totalBlocks = 20;
  const filledBlocks = Math.round((trialProgressPct / 100) * totalBlocks);
  const blockMeter = '█'.repeat(filledBlocks) + '░'.repeat(totalBlocks - filledBlocks);

  return (
    <div className="max-w-[1300px] mx-auto p-6 sm:p-12 flex flex-col gap-12 mt-4 w-full">
      
      {/* 1. ARCHIVES HEADER */}
      <div className="border-b-2 border-border-strong pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-rpg-gold rounded-xs shadow-[0_0_8px_rgba(28,110,140,0.4)]" />
            <span className="text-3xs font-mono font-bold uppercase tracking-widest text-rpg-gold">
              CAREER DOMAIN // CLASSIFICATION ARCHIVES
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black font-cinzel tracking-tight uppercase leading-none text-text-primary">
            S-Tier Trial & Status
          </h1>
          <div className="text-xs font-mono text-text-secondary mt-2">
            HUNTER EXAM TELEMETRY // MONUMENTAL ASCENSION GATES
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-bg-secondary border border-border-strong px-4 py-2 flex items-center gap-2.5">
            <Flame size={16} className="text-rpg-gold" />
            <div className="flex flex-col">
              <span className="text-2xs font-mono font-bold uppercase tracking-wider text-text-primary">
                {streak} DAY CADENCE
              </span>
              <span className="text-3xs font-mono text-text-muted">UNBROKEN STREAK</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUMMARY STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-bg-secondary border border-border-strong p-6 relative overflow-hidden">
        <div className="flex flex-col">
          <span className="text-3xs font-mono font-bold uppercase tracking-widest text-text-secondary mb-1">
            Total Accumulated EXP
          </span>
          <span className="text-4xl sm:text-5xl font-black font-mono text-rpg-gold tracking-tighter leading-none">
            {totalXp.toLocaleString()}
          </span>
          <span className="text-3xs font-mono text-text-muted mt-2">All Career Protocols</span>
        </div>

        <div className="flex flex-col border-t md:border-t-0 md:border-l border-border-subtle pt-4 md:pt-0 md:pl-6">
          <span className="text-3xs font-mono font-bold uppercase tracking-widest text-text-secondary mb-1">
            Quests Completed
          </span>
          <span className="text-4xl sm:text-5xl font-black font-mono text-text-primary tracking-tighter leading-none">
            {tasksCompleted}
          </span>
          <span className="text-3xs font-mono text-text-muted mt-2">Verified Operations</span>
        </div>

        <div className="flex flex-col border-t md:border-t-0 md:border-l border-border-subtle pt-4 md:pt-0 md:pl-6">
          <span className="text-3xs font-mono font-bold uppercase tracking-widest text-text-secondary mb-1">
            Trial Gates Cleared
          </span>
          <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tighter leading-none ${
            totalClearedObjectives === trialObjectives.length && trialObjectives.length > 0
              ? 'text-rpg-gold drop-shadow-[0_0_12px_rgba(28,110,140,0.35)]'
              : 'text-text-primary'
          }`}>
            {totalClearedObjectives} <span className="text-2xl text-text-muted">/ {trialObjectives.length}</span>
          </span>
          <span className="text-3xs font-mono text-text-muted mt-2">S-Tier Gate Criteria</span>
        </div>
      </div>

      {/* 3. HERO GRID: CLEARANCE LEVEL & PLACEMENT READINESS */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
        
        {/* OVERALL LEVEL BLOCK */}
        <section className="bg-bg-secondary border border-border-strong p-8 relative overflow-hidden group hover:border-rpg-gold/40 transition-colors">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-rpg-gold" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-rpg-gold" />

          <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-6">
            <span className="text-3xs font-mono font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-rpg-gold rounded-xs" />
              <span>CLEARANCE RATING</span>
            </span>
            <span className="text-3xs font-mono px-2 py-0.5 bg-rpg-gold/15 text-rpg-gold font-bold border border-rpg-gold/30">
              TIER LEVEL
            </span>
          </div>

          <div className="flex items-baseline gap-6 mb-6">
            <div className="text-8xl sm:text-9xl font-black leading-none text-text-primary tracking-tighter font-cinzel">
              {overallLevel}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-mono uppercase tracking-widest text-rpg-gold font-bold">
                OPERATOR CLEARANCE
              </span>
              <span className="text-xs font-mono text-text-secondary mt-1">
                Level Ascent Threshold
              </span>
            </div>
          </div>
          
          <div className="w-full pt-4 border-t border-border-subtle">
            <div className="flex justify-between items-baseline mb-2 text-3xs font-mono font-bold uppercase tracking-wider text-text-secondary">
              <span>Ascent Progress</span>
              <span className="text-rpg-gold">{currentLevelExp.toLocaleString()} / {expToNext.toLocaleString()} XP</span>
            </div>
            <div className="h-2 bg-bg-primary w-full overflow-hidden border border-border-subtle p-[1px]">
              <div 
                className="h-full bg-gradient-to-r from-rpg-gold/80 to-rpg-gold transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(28,110,140,0.3)]"
                style={{ width: `${Math.min(100, Math.max(0, (currentLevelExp / expToNext) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-3xs font-mono text-text-muted mt-1.5">
              <span>LVL {overallLevel}</span>
              <span>LVL {overallLevel + 1}</span>
            </div>
          </div>
        </section>

        {/* PLACEMENT READINESS HERO */}
        {placementData && (
          <section className="bg-bg-secondary border border-border-strong p-8 relative overflow-hidden flex flex-col justify-between group hover:border-rpg-gold/40 transition-colors">
            <div>
              <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-6">
                <span className="text-3xs font-mono font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-xs ${placementData.isReady ? 'bg-rpg-green shadow-[0_0_6px_rgba(46,125,86,0.4)]' : 'bg-rpg-gold'}`} />
                  <span>PLACEMENT READINESS INDEX</span>
                </span>
                <span className={`text-3xs font-mono font-bold px-2 py-0.5 border ${
                  placementData.isReady 
                    ? 'bg-rpg-green/10 border-rpg-green/40 text-rpg-green' 
                    : 'bg-rpg-gold/10 border-rpg-gold/30 text-rpg-gold'
                }`}>
                  {placementData.isReady ? 'S-TIER QUALIFIED' : 'ASCENSION TRIAL'}
                </span>
              </div>

              <div className="flex items-baseline gap-4 mb-3">
                <div className={`text-7xl sm:text-8xl font-black font-cinzel tracking-tighter leading-none ${
                  placementData.isReady ? 'text-rpg-green drop-shadow-[0_0_12px_rgba(46,125,86,0.35)]' : 'text-text-primary'
                }`}>
                  {placementData.score}
                </div>
                <div className="text-2xl font-mono text-text-muted font-bold">/ 100</div>
              </div>

              <div className={`text-xs font-mono font-bold tracking-widest uppercase mb-4 ${
                placementData.isReady ? 'text-rpg-green' : 'text-rpg-gold'
              }`}>
                {placementData.isReady 
                  ? '✓ PLACEMENT READY (S-TIER APEX HUNTER)' 
                  : (placementData.score >= 75 ? '● COMPETITIVE TIER (A-RANK)' : placementData.score >= 60 ? '● DEVELOPING APPLICANT (B-RANK)' : '● CANDIDATE FOUNDATION (C/D-RANK)')}
              </div>

              {!placementData.isReady && (
                <div className="text-3xs font-mono text-text-secondary leading-relaxed bg-bg-primary/60 p-3 border border-border-subtle">
                  * Reach 90/100 readiness score and achieve S-Tier across all 5 career domains to pass the Monarch Exam.
                </div>
              )}
            </div>

            {/* Quick Domain mini indicators */}
            <div className="grid grid-cols-5 gap-1.5 mt-6 pt-4 border-t border-border-subtle">
              {domainStats.map(d => (
                <div key={d.domain} className="flex flex-col items-center bg-bg-primary/40 p-1.5 border border-border-subtle text-center">
                  <span className="text-3xs font-mono text-text-muted uppercase truncate w-full">{d.domain.slice(0, 4)}</span>
                  <span className={`text-xs font-mono font-black mt-0.5 ${d.rank === 'S' ? 'text-rpg-gold' : 'text-text-primary'}`}>
                    {d.rank}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 4. DRAMATIC S-TIER TRIAL GATES (THE HUNTER EXAM CHECKLIST) */}
      <section className="bg-bg-secondary border-2 border-border-strong p-8 relative overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border-subtle pb-4 mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-rpg-crimson rounded-xs animate-pulse" />
              <span className="text-3xs font-mono font-bold uppercase tracking-widest text-rpg-crimson">
                MONARCH GATE VERIFICATION PROTOCOL
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-cinzel uppercase tracking-tight text-text-primary">
              S-Tier Trial Objectives
            </h2>
          </div>

          <div className="flex flex-col sm:items-end">
            <div className="text-xs font-mono font-bold text-rpg-gold">
              TRIAL PROGRESS: {trialProgressPct}%
            </div>
            <div className="font-mono text-xs tracking-widest text-rpg-gold/80 mt-1 select-none">
              [{blockMeter}]
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trialObjectives.map((obj, i) => (
            <div 
              key={obj.domain}
              className={`p-5 border flex flex-col justify-between transition-all ${
                obj.cleared 
                  ? 'bg-rpg-gold/5 border-rpg-gold/40 hover:border-rpg-gold shadow-[0_0_10px_rgba(28,110,140,0.1)]' 
                  : 'bg-bg-primary/40 border-border-strong hover:border-border-strong'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xs font-mono font-bold uppercase tracking-widest text-text-muted">
                    CRITERION 0{i + 1} // {obj.domain}
                  </span>
                  <span className={`text-3xs font-mono font-bold px-2 py-0.5 rounded-xs border ${
                    obj.cleared 
                      ? 'bg-rpg-gold/20 border-rpg-gold/50 text-rpg-gold' 
                      : 'bg-bg-tertiary border-border-subtle text-text-secondary'
                  }`}>
                    {obj.cleared ? 'GATE CLEARED ✓' : 'IN PROGRESS'}
                  </span>
                </div>

                <div className="text-sm font-bold text-text-primary uppercase tracking-wide mb-1">
                  {obj.requirement}
                </div>

                <div className="text-xs font-mono text-text-secondary">
                  Current: <span className={obj.cleared ? 'text-rpg-gold font-bold' : 'text-text-primary'}>{obj.current}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border-subtle">
                <div className="h-1 bg-bg-primary w-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-700 ${
                      obj.cleared ? 'bg-rpg-gold' : 'bg-text-secondary'
                    }`}
                    style={{ width: `${obj.pct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. ACTIVE DOMAIN BREAKDOWN PROTOCOLS */}
      {domainStats.length > 0 && (
        <section className="flex flex-col gap-6">
          <div className="border-b-2 border-border-strong pb-3 flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black font-cinzel uppercase tracking-tight text-text-primary">
              Domain Protocols Telemetry
            </h2>
            <span className="text-3xs font-mono text-text-muted uppercase tracking-widest">
              CLICK PROTOCOL TO EXPAND DOSSIER
            </span>
          </div>
          
          <div className="flex flex-col gap-3">
            {domainStats.map(stat => {
              const isExpanded = expandedDomain === stat.domain;
              const isS = stat.rank === 'S';

              return (
                <div 
                  key={stat.domain} 
                  onClick={() => setExpandedDomain(isExpanded ? null : stat.domain)}
                  className={`bg-bg-secondary border transition-all cursor-pointer overflow-hidden ${
                    isExpanded 
                      ? 'border-rpg-gold/50 shadow-[0_0_12px_rgba(28,110,140,0.15)]' 
                      : 'border-border-strong hover:border-rpg-gold/30'
                  }`}
                >
                  {/* Row Header */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="w-48 shrink-0 flex items-center gap-4">
                      <div className={`w-10 h-10 border flex items-center justify-center font-cinzel font-black text-xl shrink-0 ${
                        isS 
                          ? 'bg-rpg-gold/15 border-rpg-gold text-rpg-gold shadow-[0_0_8px_rgba(28,110,140,0.25)]' 
                          : 'bg-bg-primary border-border-strong text-text-primary'
                      }`}>
                        {stat.rank}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-text-primary uppercase tracking-wider font-cinzel">
                          {stat.domain}
                        </span>
                        <span className="text-3xs font-mono text-text-secondary uppercase">
                          Tier {stat.rank} Status
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex-1 flex flex-col justify-center max-w-xl">
                      <div className="flex justify-between mb-1.5 text-3xs font-mono uppercase">
                        <span className="text-text-secondary">{stat.metricName} Rating</span>
                        <span className={`font-bold ${isS ? 'text-rpg-gold' : 'text-text-primary'}`}>
                          {stat.maxed ? 'MAXED (1000/1000)' : `${stat.metric} / ${stat.nextThreshold}`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-bg-primary w-full overflow-hidden border border-border-subtle p-[1px]">
                        <div 
                          className={`h-full transition-all duration-1000 ease-out ${
                            isS ? 'bg-gradient-to-r from-rpg-gold/80 to-rpg-gold' : 'bg-text-primary'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, (stat.metric / stat.nextThreshold) * 100))}%` }}
                        />
                      </div>
                    </div>

                    <div className="shrink-0 text-right font-mono text-3xs text-text-muted">
                      <span>{stat.tasksCompleted} Tasks Logged &bull; +{stat.totalDomainXp.toLocaleString()} XP</span>
                    </div>
                  </div>

                  {/* Expanded Dossier Content */}
                  <div 
                    className={`transition-all duration-300 ease-in-out overflow-hidden bg-bg-primary/80 ${
                      isExpanded ? 'max-h-72 opacity-100 border-t border-border-subtle' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="p-6 flex flex-wrap items-center justify-between gap-6">
                      <div className="flex gap-12">
                        <div className="flex flex-col">
                          <span className="text-3xl font-black font-mono text-text-primary leading-none">
                            {stat.tasksCompleted}
                          </span>
                          <span className="text-3xs font-mono font-semibold uppercase text-text-secondary mt-1.5">
                            Operations Completed
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-3xl font-black font-mono text-rpg-gold leading-none">
                            +{stat.totalDomainXp.toLocaleString()}
                          </span>
                          <span className="text-3xs font-mono font-semibold uppercase text-text-secondary mt-1.5">
                            Domain EXP Earned
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-mono font-bold px-3 py-1 border ${
                          isS 
                            ? 'bg-rpg-gold/15 border-rpg-gold/40 text-rpg-gold' 
                            : 'bg-bg-secondary border-border-strong text-text-secondary'
                        }`}>
                          {isS ? 'APEX CLEARANCE (S-TIER)' : `NEXT THRESHOLD: ${stat.nextThreshold} SCORE`}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </section>
      )}
      
    </div>
  );
}
