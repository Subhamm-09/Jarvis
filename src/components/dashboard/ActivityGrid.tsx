interface ActivityGridProps {
  data?: number[]; // 0-4 intensity values for each day
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function ActivityGrid({ data = [0, 0, 0, 0, 0, 0, 0] }: ActivityGridProps) {
  // 0: empty, 1: low, 2: medium, 3: high, 4: max (accent)
  const intensityColors = [
    'var(--color-bg-tertiary)',
    '#dcd8cd',
    '#9e998c',
    '#4a473f',
    'var(--color-accent)',
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
          const bg = intensityColors[Math.min(4, Math.max(0, intensity))] || intensityColors[0];
          return (
            <div 
              key={i}
              title={`${dayNames[i]}${isToday ? ' (Today)' : ''}: ${intensity > 0 ? (intensity >= 4 ? '4+ operations' : `${intensity} operations`) : 'No operations'}`}
              className={`aspect-square border transition-all ${
                isToday 
                  ? 'border-text-primary ring-1 ring-text-primary' 
                  : 'border-border-strong hover:border-text-secondary'
              }`}
              style={{ background: bg }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2 px-0.5">
        {dayLetters.map((d, i) => {
          const isToday = i === todayIndex;
          return (
            <div key={i} className="flex flex-col items-center">
              <span className={`text-[11px] font-mono ${isToday ? 'font-bold text-text-primary' : 'text-text-muted'}`}>
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
