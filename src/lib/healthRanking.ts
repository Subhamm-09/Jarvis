/**
 * HEALTH DOMAIN RANKING & GAMIFICATION ENGINE (STRICT ISOLATION)
 * 
 * Manages independent Health XP, level scaling, Vanguard Ranks (E -> S),
 * 5-Axis Biometric Attributes (STR, END, VIT, REC, AGI), and S-Tier Iron Gates.
 */

import type { HealthPillar, HealthTask, HealthExpLog } from '../types';

export interface HealthAttributeScores {
  STR: number; // Strength & Resistance (0-100)
  END: number; // Cardiovascular Endurance (0-100)
  VIT: number; // Nutrition & Metabolic Health (0-100)
  REC: number; // Sleep & Neurological Recovery (0-100)
  AGI: number; // Mobility, Flexibility & Posture (0-100)
}

export const HEALTH_PILLARS: { id: HealthPillar; name: string; attribute: keyof HealthAttributeScores; description: string }[] = [
  { id: 'strength', name: 'Strength & Resistance', attribute: 'STR', description: 'Progressive overload, resistance training, calisthenics' },
  { id: 'endurance', name: 'Cardio & Aerobic Engine', attribute: 'END', description: 'Zone-2 cardio, running, HIIT, stamina capacity' },
  { id: 'nutrition', name: 'Metabolic & Nutrition', attribute: 'VIT', description: 'Clean fueling, hydration, macro targets, metabolic health' },
  { id: 'recovery', name: 'Sleep & Circadian Anchor', attribute: 'REC', description: '7.5h+ sleep, circadian rhythm, rest and HRV recovery' },
  { id: 'mobility', name: 'Mobility & Flexibility', attribute: 'AGI', description: 'Joint health, yoga, decompression, posture resilience' },
];

export const HEALTH_TIER_THRESHOLDS = [
  { rank: 'E', minScore: 0, title: 'Initiate' },
  { rank: 'D', minScore: 150, title: 'Conditioned' },
  { rank: 'C', minScore: 350, title: 'Vanguard' },
  { rank: 'B', minScore: 550, title: 'Iron Vanguard' },
  { rank: 'A', minScore: 750, title: 'Apex Vanguard' },
  { rank: 'S', minScore: 900, title: 'Apex Titan (S)' },
];

export function getHealthLevel(totalExp: number): { level: number; currentLevelExp: number; expToNext: number; progress: number } {
  let level = 1;
  let accumulated = 0;
  
  while (true) {
    const requiredForThisLevel = Math.floor(120 * Math.pow(level, 1.45));
    if (totalExp < accumulated + requiredForThisLevel) {
      const currentLevelExp = totalExp - accumulated;
      const progress = Math.min(100, Math.max(0, (currentLevelExp / requiredForThisLevel) * 100));
      return { level, currentLevelExp, expToNext: requiredForThisLevel, progress };
    }
    accumulated += requiredForThisLevel;
    level++;
  }
}

export function getHealthExpOnTask(difficulty: 'easy' | 'medium' | 'hard' | 'boss' = 'medium'): number {
  switch (difficulty) {
    case 'easy': return 15;
    case 'medium': return 35;
    case 'hard': return 75;
    case 'boss': return 150;
    default: return 35;
  }
}

export function calculateHealthAttributes(tasks: HealthTask[], expLogs: HealthExpLog[]): HealthAttributeScores {
  const pillarCounts: Record<HealthPillar, number> = {
    strength: 0,
    endurance: 0,
    nutrition: 0,
    recovery: 0,
    mobility: 0,
  };

  const pillarXp: Record<HealthPillar, number> = {
    strength: 0,
    endurance: 0,
    nutrition: 0,
    recovery: 0,
    mobility: 0,
  };

  tasks.filter(t => t.status === 'done').forEach(t => {
    if (pillarCounts[t.pillar] !== undefined) {
      pillarCounts[t.pillar]++;
    }
  });

  expLogs.forEach(l => {
    if (pillarXp[l.pillar] !== undefined) {
      pillarXp[l.pillar] += l.exp_awarded;
    }
  });

  // Calculate 0-100 attributes based on both volume of protocols and earned XP
  const calcAttr = (count: number, xp: number): number => {
    // 30 tasks or 750 XP reaches 100 on attribute scale
    const countScore = Math.min(50, (count / 30) * 50);
    const xpScore = Math.min(50, (xp / 750) * 50);
    return Math.round(countScore + xpScore);
  };

  return {
    STR: calcAttr(pillarCounts.strength, pillarXp.strength),
    END: calcAttr(pillarCounts.endurance, pillarXp.endurance),
    VIT: calcAttr(pillarCounts.nutrition, pillarXp.nutrition),
    REC: calcAttr(pillarCounts.recovery, pillarXp.recovery),
    AGI: calcAttr(pillarCounts.mobility, pillarXp.mobility),
  };
}

