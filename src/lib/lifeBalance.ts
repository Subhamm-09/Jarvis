/**
 * LIFE EQUILIBRIUM & CROSS-DOMAIN TELEMETRY ENGINE
 * 
 * Analyzes relative bandwidth and balance across Career, Health, and Personal.
 * STRICT ISOLATION: Does NOT combine XP, modify domain ranks, or leak progression.
 */

export interface LifeBalanceState {
  careerScore: number;    // 0-100 index of active consistency
  healthScore: number;    // 0-100 index of active consistency
  personalScore: number;  // 0-100 index of active consistency
  harmonyIndex: number;   // 0-100 equilibrium metric
  dominantDomain: 'career' | 'health' | 'personal' | 'balanced';
  neglectedDomain: 'career' | 'health' | 'personal' | 'none';
  diagnosis: string;
}

export function calculateLifeEquilibrium(
  careerTaskCount: number,
  healthTaskCount: number,
  personalTaskCount: number
): LifeBalanceState {
  // Normalize each domain score to 0-100 based on standard weekly active volume
  // Benchmark: 10 tasks/week in career is solid; 7 tasks/week in health; 5 tasks/week in personal
  const cNorm = Math.min(100, Math.round((careerTaskCount / 10) * 100));
  const hNorm = Math.min(100, Math.round((healthTaskCount / 7) * 100));
  const pNorm = Math.min(100, Math.round((personalTaskCount / 5) * 100));

  const avg = (cNorm + hNorm + pNorm) / 3;

  // Standard deviation measures disequilibrium
  const variance = (
    Math.pow(cNorm - avg, 2) + 
    Math.pow(hNorm - avg, 2) + 
    Math.pow(pNorm - avg, 2)
  ) / 3;
  const stdDev = Math.sqrt(variance);

  // High harmony when all 3 are actively maintained with low variance
  // Base harmony is proportional to avg engagement penalized by deviation
  const rawHarmony = Math.max(0, Math.round(avg - (stdDev * 0.75)));
  const harmonyIndex = Math.min(100, rawHarmony);

  // Identify dominant and neglected domains
  let dominant: 'career' | 'health' | 'personal' | 'balanced' = 'balanced';
  let neglected: 'career' | 'health' | 'personal' | 'none' = 'none';

  const scores = [
    { domain: 'career' as const, score: cNorm },
    { domain: 'health' as const, score: hNorm },
    { domain: 'personal' as const, score: pNorm },
  ];

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score - scores[2].score > 35) {
    dominant = scores[0].domain;
    neglected = scores[2].domain;
  }

  let diagnosis = "Tri-Domain Equilibrium is stable. Maintain current operational cadence.";
  if (dominant === 'career' && neglected === 'health') {
    diagnosis = "High Career sprint intensity detected. Health recovery is lagging. Schedule restorative Zone-2 cardio and sleep protocols to prevent cognitive burnout.";
  } else if (dominant === 'career' && neglected === 'personal') {
    diagnosis = "Technical focus is strong, but mental mindfulness and intellectual deep reading are neglected. Reserve a 30-min block for philosophy or creative craft.";
  } else if (dominant === 'health' && neglected === 'career') {
    diagnosis = "Physical biometrics are surging. Channel physical energy into the Career queue to advance engineering clearance ranks.";
  } else if (neglected === 'career') {
    diagnosis = "Career domain is quiet. Initiate priority LeetCode, software project, or hackathon sprints.";
  } else if (harmonyIndex >= 80) {
    diagnosis = "EXCELLENT EQUILIBRIUM: All three pillars of life are advancing harmoniously. Apex operator efficiency.";
  }

  return {
    careerScore: cNorm,
    healthScore: hNorm,
    personalScore: pNorm,
    harmonyIndex,
    dominantDomain: dominant,
    neglectedDomain: neglected,
    diagnosis,
  };
}
