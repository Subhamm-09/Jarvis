interface ActivityGridProps {
  data?: number[]; // 0-4 intensity values for each day
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function ActivityGrid({ data = [0, 0, 0, 0, 0, 0, 0] }: ActivityGridProps) {
  // 0: empty, 1: low (subtle rust orange), 2: medium, 3: high, 4: max (vivid rust orange)
  const intensityColors = [
    '#f0eee6',
    'rgba(194, 89, 52, 0.20)',
    'rgba(194, 89, 52, 0.45)',
    'rgba(194, 89, 52, 0.75)',
    '#c25934',
  ];

  // Determine today's column index in local time (Mon=0, ..., Sun=6)
  const today = new Date();
  const todayDay = today.getDay(); // 0 = Sun
  const todayIndex = todayDay === 0 ? 6 : todayDay - 1;

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-1.5">
        {data.map((intensity, i) => {
          const isToday = i === todayIndex;
          const clamped = Math.min(4, Math.max(0, intensity));
          const bg = intensityColors[clamped] || intensityColors[0];
          const hasMaxGlow = clamped === 4;

          return (
            <div 
              key={i}
              title={`${dayNames[i]}${isToday ? ' (Today)' : ''}: ${intensity > 0 ? (intensity >= 4 ? '4+ quests' : `${intensity} quests`) : 'No activity'}`}
              className={`aspect-square border transition-all ${
                isToday 
                  ? 'border-accent ring-1 ring-accent/50' 
                  : clamped > 0
                    ? 'border-accent/40 hover:border-accent'
                    : 'border-border-subtle hover:border-border-strong'
              }`}
              style={{ 
                background: bg,
                boxShadow: hasMaxGlow ? '0 0 10px rgba(194, 89, 52, 0.35)' : undefined 
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2 px-0.5">
        {dayLetters.map((d, i) => {
          const isToday = i === todayIndex;
          return (
            <div key={i} className="flex flex-col items-center">
              <span className={`text-[11px] font-mono ${isToday ? 'font-bold text-accent' : 'text-text-muted'}`}>
                {d}
              </span>
              {isToday && <span className="w-1 h-1 bg-accent rounded-full mt-0.5" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
