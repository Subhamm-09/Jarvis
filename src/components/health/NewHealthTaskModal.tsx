import { useState } from 'react';
import { X, Dumbbell, HeartPulse, Moon, Apple, Activity, Move, Clock, Sparkles } from 'lucide-react';
import type { HealthPillar } from '../../types';
import { getHealthExpOnTask } from '../../lib/healthRanking';

interface NewHealthTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    pillar: HealthPillar;
    priority: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'boss';
    effort_estimate_mins: number;
    metadata: Record<string, any>;
  }) => Promise<void> | void;
}

type ActivityType = 'strength' | 'cardio' | 'sleep' | 'recovery' | 'nutrition' | 'mobility';

interface QuickQuestTemplate {
  label: string;
  activity: ActivityType;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'boss';
  effortMins: number;
  xp: number;
  metadata?: Record<string, any>;
}

const QUICK_QUESTS: QuickQuestTemplate[] = [
  { label: '10 MIN WALK', activity: 'cardio', title: '10 Min Aerobic Walk', difficulty: 'easy', effortMins: 10, xp: 15, metadata: { distance_km: 1.0 } },
  { label: '30 MIN WORKOUT', activity: 'strength', title: '30 Min Resistance Workout', difficulty: 'medium', effortMins: 30, xp: 35, metadata: { sets: 3, reps: 10 } },
  { label: '2L WATER', activity: 'nutrition', title: 'Hydration Target: 2L Water', difficulty: 'easy', effortMins: 5, xp: 15, metadata: { nutrition_goal: '2L water' } },
  { label: '8H SLEEP', activity: 'sleep', title: '8 Hours Deep Sleep', difficulty: 'medium', effortMins: 480, xp: 35, metadata: { sleep_hours: 8 } },
];

const ACTIVITIES: { id: ActivityType; label: string; icon: any; pillar: HealthPillar }[] = [
  { id: 'strength', label: 'STRENGTH', icon: Dumbbell, pillar: 'strength' },
  { id: 'cardio', label: 'CARDIO', icon: HeartPulse, pillar: 'endurance' },
  { id: 'sleep', label: 'SLEEP', icon: Moon, pillar: 'recovery' },
  { id: 'recovery', label: 'RECOVERY', icon: Activity, pillar: 'recovery' },
  { id: 'nutrition', label: 'NUTRITION', icon: Apple, pillar: 'nutrition' },
  { id: 'mobility', label: 'MOBILITY', icon: Move, pillar: 'mobility' },
];

const DIFFICULTIES: { id: 'easy' | 'medium' | 'hard' | 'boss'; label: string; xp: number }[] = [
  { id: 'easy', label: 'EASY', xp: 15 },
  { id: 'medium', label: 'MEDIUM', xp: 35 },
  { id: 'hard', label: 'HARD', xp: 75 },
  { id: 'boss', label: 'BOSS', xp: 150 },
];

