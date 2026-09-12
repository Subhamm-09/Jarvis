import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../types';
import { MoreVertical, GripVertical, RotateCcw, Zap, Clock, ShieldAlert } from 'lucide-react';
import { resolveTaskAttribute } from '../../lib/tactileFeedback';
import { leetcode as rankingLeetcode, projects as rankingProjects } from '../../lib/ranking';

interface TaskRowProps {
  task: Task;
  reason?: string | null;
  aiScore?: number | null;
  isManualMode?: boolean;
  onClick?: () => void;
  onAddToCollection?: (taskId: string) => void;
}

type QuestRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
type QuestDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'BOSS';

function computeQuestMetadata(task: Task): {
  rarity: QuestRarity;
  difficulty: QuestDifficulty;
  expGained: number;
  attr: { name: string; delta: number };
} {
  const meta = (task.metadata || {}) as Record<string, any>;
  
  // 1. Calculate XP
  let exp = task.effort_estimate_mins || 30;
  if (task.domain === 'leetcode') {
    const diff = (meta.difficulty || 'easy').toLowerCase();
    exp = meta.is_revision ? rankingLeetcode.getExpOnRevision(diff) : rankingLeetcode.getExpOnSolve(diff);
  } else if (task.domain === 'hackathon') {
    if (meta.action === 'entered') exp = 30;
    else if (meta.action === 'result') exp = 150;
    else exp = meta.difficulty === 'hard' ? 50 : meta.difficulty === 'medium' ? 25 : 10;
  } else if (task.domain === 'projects') {
    if (meta.action === 'task') exp = meta.difficulty === 'hard' ? 50 : meta.difficulty === 'medium' ? 25 : 10;
    else exp = rankingProjects.getExpFromRating(meta.rating || 7.0) || 100;
  } else if (task.domain === 'learning') {
    exp = meta.completed ? 100 : Math.min(5, parseFloat(meta.hours) || 1) * 5;
  }

  // 2. Calculate Rarity
  let rarity: QuestRarity = 'COMMON';
  if (task.priority >= 5 || meta.action === 'result' || exp >= 100) {
    rarity = 'LEGENDARY';
  } else if (task.priority === 4 || meta.difficulty === 'hard' || exp >= 50) {
    rarity = 'EPIC';
  } else if (task.priority === 3 || meta.difficulty === 'medium' || exp >= 25) {
    rarity = 'RARE';
  }

  // 3. Calculate Difficulty
  let difficulty: QuestDifficulty = 'MEDIUM';
  if (meta.difficulty) {
    const d = meta.difficulty.toUpperCase();
    if (d === 'HARD') difficulty = task.priority >= 5 ? 'BOSS' : 'HARD';
    else if (d === 'EASY') difficulty = 'EASY';
    else difficulty = 'MEDIUM';
  } else {
    if (task.priority >= 5) difficulty = 'BOSS';
    else if (task.priority === 4) difficulty = 'HARD';
    else if (task.priority <= 2) difficulty = 'EASY';
  }

  // 4. Calculate Attribute
  const attr = resolveTaskAttribute(
    task.domain === 'health' ? 'health' : task.domain === 'personal' ? 'personal' : 'career',
    meta.pillar || meta.category || meta.difficulty || task.domain
  );

  return { rarity, difficulty, expGained: exp, attr };
}

const rarityConfig: Record<QuestRarity, { label: string; class: string }> = {
  COMMON: { label: 'COMMON', class: 'text-text-muted border-border-subtle bg-bg-tertiary/60' },
  RARE: { label: 'RARE', class: 'text-[#5A8FC2] border-[#5A8FC2]/40 bg-[#5A8FC2]/10' },
  EPIC: { label: 'EPIC', class: 'text-accent border-accent/40 bg-accent/10 font-bold' },
  LEGENDARY: { label: 'LEGENDARY', class: 'text-[#E8B958] border-[#E8B958]/60 bg-[#E8B958]/15 shadow-[0_0_10px_rgba(232,185,88,0.2)] font-black' },
};

const difficultyConfig: Record<QuestDifficulty, { label: string; class: string }> = {
  BOSS: { label: 'BOSS', class: 'text-crimson font-black tracking-wider bg-crimson/15 border border-crimson/50 px-1.5 py-0.5' },
  HARD: { label: 'HARD', class: 'text-crimson font-bold' },
  MEDIUM: { label: 'MEDIUM', class: 'text-accent font-medium' },
  EASY: { label: 'EASY', class: 'text-success font-medium' },
};

function getDaysLeft(deadline: string | null): string {
  if (!deadline) return '—';
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'EXPIRED';
  if (days === 0) return 'TODAY';
  if (days === 1) return '1D';
  return `${days}D`;
}