export function calculateCalendarStreak(dateStrings: string[]): number {
  if (!dateStrings || dateStrings.length === 0) return 0;

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
}

export interface HealthSGateStatus {
  isSReady: boolean;
  isSuspended: boolean;
  totalWorkouts: number;
  requiredWorkouts: number;
  allPillarsBalanced: boolean;
  activeStreak: number;
  requiredStreak: number;
  recent7DayCount: number;
  requiredRecentCount: number;
  missingRequirements: string[];
}

export function checkHealthSGate(
  attributes: HealthAttributeScores,
  completedTasks: HealthTask[],
  activeStreak: number,
  recent7DayCount: number = 4
): HealthSGateStatus {
  const totalWorkouts = completedTasks.filter(t => t.pillar === 'strength' || t.pillar === 'endurance').length;
  const requiredWorkouts = 60;
  const requiredStreak = 14;
  const requiredRecentCount = 4;

  const missing: string[] = [];

  // 1. Foundational Workouts Baseline (Permanent)
  if (totalWorkouts < requiredWorkouts) {
    missing.push(`Log ${requiredWorkouts - totalWorkouts} more physical training workouts (${totalWorkouts}/${requiredWorkouts})`);
  }

  // 2. Foundational Biometric Equilibrium (Permanent)
  const lowPillars = Object.entries(attributes).filter(([_, score]) => score < 70);
  if (lowPillars.length > 0) {
    missing.push(`Raise all 5 biometrics to at least 70/100 (Lagging: ${lowPillars.map(([k]) => k).join(', ')})`);
  }

  // 3. Dynamic Active Maintenance Streak (Ephemeral: resets if inactive)
  if (activeStreak < requiredStreak) {
    missing.push(`Maintain unbroken protocol streak for ${requiredStreak - activeStreak} more consecutive days (${activeStreak}/${requiredStreak}D)`);
  }

  // 4. Dynamic Rolling 7-Day Cadence (Ephemeral: requires weekly volume)
  if (recent7DayCount < requiredRecentCount) {
    missing.push(`Execute ${requiredRecentCount - recent7DayCount} more protocols in rolling 7-day window (${recent7DayCount}/${requiredRecentCount})`);
  }

  const foundationalMet = totalWorkouts >= requiredWorkouts && lowPillars.length === 0;
  const dynamicMet = activeStreak >= requiredStreak && recent7DayCount >= requiredRecentCount;
  const isSReady = foundationalMet && dynamicMet;
  const isSuspended = foundationalMet && !dynamicMet;

  return {
    isSReady,
    isSuspended,
    totalWorkouts,
    requiredWorkouts,
    allPillarsBalanced: lowPillars.length === 0,
    activeStreak,
    requiredStreak,
    recent7DayCount,
    requiredRecentCount,
    missingRequirements: missing,
  };
}

export function getHealthRank(attributes: HealthAttributeScores, sGatePassed: boolean): { rank: string; title: string; minScore: number } {
  const avgScore = (attributes.STR + attributes.END + attributes.VIT + attributes.REC + attributes.AGI) / 5;
  const normalized1000 = avgScore * 10; // 0-1000 scale

  let current = HEALTH_TIER_THRESHOLDS[0];
  for (const t of HEALTH_TIER_THRESHOLDS) {
    if (normalized1000 >= t.minScore) {
      if (t.rank === 'S' && !sGatePassed) continue;
      current = t;
    }
  }
  return current;
}
