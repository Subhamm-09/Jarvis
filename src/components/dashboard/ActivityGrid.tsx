interface ActivityGridProps {
  data?: number[]; // 0-4 intensity values for each day
}

const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function ActivityGrid({ data = [0, 0, 0, 0, 0, 0, 0] }: ActivityGridProps) {
  // 0: empty, 1: low, 2: medium, 3: high, 4: max (accent)
  const intensityColors = [
    'var(--color-bg-tertiary)',
    '#e2e2e2',
    '#b3b3b3',
    '#808080',
    'var(--color-accent)',
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-1">
        {data.map((intensity, i) => (
          <div 
            key={i}
            className="aspect-square"
            style={{ background: intensityColors[intensity] || intensityColors[0] }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 px-1">
        {days.map((d, i) => (
          <span key={i} className="text-xs font-mono text-text-muted">{d}</span>
        ))}
      </div>
    </div>
  );
}
