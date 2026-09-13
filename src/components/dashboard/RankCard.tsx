interface RankCardProps {
  rank: string;
  status: string;
  currentExp: number;
  maxExp: number;
  level?: number;
}

export function RankCard({ rank, status, currentExp, maxExp, level }: RankCardProps) {
  const progress = maxExp > 0 ? Math.min(100, Math.max(0, (currentExp / maxExp) * 100)) : 0;
  const isSRank = rank === 'S';

  return (
    <section className="relative overflow-hidden bg-bg-secondary border border-border-strong p-5 group hover:border-accent/40 transition-colors">
      {/* Corner notch accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-accent" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-border-strong" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-accent" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-border-strong" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-4">
        <span className="text-3xs font-mono font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-accent rounded-xs" />
          <span>CLASSIFICATION</span>
        </span>
        {level !== undefined && (
          <span className="text-3xs font-mono font-black uppercase tracking-widest px-2 py-0.5 bg-accent/10 border border-accent/30 text-accent">
            LVL {level}
          </span>
        )}
      </div>

      {/* Rank Monument */}
      <div className="flex items-baseline justify-between pt-1">
        <div className="flex items-baseline gap-3">
          <span className={`text-6xl font-serif font-light leading-none tracking-tight ${
            isSRank ? 'text-accent drop-shadow-[0_0_12px_rgba(194,89,52,0.35)]' : 'text-text-primary'
          }`}>
            {rank}
          </span>
          <div className="flex flex-col">
            <span className="text-2xs font-mono uppercase tracking-widest text-accent font-bold">
              {isSRank ? 'APEX HUNTER' : 'PROTOCOL OPERATOR'}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary mt-0.5">
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Progress to Next Tier */}
      <div className="mt-5 pt-3 border-t border-border-subtle">
        <div className="flex justify-between text-3xs font-mono uppercase text-text-secondary mb-1.5">
          <span className="tracking-widest">Ascent Progress</span>
          <span className="text-text-primary font-bold">
            {currentExp.toLocaleString()} <span className="text-text-muted">/</span> {maxExp.toLocaleString()} XP
          </span>
        </div>
        <div className="h-1.5 bg-bg-tertiary w-full overflow-hidden border border-border-subtle p-[1px]">
          <div 
            className="h-full bg-accent transition-all duration-700 shadow-[0_0_8px_rgba(194,89,52,0.3)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-3xs font-mono text-text-muted mt-1">
          <span>TIER {rank}</span>
          <span>{Math.round(progress)}% TO NEXT</span>
        </div>
      </div>
    </section>
  );
}