export function NewHealthTaskModal({ isOpen, onClose, onSubmit }: NewHealthTaskModalProps) {
  const [activity, setActivity] = useState<ActivityType>('strength');
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'boss'>('medium');
  const [durationMins, setDurationMins] = useState(45);

  // Progressive disclosure fields
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [intensity, setIntensity] = useState('moderate');
  const [targetSleepHours, setTargetSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState('');
  const [nutritionGoal, setNutritionGoal] = useState('');
  const [recoveryActivity, setRecoveryActivity] = useState('');
  const [mobilityFocus, setMobilityFocus] = useState('');

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentActivityConfig = ACTIVITIES.find(a => a.id === activity) || ACTIVITIES[0];
  const xpReward = getHealthExpOnTask(difficulty);

  const applyTemplate = (template: QuickQuestTemplate) => {
    setActivity(template.activity);
    setTitle(template.title);
    setDifficulty(template.difficulty);
    setDurationMins(template.effortMins);

    // Reset conditional fields then apply template specifics
    setSets('');
    setReps('');
    setWeightKg('');
    setDistanceKm('');
    setTargetSleepHours('');
    setNutritionGoal('');
    setRecoveryActivity('');
    setMobilityFocus('');

    if (template.metadata?.sets) setSets(String(template.metadata.sets));
    if (template.metadata?.reps) setReps(String(template.metadata.reps));
    if (template.metadata?.distance_km) setDistanceKm(String(template.metadata.distance_km));
    if (template.metadata?.sleep_hours) setTargetSleepHours(String(template.metadata.sleep_hours));
    if (template.metadata?.nutrition_goal) setNutritionGoal(template.metadata.nutrition_goal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim();
    if (!finalTitle) return;

    setSubmitting(true);
    try {
      const metadata: Record<string, any> = {
        difficulty,
        activity_type: activity,
      };

      // Progressive metadata extraction
      if (activity === 'strength') {
        if (sets) metadata.sets = parseInt(sets, 10);
        if (reps) metadata.reps = parseInt(reps, 10);
        if (weightKg) metadata.weight_kg = parseFloat(weightKg);
      } else if (activity === 'cardio') {
        if (distanceKm) metadata.distance_km = parseFloat(distanceKm);
        if (intensity) metadata.intensity = intensity;
      } else if (activity === 'sleep') {
        if (targetSleepHours) metadata.sleep_hours = parseFloat(targetSleepHours);
        if (sleepQuality) metadata.sleep_quality = sleepQuality.trim();
      } else if (activity === 'nutrition') {
        if (nutritionGoal) metadata.nutrition_goal = nutritionGoal.trim();
      } else if (activity === 'recovery') {
        if (recoveryActivity) metadata.recovery_activity = recoveryActivity.trim();
      } else if (activity === 'mobility') {
        if (mobilityFocus) metadata.mobility_focus = mobilityFocus.trim();
      }

      await onSubmit({
        title: finalTitle,
        pillar: currentActivityConfig.pillar,
        priority: difficulty === 'boss' ? 5 : difficulty === 'hard' ? 4 : difficulty === 'medium' ? 3 : 2,
        difficulty,
        effort_estimate_mins: durationMins,
        metadata,
      });

      setTitle('');
      setSets('');
      setReps('');
      setWeightKg('');
      setDistanceKm('');
      setTargetSleepHours('');
      setNutritionGoal('');
      setRecoveryActivity('');
      setMobilityFocus('');

      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[150] bg-text-primary/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-primary border-2 border-text-primary w-full max-w-2xl shadow-[8px_8px_0_0_var(--color-text-primary)] max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b-2 border-text-primary flex items-center justify-between bg-bg-secondary">
          <div>
            <div className="text-xl font-black text-text-primary uppercase tracking-tight">
              NEW HEALTH QUEST
            </div>
            <div className="text-xs font-mono text-text-secondary mt-0.5">
              Define today's health objective.
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors border border-transparent hover:border-text-primary cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-5">
          
          {/* Quick Quests Template Row */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={12} className="text-accent" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                Quick Quests
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTS.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="py-1.5 px-3 bg-bg-secondary hover:bg-bg-tertiary border border-border-strong hover:border-text-primary text-2xs font-mono font-bold text-text-secondary hover:text-text-primary transition-all flex items-center gap-2 group cursor-pointer shadow-xs"
                >
                  <span className="whitespace-nowrap">{tpl.label}</span>
                  <span className="text-[10px] font-mono text-accent font-bold group-hover:text-accent-hover">
                    +{tpl.xp} XP
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 1. Activity Type Selector */}
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted block mb-2">
              Activity Pillar
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ACTIVITIES.map((act) => {
                const Icon = act.icon;
                const active = activity === act.id;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => {
                      setActivity(act.id);
                      if (!title || QUICK_QUESTS.some(q => q.title === title)) {
                        if (act.id === 'strength') setTitle('45 min strength workout');
                        else if (act.id === 'cardio') setTitle('30 min cardio workout');
                        else if (act.id === 'sleep') setTitle('8 hours sleep target');
                        else if (act.id === 'recovery') setTitle('Active recovery & stretch');
                        else if (act.id === 'nutrition') setTitle('Clean nutrition goal');
                        else if (act.id === 'mobility') setTitle('20 min mobility flow');
                      }
                    }}
                    className={`py-2.5 px-1.5 border font-mono font-bold uppercase tracking-tight transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center ${
                      active
                        ? 'border-text-primary bg-text-primary text-bg-primary shadow-sm'
                        : 'border-border-strong bg-bg-secondary text-text-secondary hover:text-text-primary hover:border-text-primary'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-accent' : 'text-text-muted'} />
                    <span className="text-[10px] leading-tight font-mono tracking-tight block w-full truncate">
                      {act.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Quest Title */}
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted block mb-1.5">
              Quest Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 45 min strength workout"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-bg-secondary border-2 border-text-primary px-3.5 py-2.5 text-sm font-sans font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted"
            />
          </div>

          {/* 3. Difficulty */}
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2">
              Difficulty & Base XP
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIFFICULTIES.map((d) => {
                const active = difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id)}
                    className={`py-2.5 px-2 text-center border font-mono transition-all cursor-pointer ${
                      active
                        ? 'bg-text-primary text-bg-primary border-text-primary shadow-sm'
                        : 'bg-bg-secondary text-text-secondary border-border-strong hover:border-text-primary'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider">{d.label}</div>
                    <div className="text-[11px] font-bold mt-0.5 text-accent">
                      +{d.xp} XP
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prominent XP Reward Readout */}
          <div className="py-2.5 px-4 bg-bg-secondary border border-border-strong flex items-center justify-between">
            <span className="text-2xs font-mono font-bold uppercase tracking-wider text-text-muted">
              Estimated Reward
            </span>
            <span className="text-sm font-mono font-black tracking-wider text-accent">
              +{xpReward} HEALTH XP
            </span>
          </div>

          {/* 4. Duration */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-text-muted" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                Estimated Duration
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMins(mins)}
                  className={`px-3 py-1.5 text-2xs font-mono font-bold border transition-colors cursor-pointer ${
                    durationMins === mins
                      ? 'bg-text-primary text-bg-primary border-text-primary'
                      : 'bg-bg-secondary text-text-secondary border-border-subtle hover:border-text-primary'
                  }`}
                >
                  {mins}M
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={durationMins}
                  onChange={(e) => setDurationMins(parseInt(e.target.value, 10) || 15)}
                  className="w-16 text-center bg-bg-secondary border border-text-primary py-1 text-xs font-mono font-bold text-text-primary focus:outline-none"
                />
                <span className="text-2xs font-mono font-bold text-text-muted">MIN</span>
              </div>
            </div>
          </div>

          {/* 5. Progressive Disclosure: Conditional Category Fields */}
          {activity === 'strength' && (
            <div className="p-3.5 bg-bg-secondary border border-border-strong flex flex-col gap-2.5 transition-all">
              <span className="text-2xs font-mono font-bold uppercase text-text-muted tracking-wider">
                Strength Parameters (Optional)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">Sets</label>
                  <input
                    type="number"
                    placeholder="e.g. 4"
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">Reps</label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">Weight (KG)</label>
                  <input
                    type="number"
                    placeholder="e.g. 60"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {activity === 'cardio' && (
            <div className="p-3.5 bg-bg-secondary border border-border-strong flex flex-col gap-2.5 transition-all">
              <span className="text-2xs font-mono font-bold uppercase text-text-muted tracking-wider">
                Cardio Parameters (Optional)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">Distance (KM)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 5.0"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">Intensity</label>
                  <select
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
                  >
                    <option value="zone-2">Zone-2 Aerobic</option>
                    <option value="moderate">Moderate Pacing</option>
                    <option value="hiit">High Intensity (HIIT)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activity === 'sleep' && (
            <div className="p-3.5 bg-bg-secondary border border-border-strong flex flex-col gap-2.5 transition-all">
              <span className="text-2xs font-mono font-bold uppercase text-text-muted tracking-wider">
                Sleep Parameters (Optional)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">Target Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 8.0"
                    value={targetSleepHours}
                    onChange={(e) => setTargetSleepHours(e.target.value)}
                    className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">Protocol Note</label>
                  <input
                    type="text"
                    placeholder="e.g. No screens 1h before"
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(e.target.value)}
                    className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {activity === 'nutrition' && (
            <div className="p-3.5 bg-bg-secondary border border-border-strong flex flex-col gap-2.5 transition-all">
              <span className="text-2xs font-mono font-bold uppercase text-text-muted tracking-wider">
                Nutrition Focus (Optional)
              </span>
              <input
                type="text"
                placeholder="e.g. 140g Protein target, 2L Water, 16/8 Fasting"
                value={nutritionGoal}
                onChange={(e) => setNutritionGoal(e.target.value)}
                className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
              />
            </div>
          )}

          {activity === 'recovery' && (
            <div className="p-3.5 bg-bg-secondary border border-border-strong flex flex-col gap-2.5 transition-all">
              <span className="text-2xs font-mono font-bold uppercase text-text-muted tracking-wider">
                Recovery Protocol (Optional)
              </span>
              <input
                type="text"
                placeholder="e.g. 20 min Sauna, Cold plunge, Foam rolling"
                value={recoveryActivity}
                onChange={(e) => setRecoveryActivity(e.target.value)}
                className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
              />
            </div>
          )}

          {activity === 'mobility' && (
            <div className="p-3.5 bg-bg-secondary border border-border-strong flex flex-col gap-2.5 transition-all">
              <span className="text-2xs font-mono font-bold uppercase text-text-muted tracking-wider">
                Mobility Area Focus (Optional)
              </span>
              <input
                type="text"
                placeholder="e.g. Hip openers, thoracic mobility, ankles"
                value={mobilityFocus}
                onChange={(e) => setMobilityFocus(e.target.value)}
                className="w-full bg-bg-primary border border-border-strong px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t-2 border-text-primary flex items-center justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors border border-transparent hover:border-border-strong cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="btn-primary py-2.5 px-6 text-xs font-mono font-bold uppercase tracking-wider !bg-accent hover:!bg-accent-hover text-white border-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {submitting ? 'Initializing...' : 'Initialize Quest'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
