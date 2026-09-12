/**
 * Ranking and EXP Logic Engine
 * 
 * Centralized module for tuning EXP rewards, domain scoring, tier thresholds, and 
 * placement readiness logic.
 */

// ---------------------------------------------------------
// DOMAIN SCORING INTERPOLATION
// ---------------------------------------------------------

function interpolateScore(value: number, thresholds: { count: number, score: number }[]): number {
  if (value <= thresholds[0].count) return thresholds[0].score;
  for (let i = 0; i < thresholds.length - 1; i++) {
    const t1 = thresholds[i];
    const t2 = thresholds[i+1];
    if (value >= t1.count && value <= t2.count) {
      const fraction = (value - t1.count) / (t2.count - t1.count);
      return Math.floor(t1.score + fraction * (t2.score - t1.score));
    }
  }
  return thresholds[thresholds.length - 1].score;
}

export const TIER_SCORE_THRESHOLDS = [
  { rank: 'E', minScore: 0 },
  { rank: 'D', minScore: 100 },
  { rank: 'C', minScore: 250 },
  { rank: 'B', minScore: 450 },
  { rank: 'A', minScore: 650 },
  { rank: 'S', minScore: 800 },
];

export function getTierFromScoreAndGate(score: number, sGatePassed: boolean): string {
  let tier = 'E';
  for (const t of TIER_SCORE_THRESHOLDS) {
    if (score >= t.minScore) {
      if (t.rank === 'S' && !sGatePassed) {
        // Skip S if gate not passed
        continue;
      }
      tier = t.rank;
    }
  }
  return tier;
}

// ---------------------------------------------------------
// 1. LEETCODE
// ---------------------------------------------------------
const LEETCODE_SCORE_MAP = [
  { count: 0, score: 0 },
  { count: 25, score: 100 },
  { count: 75, score: 250 },
  { count: 150, score: 450 },
  { count: 225, score: 650 },
  { count: 300, score: 800 },
  { count: 400, score: 1000 }, // Cap
];

const LEETCODE_MILESTONES = [
  { count: 5, exp: 50 },
  { count: 15, exp: 100 },
  { count: 25, exp: 150 },
  { count: 50, exp: 250 },
  { count: 75, exp: 400 },
  { count: 100, exp: 600 },
  { count: 150, exp: 900 },
  { count: 200, exp: 1300 },
  { count: 300, exp: 2000 },
];

export const leetcode = {
  getExpOnSolve: (difficulty: string = 'easy'): number => {
    switch (difficulty.toLowerCase()) {
      case 'hard': return 60;
      case 'medium': return 35;
      case 'easy': default: return 20;
    }
  },
  getExpOnRevision: (difficulty: string = 'easy'): number => {
    switch (difficulty.toLowerCase()) {
      case 'hard': return 25;
      case 'medium': return 12;
      case 'easy': default: return 8;
    }
  },
  getScore: (totalSolved: number): number => {
    const score = interpolateScore(totalSolved, LEETCODE_SCORE_MAP);
    return Math.min(score, 1000);
  },
  isSReady: (metrics: { totalSolved: number, mediumSolved: number, hardSolved: number }): boolean => {
    return metrics.totalSolved >= 300 && metrics.mediumSolved >= 150 && metrics.hardSolved >= 20;
  },
  calculateMilestoneBonus: (totalSolved: number, awardedMilestones: number[]): { bonusExp: number, newMilestones: number[] } => {
    let bonusExp = 0;
    const newMilestones: number[] = [];
    for (const ms of LEETCODE_MILESTONES) {
      if (totalSolved >= ms.count && !awardedMilestones.includes(ms.count)) {
        bonusExp += ms.exp;
        newMilestones.push(ms.count);
      }
    }
    return { bonusExp, newMilestones };
  }
};

// ---------------------------------------------------------
// 2. HACKATHON
// ---------------------------------------------------------
const HACKATHON_SCORE_MAP = [
  { count: 0, score: 0 },
  { count: 1, score: 100 },
  { count: 2, score: 250 },
  { count: 4, score: 450 },
  { count: 6, score: 650 },
  { count: 8, score: 800 },
  { count: 12, score: 1000 },
];

export const hackathon = {
  EXP_ON_ENTER: 30,
  getExpOnTask: (difficulty: string = 'easy'): number => {
    switch (difficulty.toLowerCase()) {
      case 'hard': return 50;
      case 'medium': return 25;
      case 'easy': default: return 10;
    }
  },
  getResultBonus: (result: string = 'participated'): number => {
    switch (result.toLowerCase()) {
      case 'winner': return 400;
      case 'runner up':
      case 'runner_up':
      case 'finalist': return 150;
      case 'participated': default: return 0;
    }
  },
  getScore: (competitionsEntered: number): number => {
    const score = interpolateScore(competitionsEntered, HACKATHON_SCORE_MAP);
    return Math.min(score, 1000);
  },
  isSReady: (metrics: { competitionsEntered: number, finalistCount: number }): boolean => {
    return metrics.competitionsEntered >= 8 && metrics.finalistCount >= 2;
  }
};

