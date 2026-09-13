import { useState, useEffect } from 'react';
import { 
  Trophy, 
  Award, 
  Shield, 
  Sparkles, 
  Check, 
  Lock, 
  Zap, 
  Flame, 
  Crown
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getCareerLevel } from '../lib/ranking';
import { getHealthLevel } from '../lib/healthRanking';
import { getPersonalLevel } from '../lib/personalRanking';

interface RewardTitle {
  id: string;
  name: string;
  category: 'CAREER' | 'HEALTH' | 'PERSONAL' | 'SUPREME';
  description: string;
  requirement: string;
  unlocked: boolean;
  progress: number; // 0 - 100
}

interface RewardBadge {
  id: string;
  name: string;
  iconName: 'trophy' | 'award' | 'flame' | 'shield' | 'zap' | 'crown';
  description: string;
  unlocked: boolean;
  unlockedDate?: string;
}

interface Insignia {
  id: string;
  name: string;
  realm: string;
  description: string;
  unlocked: boolean;
}

export function RewardsPage() {
  const [loading, setLoading] = useState(true);
  const [equippedTitle, setEquippedTitle] = useState<string>(() => {
    return localStorage.getItem('jarvis_equipped_title') || 'THE INITIATE';
  });

  // Telemetry counts for evaluating unlocks
  const [careerStats, setCareerStats] = useState<any[]>([]);
  const [careerTasks, setCareerTasks] = useState<any[]>([]);
  const [healthTasks, setHealthTasks] = useState<any[]>([]);
  const [healthExpLogs, setHealthExpLogs] = useState<any[]>([]);
  const [personalTasks, setPersonalTasks] = useState<any[]>([]);
  const [personalExpLogs, setPersonalExpLogs] = useState<any[]>([]);

  const fetchRewardsTelemetry = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        cStatsRes, cTasksRes,
        hTasksRes, hExpRes,
        pTasksRes, pExpRes
      ] = await Promise.all([
        supabase.from('stats').select('*').eq('user_id', user.id),
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('health_tasks').select('*').eq('user_id', user.id),
        supabase.from('health_exp_log').select('*').eq('user_id', user.id),
        supabase.from('personal_tasks').select('*').eq('user_id', user.id),
        supabase.from('personal_exp_log').select('*').eq('user_id', user.id),
      ]);

      if (cStatsRes.data) setCareerStats(cStatsRes.data);
      if (cTasksRes.data) setCareerTasks(cTasksRes.data);
      if (hTasksRes.data) setHealthTasks(hTasksRes.data);
      if (hExpRes.data) setHealthExpLogs(hExpRes.data);
      if (pTasksRes.data) setPersonalTasks(pTasksRes.data);
      if (pExpRes.data) setPersonalExpLogs(pExpRes.data);
    } catch (err) {
      console.error('Failed to fetch rewards data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewardsTelemetry();
  }, []);

  const handleEquipTitle = (titleName: string) => {
    setEquippedTitle(titleName);
    localStorage.setItem('jarvis_equipped_title', titleName);
  };

  // Evaluation Metrics
  const totalCareerExp = careerStats.reduce((sum, s) => sum + (s.current_exp || 0), 0);
  const careerLevel = getCareerLevel(totalCareerExp).level;
  let highestCareerRank = 'E';
  const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];
  careerStats.forEach(s => {
    if (s.rank && ranks.indexOf(s.rank) > ranks.indexOf(highestCareerRank)) {
      highestCareerRank = s.rank;
    }
  });

  const totalHealthExp = healthExpLogs.reduce((sum, l) => sum + (l.exp_awarded || 0), 0);
  const healthLevel = getHealthLevel(totalHealthExp).level;

  const totalPersonalExp = personalExpLogs.reduce((sum, l) => sum + (l.exp_awarded || 0), 0);
  const personalLevel = getPersonalLevel(totalPersonalExp).level;

  const leetcodeDone = careerTasks.filter(t => t.domain === 'leetcode' && t.status === 'done').length;
  const projectsDone = careerTasks.filter(t => t.domain === 'projects' && t.status === 'done').length;
  const hackathonsEntered = careerTasks.filter(t => t.domain === 'hackathon').length;
  const totalOpsCleared = careerTasks.filter(t => t.status === 'done').length + 
    healthTasks.filter(t => t.status === 'done').length + 
    personalTasks.filter(t => t.status === 'done').length;

  // 1. REWARD TITLES
  const titles: RewardTitle[] = [
    {
      id: 'initiate',
      name: 'THE INITIATE',
      category: 'SUPREME',
      description: 'Accepted the call to systematic self-mastery.',
      requirement: 'Default protagonist status.',
      unlocked: true,
      progress: 100,
    },
    {
      id: 'architect',
      name: 'THE ARCHITECT',
      category: 'CAREER',
      description: 'Designed and shipped complex engineered systems into production.',
      requirement: 'Deploy 2+ Projects & reach Level 5 in Career.',
      unlocked: projectsDone >= 2 && careerLevel >= 5,
      progress: Math.min(100, Math.round(((projectsDone / 2) * 50) + ((careerLevel / 5) * 50))),
    },
    {
      id: 'stier-hunter',
      name: 'S-TIER HUNTER',
      category: 'CAREER',
      description: 'Cleared the Career S-Gate through rigorous algorithmic and system mastery.',
      requirement: 'Attain Rank S in Career.',
      unlocked: highestCareerRank === 'S',
      progress: highestCareerRank === 'S' ? 100 : highestCareerRank === 'A' ? 75 : highestCareerRank === 'B' ? 50 : 25,
    },
    {
      id: 'iron-vanguard',
      name: 'IRON VANGUARD',
      category: 'HEALTH',
      description: 'Forged physiological resilience through relentless physical execution.',
      requirement: 'Reach Level 5 in Health.',
      unlocked: healthLevel >= 5,
      progress: Math.min(100, Math.round((healthLevel / 5) * 100)),
    },
    {
      id: 'polymath-sovereign',
      name: 'POLYMATH SOVEREIGN',
      category: 'PERSONAL',
      description: 'Cultivated deep multidimensional intellect and sovereign willpower.',
      requirement: 'Reach Level 5 in Personal.',
      unlocked: personalLevel >= 5,
      progress: Math.min(100, Math.round((personalLevel / 5) * 100)),
    },
    {
      id: 'algorithmic-adept',
      name: 'ALGORITHMIC ADEPT',
      category: 'CAREER',
      description: 'Deconstructed dynamic programming, graphs, and complex algorithmic patterns.',
      requirement: 'Solve 25+ LeetCode Operations.',
      unlocked: leetcodeDone >= 25,
      progress: Math.min(100, Math.round((leetcodeDone / 25) * 100)),
    },
    {
      id: 'sprint-titan',
      name: 'SPRINT TITAN',
      category: 'CAREER',
      description: 'Built and pitched high-intensity competitive hackathon architectures.',
      requirement: 'Engage in 2+ Hackathon Operations.',
      unlocked: hackathonsEntered >= 2,
      progress: Math.min(100, Math.round((hackathonsEntered / 2) * 100)),
    },
    {
      id: 'tri-realm-ascendant',
      name: 'TRI-REALM ASCENDANT',
      category: 'SUPREME',
      description: 'Mastery across all three territories: Career, Health, and Personal.',
      requirement: 'Attain Level 3+ across all 3 realms simultaneously.',
      unlocked: careerLevel >= 3 && healthLevel >= 3 && personalLevel >= 3,
      progress: Math.min(100, Math.round(((Math.min(3, careerLevel) + Math.min(3, healthLevel) + Math.min(3, personalLevel)) / 9) * 100)),
    },
  ];

  // 2. BADGES
  const badges: RewardBadge[] = [
    {
      id: 'b1',
      name: 'First Blood',
      iconName: 'zap',
      description: 'Executed and verified your initial operation.',
      unlocked: totalOpsCleared >= 1,
    },
    {
      id: 'b2',
      name: 'Century Milestone',
      iconName: 'trophy',
      description: 'Cleared 100 total operations across Career, Health, and Personal realms.',
      unlocked: totalOpsCleared >= 100,
    },
    {
      id: 'b3',
      name: 'Spaced Recall Adept',
      iconName: 'award',
      description: 'Successfully verified algorithmic retention via the Spaced Repetition Protocol.',
      unlocked: careerTasks.some(t => t.metadata?.is_revision === true && t.status === 'done'),
    },
    {
      id: 'b4',
      name: 'Sprint Finisher',
      iconName: 'flame',
      description: 'Completed a full competitive hackathon sprint.',
      unlocked: hackathonsEntered >= 1,
    },
    {
      id: 'b5',
      name: 'S-Gate Trial Contender',
      iconName: 'crown',
      description: 'Achieved Rank A in any realm, unlocking trial eligibility for S-Tier clearance.',
      unlocked: highestCareerRank === 'A' || highestCareerRank === 'S',
    },
    {
      id: 'b6',
      name: 'Sovereign Mind',
      iconName: 'shield',
      description: 'Maintained unbroken consistency across intellectual or physical mastery.',
      unlocked: totalOpsCleared >= 10,
    },
  ];

  // 3. INSIGNIAS
  const insignias: Insignia[] = [
    {
      id: 'ins-1',
      name: 'Hunter Crest',
      realm: 'CAREER REALM',
      description: 'Awarded to operators advancing technical and algorithmic readiness.',
      unlocked: true,
    },
    {
      id: 'ins-2',
      name: 'Vanguard Crest',
      realm: 'HEALTH REALM',
      description: 'Awarded to operators commanding physical stamina and recovery protocols.',
      unlocked: healthTasks.length > 0 || healthLevel > 1,
    },
    {
      id: 'ins-3',
      name: 'Polymath Crest',
      realm: 'PERSONAL REALM',
      description: 'Awarded to operators pursuing deliberate craft, reading, and sovereign fortitude.',
      unlocked: personalTasks.length > 0 || personalLevel > 1,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-3 h-3 bg-accent animate-ping" />
          <span className="text-2xs font-bold uppercase tracking-widest text-text-muted">
            SYNCHRONIZING GLORY ARCHIVES...
          </span>
        </div>
      </div>
    );
  }

  const unlockedCount = titles.filter(t => t.unlocked).length + badges.filter(b => b.unlocked).length;
  const totalCount = titles.length + badges.length;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary px-4 sm:px-8 py-10 max-w-[1400px] mx-auto w-full font-sans">
      
      {/* 1. HERO HEADER */}
      <section className="rpg-panel border border-border-strong p-6 sm:p-8 mb-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-[#E8B958] to-transparent" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 text-2xs font-mono font-bold uppercase tracking-widest text-accent">
              <Trophy size={14} className="text-accent" />
              <span>REWARDS // PROGRESSION UNLOCKS & TITLES</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-text-primary font-display">
              Hall of Glory
            </h1>

            <p className="text-xs sm:text-sm font-serif italic text-text-secondary max-w-2xl leading-relaxed">
              Earned progression unlocks, honorary classifications, and badges verifying real-world human competency.
            </p>
          </div>

          {/* Equipped Title & Unlocked Stats */}
          <div className="w-full lg:w-96 flex flex-col gap-2.5 bg-bg-tertiary/70 border border-border-strong p-5">
            <div className="flex items-center justify-between font-mono">
              <span className="text-3xs uppercase tracking-widest text-text-muted">EQUIPPED PROTAGONIST TITLE</span>
              <Sparkles size={13} className="text-accent" />
            </div>

            <div className="text-lg font-black font-display uppercase tracking-wider text-accent border-b border-border-strong pb-2">
              {equippedTitle}
            </div>

            <div className="flex justify-between items-center text-3xs font-mono text-text-muted uppercase tracking-widest pt-1">
              <span>UNLOCKED ACHIEVEMENTS</span>
              <span className="font-bold text-text-primary text-xs">{unlockedCount} / {totalCount}</span>
            </div>
          </div>

        </div>
      </section>

      {/* 2. PROTAGONIST TITLES */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4 border-b border-border-strong pb-2 font-mono">
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-accent" />
            <span className="label text-text-primary">Honorary Titles // Protagonist Identity</span>
          </div>
          <span className="text-3xs text-accent uppercase font-bold tracking-widest">
            {titles.filter(t => t.unlocked).length} UNLOCKED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {titles.map(title => {
            const isEquipped = equippedTitle === title.name;

            return (
              <div
                key={title.id}
                className={`rpg-panel p-5 flex flex-col justify-between transition-all relative overflow-hidden ${
                  title.unlocked 
                    ? (isEquipped ? 'border-accent shadow-[0_0_20px_rgba(194,89,52,0.15)] bg-bg-secondary' : 'hover:border-accent/70') 
                    : 'opacity-50 grayscale bg-bg-tertiary/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3 font-mono">
                    <span className={`text-3xs uppercase tracking-wider px-1.5 py-0.5 border ${
                      title.category === 'CAREER' ? 'text-accent border-accent/40 bg-accent/10' :
                      title.category === 'HEALTH' ? 'text-success border-success/40 bg-success/10' :
                      title.category === 'PERSONAL' ? 'text-accent border-accent/40 bg-accent/10' :
                      'text-text-primary border-accent/50 bg-accent/15'
                    }`}>
                      {title.category}
                    </span>

                    {title.unlocked ? (
                      <span className="text-3xs font-bold text-success flex items-center gap-1">
                        <Check size={12} /> UNLOCKED
                      </span>
                    ) : (
                      <span className="text-3xs text-text-muted flex items-center gap-1">
                        <Lock size={12} /> LOCKED
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-black font-display uppercase tracking-wide text-text-primary mb-1">
                    {title.name}
                  </h3>

                  <p className="text-xs text-text-secondary font-serif leading-relaxed mb-4">
                    "{title.description}"
                  </p>
                </div>

                <div>
                  <div className="pt-3 border-t border-border-subtle font-mono text-3xs text-text-muted mb-3">
                    <span className="block text-text-secondary font-bold mb-1">CRITERIA:</span>
                    <span>{title.requirement}</span>
                  </div>

                  {title.unlocked ? (
                    <button
                      onClick={() => handleEquipTitle(title.name)}
                      disabled={isEquipped}
                      className={`w-full py-2 px-3 text-2xs font-mono font-bold uppercase tracking-wider transition-all border ${
                        isEquipped 
                          ? 'bg-accent/20 border-accent text-accent cursor-default' 
                          : 'bg-bg-tertiary border-border-strong text-text-secondary hover:text-text-primary hover:border-accent'
                      }`}
                    >
                      {isEquipped ? 'EQUIPPED' : 'EQUIP TITLE'}
                    </button>
                  ) : (
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-bg-primary border border-border-subtle overflow-hidden">
                        <div 
                          className="h-full bg-accent/60" 
                          style={{ width: `${title.progress}%` }} 
                        />
                      </div>
                      <div className="text-right text-3xs font-mono text-text-muted">
                        {title.progress}% COMPLETE
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. PROVEN BADGES & ACHIEVEMENTS */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4 border-b border-border-strong pb-2 font-mono">
          <div className="flex items-center gap-2">
            <Award size={14} className="text-accent" />
            <span className="label text-text-primary">Mastery Badges // Verified Milestones</span>
          </div>
          <span className="text-3xs text-accent uppercase font-bold tracking-widest">
            {badges.filter(b => b.unlocked).length} EARNED
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {badges.map(badge => (
            <div
              key={badge.id}
              className={`rpg-panel p-5 flex items-start gap-4 transition-all ${
                badge.unlocked 
                  ? 'border-border-strong hover:border-accent/70' 
                  : 'opacity-40 grayscale'
              }`}
            >
              <div className={`w-11 h-11 border flex items-center justify-center shrink-0 ${
                badge.unlocked 
                  ? 'bg-accent/10 border-accent text-accent shadow-[0_0_12px_rgba(194,89,52,0.2)]' 
                  : 'bg-bg-tertiary border-border-strong text-text-muted'
              }`}>
                {badge.iconName === 'trophy' && <Trophy size={20} />}
                {badge.iconName === 'award' && <Award size={20} />}
                {badge.iconName === 'flame' && <Flame size={20} />}
                {badge.iconName === 'shield' && <Shield size={20} />}
                {badge.iconName === 'zap' && <Zap size={20} />}
                {badge.iconName === 'crown' && <Crown size={20} />}
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm uppercase tracking-tight text-text-primary">
                    {badge.name}
                  </span>
                  {badge.unlocked && (
                    <span className="w-1.5 h-1.5 bg-success rounded-full" />
                  )}
                </div>
                <p className="text-xs text-text-secondary font-serif leading-relaxed">
                  {badge.description}
                </p>
                <span className="text-3xs font-mono uppercase text-text-muted mt-2">
                  {badge.unlocked ? 'STATUS: VERIFIED' : 'STATUS: LOCKED'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. REALM INSIGNIAS */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4 border-b border-border-strong pb-2 font-mono">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-accent" />
            <span className="label text-text-primary">Realm Insignias // Autonomous Territories</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {insignias.map(ins => (
            <div key={ins.id} className="rpg-panel p-6 border border-border-strong flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 font-mono text-xs">
                  <span className="text-accent font-bold">{ins.realm}</span>
                  <span className="text-3xs text-success font-bold">ACTIVE</span>
                </div>
                <h4 className="text-lg font-black font-display uppercase tracking-wide text-text-primary mb-2">
                  {ins.name}
                </h4>
                <p className="text-xs text-text-secondary font-serif leading-relaxed">
                  {ins.description}
                </p>
              </div>
              <div className="pt-4 mt-6 border-t border-border-subtle font-mono text-3xs text-text-muted flex items-center justify-between">
                <span>AUTHENTICITY</span>
                <span className="text-text-primary font-bold">CRYPTO-VERIFIED</span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
