/**
 * Tactile Feedback Event System for JARVIS
 * 
 * Provides a standardized event dispatcher for XP gains, attribute surges,
 * and mechanical odometer level promotions across all three domains.
 */

export interface TactilePayload {
  domain: 'career' | 'health' | 'personal';
  questTitle: string;
  expGained: number;
  attributeName: string;
  attributeDelta: number;
  attributeNewValue?: number;
  oldLevel: number;
  newLevel: number;
  currentLevelExp: number;
  expToNext: number;
  rank: string;
  rankTitle?: string;
}

export const TACTILE_EVENT_NAME = 'jarvis-tactile-feedback';

export function triggerTactileFeedback(payload: TactilePayload) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TACTILE_EVENT_NAME, { detail: payload }));
  }
}

/**
 * Maps a task domain / pillar to its corresponding tactile attribute increment
 */
export function resolveTaskAttribute(
  domain: 'career' | 'health' | 'personal',
  pillarOrCategory?: string
): { name: string; delta: number } {
  const key = (pillarOrCategory || '').toLowerCase();

  if (domain === 'personal') {
    switch (key) {
      case 'intellect':
        return { name: 'INTELLECT', delta: 4 };
      case 'mindfulness':
        return { name: 'WILLPOWER', delta: 4 };
      case 'creativity':
        return { name: 'CREATIVITY', delta: 4 };
      case 'relationships':
        return { name: 'CHARISMA', delta: 4 };
      case 'finance':
        return { name: 'RESOURCEFULNESS', delta: 4 };
      default:
        return { name: 'MASTERY', delta: 3 };
    }
  }

  if (domain === 'health') {
    switch (key) {
      case 'strength':
        return { name: 'STRENGTH', delta: 4 };
      case 'endurance':
        return { name: 'CARDIO ENGINE', delta: 4 };
      case 'nutrition':
        return { name: 'METABOLIC VITALITY', delta: 4 };
      case 'recovery':
        return { name: 'RECOVERY ANCHOR', delta: 4 };
      case 'mobility':
        return { name: 'MOBILITY & AGI', delta: 4 };
      default:
        return { name: 'PHYSICAL CAPACITY', delta: 3 };
    }
  }

  // Career domain
  switch (key) {
    case 'leetcode':
      return { name: 'ALGORITHMIC APTITUDE', delta: 5 };
    case 'projects':
      return { name: 'SYSTEM ARCHITECTURE', delta: 8 };
    case 'hackathon':
      return { name: 'EXECUTION VELOCITY', delta: 10 };
    case 'coursework':
      return { name: 'ACADEMIC RIGOR', delta: 4 };
    case 'learning':
      return { name: 'COGNITIVE DISCIPLINE', delta: 3 };
    default:
      return { name: 'OPERATIONAL FOCUS', delta: 2 };
  }
}