// ---------------------------------------------------------
// 3. LEARNING
// ---------------------------------------------------------
const LEARNING_SCORE_MAP = [
  { count: 0, score: 0 },
  { count: 20, score: 100 },
  { count: 50, score: 250 },
  { count: 100, score: 450 },
  { count: 200, score: 650 },
  { count: 300, score: 800 },
  { count: 400, score: 1000 },
];

export const learning = {
  EXP_COURSE_COMPLETE: 100,
  EXP_PER_HOUR: 5,
  MAX_HOURS_PER_DAY: 5, // Caps at 25 exp/day (5 * 5)
  getExpForHours: (hours: number): number => Math.min(hours, learning.MAX_HOURS_PER_DAY) * learning.EXP_PER_HOUR,
  getScore: (totalHours: number): number => {
    const score = interpolateScore(totalHours, LEARNING_SCORE_MAP);
    return Math.min(score, 1000);
  },
  isSReady: (metrics: { totalHours: number, courseCount: number }): boolean => {
    return metrics.totalHours >= 300 && metrics.courseCount >= 5;
  }
};

// ---------------------------------------------------------
// 4. PROJECTS
// ---------------------------------------------------------
export const projects = {
  getExpOnTask: (difficulty: string = 'easy'): number => {
    switch (difficulty.toLowerCase()) {
      case 'hard': return 50;
      case 'medium': return 25;
      case 'easy': default: return 10;
    }
  },
  // Evaluates AI rating and converts to EXP
  getExpFromRating: (rating: number): number => {
    if (rating < 5.0) return 0;
    if (rating >= 5.0 && rating <= 6.4) return 50;
    if (rating >= 6.5 && rating <= 7.4) return 100;
    if (rating >= 7.5 && rating <= 8.4) return 175;
    if (rating >= 8.5 && rating <= 9.2) return 250;
    if (rating >= 9.3) return 350;
    return 0;
  },
  getScore: (metrics: { qualityScore: number, projectCount: number, deployedCount: number, hasDocs: boolean }): number => {
    // Quality (0-600). qualityScore is 1-10 scale
    const qScore = Math.min(600, (metrics.qualityScore / 10) * 600);
    // Meaningful count (0-200). 1 proj = 50, 4+ = 200
    const cScore = Math.min(200, metrics.projectCount * 50);
    // Deployment (0-100). 1 deployed = 50, 2+ = 100
    const dScore = Math.min(100, metrics.deployedCount * 50);
    // Documentation (0-100)
    const docScore = metrics.hasDocs ? 100 : 0;
    
    return Math.min(1000, Math.floor(qScore + cScore + dScore + docScore));
  },
  isSReady: (metrics: { projectCount: number, substantialCount: number, deployedCount: number, hasDocs: boolean }): boolean => {
    return metrics.projectCount >= 3 && 
           metrics.substantialCount >= 2 && 
           metrics.deployedCount >= 2 && 
           metrics.hasDocs;
  }
};

// ---------------------------------------------------------
// 5. COURSEWORK
// ---------------------------------------------------------
const COURSEWORK_SCORE_MAP = [
  { count: 0, score: 0 },
  { count: 500, score: 100 },
  { count: 1500, score: 250 },
  { count: 3000, score: 450 },
  { count: 5000, score: 650 },
  { count: 10000, score: 800 },
  { count: 15000, score: 1000 },
];

export const coursework = {
  // MUST REMAIN EXACTLY UNTOUCHED
  getExpFromGPA: (gpa: number): number => {
    if (gpa < 9.0) return 0;
    if (gpa >= 9.0 && gpa < 9.3) {
      return Math.round(500 * (gpa - 9.0));
    }
    if (gpa >= 9.3) {
      return Math.round(150 * Math.pow(2, (gpa - 9.3) * 10));
    }
    return 0;
  },
  getScore: (totalExp: number): number => {
    const score = interpolateScore(totalExp, COURSEWORK_SCORE_MAP);
    return Math.min(score, 1000);
  },
  isSReady: (metrics: { latestGpa: number }): boolean => {
    return metrics.latestGpa >= 9.5;
  }
};

// ---------------------------------------------------------
// 6. GENERAL
// ---------------------------------------------------------
export const general = {
  getExp: (): number => 0,
};

// ---------------------------------------------------------
// 7. PLACEMENT READINESS
// ---------------------------------------------------------
export const placement = {
  getPlacementReadinessScore: (scores: Partial<{ leetcode: number, projects: number, learning: number, coursework: number, hackathon: number }> | Record<string, number>): number => {
    const raw = 
      ((scores.leetcode || 0) * 0.30) +
      ((scores.projects || 0) * 0.25) +
      ((scores.learning || 0) * 0.20) +
      ((scores.coursework || 0) * 0.15) +
      ((scores.hackathon || 0) * 0.10);
    
    // Scale is 0-1000 internally. Convert back to 0-100 for display
    return Math.floor(raw / 10);
  },
  isPlacementReady: (readinessScore100: number, domainScores: Record<string, number>, allDomainsS: boolean): boolean => {
    if (!allDomainsS) return false;
    if (readinessScore100 < 90) return false;
    
    // All 5 career domain scores must be >= 800 (80/100)
    const requiredDomains = ['leetcode', 'projects', 'learning', 'coursework', 'hackathon'];
    for (const d of requiredDomains) {
      if ((domainScores[d] || 0) < 800) return false;
    }
    
    return true;
  }
};