export function TaskRow({ task, reason, aiScore, isManualMode, onClick, onAddToCollection }: TaskRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || 'transform 250ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 50 : 1,
    position: 'relative' as const,
  };

  const { rarity, difficulty, expGained, attr } = computeQuestMetadata(task);
  const daysLeft = getDaysLeft(task.deadline ?? null);
  const isOverdue = daysLeft === 'EXPIRED';
  const isBoss = difficulty === 'BOSS';

  return (
    <div
      ref={setNodeRef}
      className={`data-row group relative grid items-center pl-4 py-3 transition-all ${
        isDragging 
          ? 'shadow-2xl ring-1 ring-accent bg-bg-secondary scale-[1.01] cursor-grabbing z-50' 
          : (isManualMode ? 'cursor-grab hover:bg-bg-tertiary/70' : (onClick ? 'cursor-pointer hover:bg-bg-tertiary/70' : 'hover:bg-bg-tertiary/40'))
      } ${
        isBoss ? 'border-l-2 border-l-crimson bg-crimson/[0.03]' : (rarity === 'LEGENDARY' ? 'border-l-2 border-l-accent' : '')
      }`}
      style={{ ...style, gridTemplateColumns: '1fr 110px 100px 90px 140px' }}
      title={isManualMode ? 'Double-click & drag to slide quest priority' : (onClick ? 'Click to accept/evaluate quest' : undefined)}
      {...(isManualMode ? attributes : {})}
      {...(isManualMode ? listeners : {})}
      onClick={() => {
        if (!isDragging && onClick) onClick();
      }}
    >
      {/* Title & Narrative Rationale */}
      <div className="min-w-0 pr-4 border-r border-border-subtle flex flex-col justify-center">
        <div className="flex items-center gap-2">
          {isManualMode && (
            <GripVertical size={13} className="text-text-muted group-hover:text-accent transition-colors shrink-0" />
          )}
          {isBoss && (
            <ShieldAlert size={14} className="text-crimson shrink-0 animate-pulse" />
          )}
          <div className="text-sm font-semibold tracking-tight text-text-primary truncate">
            {task.title}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {/* Domain & Recall Tag */}
          <span className="text-3xs font-mono uppercase tracking-widest text-text-muted">
            {task.domain}
          </span>

          {task.metadata?.is_revision && (
            <span className="text-3xs font-mono uppercase tracking-wider text-accent border border-accent/40 bg-accent/10 px-1.5 py-0.2 rounded-xs flex items-center gap-1 font-bold">
              <RotateCcw size={9} /> R{task.metadata?.revision_number || 1} Recall
            </span>
          )}

          {/* Attribute Surge Chip */}
          <span className="text-3xs font-mono uppercase tracking-wider text-text-secondary border border-border-strong px-1.5 py-0.2 bg-bg-secondary flex items-center gap-1">
            <Zap size={9} className="text-accent" />
            <span>{attr.name} +{attr.delta}</span>
          </span>

          {isManualMode && (
            <span className="text-3xs text-accent opacity-0 group-hover:opacity-100 transition-opacity uppercase font-mono font-bold tracking-wider">
              • Double-click to slide
            </span>
          )}
        </div>

        {reason && (
          <div className="text-[11px] font-serif italic text-text-secondary pl-2 border-l border-border-strong mt-1 leading-relaxed truncate">
            "{reason}"
          </div>
        )}
      </div>

      {/* Quest Rarity Badge */}
      <div className="text-xs font-mono">
        <span className={`text-3xs uppercase tracking-wider px-2 py-0.5 border ${rarityConfig[rarity].class}`}>
          {rarityConfig[rarity].label}
        </span>
      </div>

      {/* Difficulty Indicator */}
      <div className="text-xs font-mono">
        <span className={`text-2xs uppercase tracking-wider ${difficultyConfig[difficulty].class}`}>
          {difficultyConfig[difficulty].label}
        </span>
      </div>

      {/* Deadline / Expiry */}
      <div className={`text-xs font-mono text-right ${isOverdue ? 'text-crimson font-bold' : 'text-text-secondary'}`}>
        <span className="flex items-center justify-end gap-1">
          <Clock size={11} className={isOverdue ? 'text-crimson' : 'text-text-muted'} />
          {daysLeft}
        </span>
      </div>

      {/* XP Bounty & Action Strip */}
      <div className="text-right flex items-center justify-end gap-3 pr-1">
        {aiScore !== undefined && aiScore !== null && (
          <span className="text-3xs font-mono font-bold text-accent px-1.5 py-0.5 border border-accent/40 bg-accent/10">
            {aiScore}
          </span>
        )}

        {/* Gold XP Bounty */}
        <span className="text-xs font-mono font-black text-accent shrink-0">
          +{expGained} XP
        </span>

        {/* Recall Status / Time */}
        {task.metadata?.is_revision ? (
          <span className="text-3xs font-mono uppercase tracking-wider text-accent border border-accent/50 px-2 py-0.5 bg-accent/10 font-bold shrink-0">
            RECALL
          </span>
        ) : (
          <span className="text-3xs font-mono text-text-muted shrink-0">
            {task.effort_estimate_mins || 30}m
          </span>
        )}

        {/* Context Menu */}
        <div className="relative">
          <button 
            className="text-text-muted hover:text-text-primary p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onAddToCollection) setMenuOpen(!menuOpen);
            }}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
          >
            <MoreVertical size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-bg-secondary border border-border-strong shadow-2xl z-[100] py-1 font-mono">
              {onAddToCollection && (
                <button
                  className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary transition-colors"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onAddToCollection(task.id);
                    setMenuOpen(false);
                  }}
                >
                  Add to Collection
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
