/**
 * PERSONAL DOMAIN RANKING & GAMIFICATION ENGINE (STRICT ISOLATION)
 * 
 * Manages independent Personal XP, level scaling, Polymath Sovereign Ranks (E -> S),
 * 5-Axis Mind & Mastery Attributes (INT, WIL, CHA, CRT, RES), and S-Tier Polymath Gates.
 */

import type { PersonalPillar, PersonalTask, PersonalExpLog } from '../types';

export interface PersonalAttributeScores {
  INT: number; // Intellect & Deep Reading (0-100)
  WIL: number; // Willpower, Mindfulness & Discipline (0-100)
  CHA: number; // Charisma & Relational Mastery (0-100)
  CRT: number; // Creative Craft & Original Output (0-100)
  RES: number; // Financial Stewardship & Resourcefulness (0-100)
}

export const PERSONAL_PILLARS: { id: PersonalPillar; name: string; attribute: keyof PersonalAttributeScores; description: string }[] = [
  { id: 'intellect', name: 'Intellect & Deep Reading', attribute: 'INT', description: 'Treatise study, technical reading, literature synthesis' },
  { id: 'mindfulness', name: 'Mindfulness & Fortitude', attribute: 'WIL', description: 'Vipassana meditation, stoic reflection, impulse restraint' },
  { id: 'relationships', name: 'Relational Resonance', attribute: 'CHA', description: 'Mentorship, family devotion, deep authentic networking' },
  { id: 'creativity', name: 'Creative Expression & Craft', attribute: 'CRT', description: 'Writing, musical composition, design, novel creative output' },
  { id: 'finance', name: 'Financial Stewardship', attribute: 'RES', description: 'Net worth tracking, frugal budgeting, capital allocation' },
];

export const PERSONAL_TIER_THRESHOLDS = [
  { rank: 'E', minScore: 0, title: 'Seeker' },
  { rank: 'D', minScore: 150, title: 'Practitioner' },
  { rank: 'C', minScore: 350, title: 'Polymath' },
  { rank: 'B', minScore: 550, title: 'Sovereign Mind' },
  { rank: 'A', minScore: 750, title: 'Master Sage' },
  { rank: 'S', minScore: 900, title: 'Polymath Sovereign (S)' },
];

export function getPersonalLevel(totalExp: number): { level: number; currentLevelExp: number; expToNext: number; progress: number } {
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

export function getPersonalExpOnTask(difficulty: 'easy' | 'medium' | 'hard' | 'boss' = 'medium'): number {
  switch (difficulty) {
    case 'easy': return 15;
    case 'medium': return 35;
    case 'hard': return 75;
    case 'boss': return 150;
    default: return 35;
  }
}

export function calculatePersonalAttributes(tasks: PersonalTask[], expLogs: PersonalExpLog[]): PersonalAttributeScores {
  const pillarCounts: Record<PersonalPillar, number> = {
    intellect: 0,
    mindfulness: 0,
    relationships: 0,
    creativity: 0,
    finance: 0,
  };

  const pillarXp: Record<PersonalPillar, number> = {
    intellect: 0,
    mindfulness: 0,
    relationships: 0,
    creativity: 0,
    finance: 0,
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
    const countScore = Math.min(50, (count / 30) * 50);
    const xpScore = Math.min(50, (xp / 750) * 50);
    return Math.round(countScore + xpScore);
  };

  return {
    INT: calcAttr(pillarCounts.intellect, pillarXp.intellect),
    WIL: calcAttr(pillarCounts.mindfulness, pillarXp.mindfulness),
    CHA: calcAttr(pillarCounts.relationships, pillarXp.relationships),
    CRT: calcAttr(pillarCounts.creativity, pillarXp.creativity),
    RES: calcAttr(pillarCounts.finance, pillarXp.finance),
  };
}

export interface PersonalSGateStatus {
  isSReady: boolean;
  totalSynthesizedBooks: number;
  requiredBooks: number;
  meditationHours: number;
  requiredMeditationHours: number;
  missingRequirements: string[];
}

export function checkPersonalSGate(
  attributes: PersonalAttributeScores,
  completedTasks: PersonalTask[]
): PersonalSGateStatus {
  // Count books/treatises completed in intellect
  const booksRead = completedTasks
    .filter(t => t.pillar === 'intellect' && (t.metadata?.pages_read || t.metadata?.book_title))
    .length;
  
  // Total meditation minutes / 60
  const meditationMinutes = completedTasks
    .filter(t => t.pillar === 'mindfulness')
    .reduce((acc, t) => acc + (t.metadata?.meditation_mins || t.effort_estimate_mins || 20), 0);
  
  const meditationHours = Math.round(meditationMinutes / 60);

  const requiredBooks = 15;
  const requiredMeditationHours = 30;

  const missing: string[] = [];
  if (booksRead < requiredBooks) {
    missing.push(`Synthesize ${requiredBooks - booksRead} more deep treatises or books (${booksRead}/${requiredBooks})`);
  }
  if (meditationHours < requiredMeditationHours) {
    missing.push(`Log ${requiredMeditationHours - meditationHours} more hours of mindfulness protocols (${meditationHours}/${requiredMeditationHours}h)`);
  }

  const lowPillars = Object.entries(attributes).filter(([_, score]) => score < 70);
  if (lowPillars.length > 0) {
    missing.push(`Raise all 5 personal attributes to at least 70/100 (Lagging: ${lowPillars.map(([k]) => k).join(', ')})`);
  }

  const isSReady = missing.length === 0;

  return {
    isSReady,
    totalSynthesizedBooks: booksRead,
    requiredBooks,
    meditationHours,
    requiredMeditationHours,
    missingRequirements: missing,
  };
}

export function getPersonalRank(attributes: PersonalAttributeScores, sGatePassed: boolean): { rank: string; title: string; minScore: number } {
  const avgScore = (attributes.INT + attributes.WIL + attributes.CHA + attributes.CRT + attributes.RES) / 5;
  const normalized1000 = avgScore * 10; // 0-1000 scale

  let current = PERSONAL_TIER_THRESHOLDS[0];
  for (const t of PERSONAL_TIER_THRESHOLDS) {
    if (normalized1000 >= t.minScore) {
      if (t.rank === 'S' && !sGatePassed) continue;
      current = t;
    }
  }
  return current;
}
