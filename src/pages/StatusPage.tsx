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

        // 4. Fetch domain stats (legacy check) & compute dynamically
        const { data: statsData } = await supabase
          .from('stats')
          .select('*')
          .eq('user_id', user.id);

        if (statsData !== null) {
          const rawScores: Record<string, number> = {
            leetcode: 0,
            hackathon: 0,
            learning: 0,
            projects: 0,
            coursework: 0,
          };
          let allS = true;

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
              tier = getTierFromScoreAndGate(score, leetcode.isSReady(lcMetrics));
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
              tier = getTierFromScoreAndGate(score, hackathon.isSReady(hackMetrics));
            } else if (domain === 'learning') {
              let totalHours = 0;
              let courseCount = 0;
              domainTasks.forEach(t => {
                if (t.metadata?.completed) courseCount++;
                else totalHours += (parseFloat(t.metadata?.hours) || 1);
              });
              metric = totalHours;
              score = learning.getScore(metric);
              tier = getTierFromScoreAndGate(score, learning.isSReady({ totalHours, courseCount }));
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
              tier = getTierFromScoreAndGate(score, projects.isSReady(projMetrics));
            } else if (domain === 'coursework') {
              let maxGpa = 0;
              domainTasks.forEach(t => {
                 const gpa = parseFloat(t.metadata?.gpa) || 0;
                 if (gpa > maxGpa) maxGpa = gpa;
              });
              metric = totalDomainXp;
              score = coursework.getScore(metric);
              tier = getTierFromScoreAndGate(score, coursework.isSReady({ latestGpa: maxGpa }));
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

  return (
    <div className="max-w-[1200px] mx-auto p-12 flex flex-col gap-16 mt-6 w-full">
      
      {/* 1. SUMMARY STRIP */}
      <div className="flex justify-between items-center bg-bg-secondary border-t-4 border-t-text-primary border-b border-b-border-strong px-8 py-8">
        <div className="flex flex-1 flex-col items-start justify-center">
          <span className="text-5xl font-black font-sans text-text-primary tracking-tighter leading-none">{totalXp.toLocaleString()}</span>
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-text-secondary mt-3">Total XP</span>
        </div>
        <div className="w-px h-16 bg-border-strong mx-8" />
        <div className="flex flex-1 flex-col items-start justify-center">
          <span className="text-5xl font-black font-sans text-text-primary tracking-tighter leading-none">{tasksCompleted}</span>
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-text-secondary mt-3">Operations Done</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 items-start">
        {/* 2. OVERALL LEVEL BLOCK (HERO) */}
        <section className="flex flex-col border border-border-strong p-10 bg-bg-secondary relative">
          {/* Streak Indicator */}
          <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1 bg-bg-tertiary border border-border-strong">
            <Flame size={14} className="text-accent" />
            <span className="text-xs font-mono font-bold text-text-primary">{streak} DAY STREAK</span>
          </div>

          <h2 className="label border-b border-border-strong pb-2 mb-8">Clearance Level</h2>
          <div className="text-[10rem] font-black leading-none text-text-primary tracking-tighter font-sans -ml-2 mb-8">
            {overallLevel}
          </div>
          
          <div className="w-full">
            <div className="flex justify-between items-baseline mb-2 text-xs font-mono font-semibold uppercase tracking-wider text-text-secondary">
              <span>Level Progress</span>
              <span className="text-text-primary">{currentLevelExp.toLocaleString()} / {expToNext.toLocaleString()} XP</span>
            </div>
            <div className="h-1.5 bg-border-subtle w-full overflow-hidden">
              <div 
                className="h-full bg-text-primary transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, (currentLevelExp / expToNext) * 100))}%` }}
              />
            </div>
          </div>
        </section>

        {/* 2.5 PLACEMENT READINESS */}
        {placementData && (
          <section className="flex flex-col gap-6">
            <div className={`p-8 border ${placementData.isReady ? 'bg-success-muted border-success' : 'bg-bg-secondary border-border-strong'}`}>
              <div className="label mb-4 uppercase tracking-widest text-text-secondary">Placement Readiness</div>
              <div className="flex items-baseline gap-3 mb-2">
                <div className={`text-7xl font-black tracking-tighter leading-none ${placementData.isReady ? 'text-success' : 'text-text-primary'}`}>
                  {placementData.score}
                </div>
                <div className="text-xl font-mono text-text-secondary font-bold">/ 100</div>
              </div>
              <div className={`text-sm font-bold tracking-widest uppercase ${placementData.isReady ? 'text-success' : 'text-accent'}`}>
                {placementData.isReady ? '✓ PLACEMENT READY (S+)' : (placementData.score >= 75 ? 'Placement Strong' : placementData.score >= 60 ? 'Competitive' : placementData.score >= 40 ? 'Developing' : 'Starting')}
              </div>
              {!placementData.isReady && (
                <div className="mt-4 text-xs font-mono text-text-muted">
                  * Reach 90/100 and achieve S-tier in all 5 career domains to unlock Placement Ready status.
                </div>
              )}
            </div>

            <div className="bg-bg-tertiary border border-border-subtle p-6">
              <h3 className="label mb-4">Domain Targets</h3>
              <div className="flex flex-col gap-4">
                {domainStats.map(stat => (
                  <div key={stat.domain} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-mono font-semibold text-text-primary uppercase">
                      <span>{stat.domain}</span>
                      <span className={stat.rank === 'S' ? 'text-success' : 'text-text-secondary'}>{stat.rank}</span>
                    </div>
                    <div className="h-1 bg-border-strong w-full overflow-hidden">
                       <div 
                         className={`h-full ${stat.rank === 'S' ? 'bg-success' : 'bg-text-primary'}`} 
                         style={{ width: `${Math.min(100, (stat.metric / 1000) * 100)}%` }} 
                       />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* 3. DOMAIN BREAKDOWN */}
      {domainStats.length > 0 && (
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-black uppercase tracking-tight text-text-primary border-b-2 border-text-primary pb-2">
            Active Domain Protocols
          </h2>
          
          <div className="flex flex-col">
            {domainStats.map(stat => (
              <div 
                key={stat.domain} 
                onClick={() => setExpandedDomain(expandedDomain === stat.domain ? null : stat.domain)}
                className="flex flex-col border-b border-border-strong hover:bg-bg-tertiary transition-colors cursor-pointer overflow-hidden"
              >
                
                {/* Compact Row Header */}
                <div className="py-6 px-4 flex flex-col md:flex-row md:items-center gap-6">
                  <div className="w-40 shrink-0">
                    <div className="text-lg font-bold text-text-primary uppercase tracking-wider mb-1">{stat.domain}</div>
                    <div className="text-xs font-mono text-text-secondary font-semibold">Rank {stat.rank}</div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-1 flex flex-col justify-center max-w-xl">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs font-mono text-text-secondary uppercase">{stat.metricName}</span>
                      <span className="font-mono text-xs font-bold text-text-primary">
                        {stat.maxed ? 'MAXED' : `${stat.metric} / ${stat.nextThreshold}`}
                      </span>
                    </div>
                    <div className="h-1 bg-border-subtle w-full overflow-hidden">
                      <div 
                        className="h-full bg-text-primary transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(100, Math.max(0, (stat.metric / stat.nextThreshold) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden flex flex-col bg-bg-secondary ${expandedDomain === stat.domain ? 'max-h-64 opacity-100 border-t border-border-subtle' : 'max-h-0 opacity-0'}`}
                >
                  <div className="p-8 flex flex-wrap items-center justify-between gap-8">
                    <div className="flex gap-16">
                      <div className="flex flex-col">
                        <span className="text-4xl font-black font-sans tracking-tighter text-text-primary leading-none">{stat.tasksCompleted}</span>
                        <span className="text-xs font-mono font-semibold uppercase text-text-secondary mt-2">Tasks Completed</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-4xl font-black font-sans tracking-tighter text-text-primary leading-none">{stat.totalDomainXp.toLocaleString()}</span>
                        <span className="text-xs font-mono font-semibold uppercase text-text-secondary mt-2">Total XP Earned</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end border-l-2 border-text-primary pl-8">
                      <span className="text-[5rem] font-black font-sans tracking-tighter text-text-primary leading-none">{stat.rank}</span>
                      <span className="text-xs font-mono font-semibold uppercase text-text-secondary mt-1">Current Rank</span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </section>
      )}
      
    </div>
  );
}
