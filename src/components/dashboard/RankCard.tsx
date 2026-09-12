interface RankCardProps {
  rank: string;
  status: string;
  currentExp: number;
  maxExp: number;
  level?: number;
}

export function RankCard({ rank, status, currentExp, maxExp, level }: RankCardProps) {
  const progress = maxExp > 0 ? Math.min(100, Math.max(0, (currentExp / maxExp) * 100)) : 0;

  return (
    <section>
      <h2 className="label mb-4 border-b border-border-strong pb-2">Clearance Level</h2>
      <div className="flex items-baseline gap-4 pt-2">
        <span className="text-7xl font-black font-sans leading-none tracking-tighter text-text-primary">{rank}</span>
        <div className="flex flex-col">
          {level !== undefined && (
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-text-primary">
              LVL {level}
            </span>
          )}
          <span className="text-sm font-bold uppercase tracking-widest text-text-secondary">{status}</span>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex justify-between text-xs font-mono uppercase text-text-secondary mb-2">
          <span>Progress</span>
          <span className="text-text-primary font-bold">{currentExp.toLocaleString()} / {maxExp.toLocaleString()} XP</span>
        </div>
        <div className="h-1 bg-border-subtle w-full overflow-hidden">
          <div 
            className="h-full bg-text-primary transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}

