export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type Domain = 'leetcode' | 'hackathon' | 'learning' | 'projects' | 'coursework' | 'general';

export interface Task {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  domain: string;
  status: 'todo' | 'in_progress' | 'done';
  deadline: string | null;
  priority: number;
  effort_estimate_mins: number;
  metadata: any;
  manual_rank: number;
  ai_rank: number | null;
  ai_score: number | null;
  ai_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  id: string;
  user_id: string;
  domain: string;
  level: number;
  current_exp: number;
  rank: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: 'manual' | 'smart' | 'ai';
  rules: any;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  metadata: {
    expected_skills?: Record<string, number>;
    roles?: string[];
    [key: string]: any;
  };
  created_at: string;
}

export interface UserTargetCompany {
  id: string;
  user_id: string;
  company_id: string;
  weight: number;
  created_at: string;
  company?: Company; // For joined queries
}

// ---------------------------------------------------------------------------
// ADDITIVE LIFE RPG DOMAIN TYPES (STRICT ISOLATION)
// ---------------------------------------------------------------------------

export type LifePillar = 'career' | 'health' | 'personal';

export type HealthPillar = 'strength' | 'endurance' | 'nutrition' | 'recovery' | 'mobility';

export interface HealthTask {
  id: string;
  user_id: string;
  title: string;
  pillar: HealthPillar;
  status: 'todo' | 'in_progress' | 'done';
  priority: number;
  effort_estimate_mins: number;
  metadata: {
    reps?: number;
    sets?: number;
    weight_kg?: number;
    distance_km?: number;
    calories?: number;
    sleep_hours?: number;
    heart_rate_bpm?: number;
    notes?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface HealthStats {
  id: string;
  user_id: string;
  pillar: HealthPillar;
  level: number;
  current_exp: number;
  rank: string;
  metadata: {
    attribute_score?: number;
    streak?: number;
    milestones?: string[];
    [key: string]: any;
  };
  updated_at: string;
}

export interface HealthExpLog {
  id: string;
  user_id: string;
  task_id: string | null;
  pillar: HealthPillar;
  exp_awarded: number;
  metadata: any;
  awarded_at: string;
}

export type PersonalPillar = 'intellect' | 'mindfulness' | 'creativity' | 'relationships' | 'finance';

export interface PersonalTask {
  id: string;
  user_id: string;
  title: string;
  pillar: PersonalPillar;
  status: 'todo' | 'in_progress' | 'done';
  priority: number;
  effort_estimate_mins: number;
  metadata: {
    book_title?: string;
    pages_read?: number;
    meditation_mins?: number;
    reflection_note?: string;
    amount_saved?: number;
    creative_link?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface PersonalStats {
  id: string;
  user_id: string;
  pillar: PersonalPillar;
  level: number;
  current_exp: number;
  rank: string;
  metadata: {
    attribute_score?: number;
    streak?: number;
    milestones?: string[];
    [key: string]: any;
  };
  updated_at: string;
}

export interface PersonalExpLog {
  id: string;
  user_id: string;
  task_id: string | null;
  pillar: PersonalPillar;
  exp_awarded: number;
  metadata: any;
  awarded_at: string;
}

