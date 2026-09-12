interface AttributeItem {
  key: string;
  label: string;
  value: number; // 0-100
}

interface AttributeRadarChartProps {
  attributes: AttributeItem[];
  color?: string; // hex or tailwind class
  title?: string;
  size?: number;
}

export function AttributeRadarChart({
  attributes,
  color = '#c25934',
  title,
  size = 280,
}: AttributeRadarChartProps) {
  const center = size / 2;
  const radius = (size / 2) - 42; // Leave room for labels
  const total = attributes.length;

  if (total < 3) return null;

  const angleStep = (Math.PI * 2) / total;
  // Rotate by -PI/2 so top axis points straight up
  const startAngle = -Math.PI / 2;

  // Concentric levels (20%, 40%, 60%, 80%, 100%)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const getCoordinates = (index: number, factor: number) => {
    const angle = startAngle + index * angleStep;
    const x = center + radius * factor * Math.cos(angle);
    const y = center + radius * factor * Math.sin(angle);
    return { x, y };
  };

  // Generate polygon points for data
  const dataPoints = attributes.map((attr, i) => {
    const factor = Math.max(0.05, Math.min(1.0, attr.value / 100));
    return getCoordinates(i, factor);
  });

  const polygonPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ') + ' Z';

  return (
    <div className="flex flex-col items-center select-none">
      {title && (
        <div className="label mb-2 border-b border-border-strong pb-1 text-center w-full">
          {title}
        </div>
      )}
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Concentric Webs */}
        {levels.map((lvl, lIdx) => {
          const webPoints = Array.from({ length: total }).map((_, i) => {
            const { x, y } = getCoordinates(i, lvl);
            return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
          }).join(' ') + ' Z';

          return (
            <path
              key={lIdx}
              d={webPoints}
              fill="none"
              stroke="var(--color-border-strong)"
              strokeWidth={lIdx === levels.length - 1 ? "1.5" : "0.75"}
              strokeDasharray={lIdx === levels.length - 1 ? "none" : "2,2"}
              opacity={0.65}
            />
          );
        })}

        {/* Radial Axis Spokes */}
        {Array.from({ length: total }).map((_, i) => {
          const { x, y } = getCoordinates(i, 1.0);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="var(--color-border-strong)"
              strokeWidth="0.75"
              opacity={0.65}
            />
          );
        })}

        {/* Filled Data Polygon */}
        <path
          d={polygonPath}
          fill={color}
          fillOpacity={0.18}
          stroke={color}
          strokeWidth="2.5"
          className="transition-all duration-700 ease-out"
        />

        {/* Vertex Markers */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill="var(--color-bg-secondary)"
            stroke={color}
            strokeWidth="2"
            className="transition-all duration-700 ease-out"
          />
        ))}

        {/* Outer Axis Labels */}
        {attributes.map((attr, i) => {
          const angle = startAngle + i * angleStep;
          const labelDist = radius + 24;
          const x = center + labelDist * Math.cos(angle);
          const y = center + labelDist * Math.sin(angle);

          // Alignment adjustments based on angle
          let textAnchor: "middle" | "start" | "end" = "middle";
          if (Math.abs(Math.cos(angle)) > 0.3) {
            textAnchor = Math.cos(angle) > 0 ? "start" : "end";
          }

          return (
            <g key={attr.key} transform={`translate(${x}, ${y})`}>
              <text
                textAnchor={textAnchor}
                dominantBaseline="central"
                className="font-mono font-bold text-[10px] fill-text-primary uppercase tracking-wider"
              >
                {attr.label}
              </text>
              <text
                textAnchor={textAnchor}
                y={11}
                className="font-mono font-black text-[11px] fill-accent"
              >
                {attr.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
