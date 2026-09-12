import { useState, useEffect, useRef } from 'react';
import { playRatchetTick } from '../../lib/mechanicalAudio';

interface DigitWheelProps {
  digit: string;
  sizeClass?: string;
}

function DigitWheel({ digit, sizeClass = 'h-[1.25em] w-[0.75em]' }: DigitWheelProps) {
  const num = parseInt(digit, 10);
  
  if (isNaN(num)) {
    return <span className="inline-block px-0.5 select-none font-mono font-bold">{digit}</span>;
  }

  return (
    <div className={`relative inline-block overflow-hidden bg-text-primary text-bg-primary font-mono font-black border border-border-strong select-none ${sizeClass}`}>
      {/* Physical mechanical divider / groove line on odometer drum */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/20 z-10 pointer-events-none" />
      
      <div 
        className="transition-transform duration-600 ease-[cubic-bezier(0.12,0.95,0.18,1)] flex flex-col items-center"
        style={{ transform: `translateY(-${num * 10}%)` }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <div key={n} className="h-[1.25em] flex items-center justify-center text-center leading-none">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}

interface MechanicalOdometerProps {
  value: string | number;
  className?: string;
  sizeClass?: string;
}

export function MechanicalOdometer({ value, className = '', sizeClass }: MechanicalOdometerProps) {
  const str = String(value);

  return (
    <div className={`inline-flex items-center gap-[2px] ${className}`}>
      {str.split('').map((char, i) => (
        <DigitWheel key={i} digit={char} sizeClass={sizeClass} />
      ))}
    </div>
  );
}

interface RollingOdometerProps {
  target: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  sizeClass?: string;
}

export function RollingOdometer({
  target,
  durationMs = 800,
  prefix = '',
  suffix = '',
  className = '',
  sizeClass
}: RollingOdometerProps) {
  const [current, setCurrent] = useState(0);
  const audioCounterRef = useRef(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min(1, (timestamp - startTimestamp) / durationMs);
      
      // Industrial mechanical step curve
      const easedProgress = Math.pow(progress, 0.85);
      const nextVal = Math.round(easedProgress * target);

      if (nextVal !== audioCounterRef.current) {
        audioCounterRef.current = nextVal;
        playRatchetTick();
      }

      setCurrent(nextVal);

      if (progress < 1) {
        animFrameId = requestAnimationFrame(step);
      }
    };

    animFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrameId);
  }, [target, durationMs]);

  return (
    <div className={`inline-flex items-baseline gap-1 ${className}`}>
      {prefix && <span className="font-mono font-bold select-none">{prefix}</span>}
      <MechanicalOdometer value={current} sizeClass={sizeClass} />
      {suffix && <span className="font-mono font-bold select-none ml-1">{suffix}</span>}
    </div>
  );
}
