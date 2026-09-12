import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, X, ChevronRight, Zap, Award } from 'lucide-react';
import { 
  playSolenoidClick, 
  playPistonThud, 
  playLevelUpChime, 
  isAudioMuted, 
  toggleAudioMute 
} from '../../lib/mechanicalAudio';
import { TACTILE_EVENT_NAME, type TactilePayload } from '../../lib/tactileFeedback';
import { MechanicalOdometer, RollingOdometer } from './MechanicalOdometer';

export function TactileFeedbackHUD() {
  const [payload, setPayload] = useState<TactilePayload | null>(null);
  const [phase, setPhase] = useState<number>(0); // 0: Stamp, 1: XP, 2: Attribute, 3: Level
  const [muted, setMuted] = useState(isAudioMuted());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = () => {
    setPayload(null);
    setPhase(0);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = toggleAudioMute();
    setMuted(next);
  };

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<TactilePayload>;
      if (!customEvent.detail) return;

      const p = customEvent.detail;
      setPayload(p);
      setPhase(0);

      // Phase 0: Solenoid Clack & Stamp (immediate)
      playSolenoidClick();

      // Phase 1: XP Rolling Odometer at 450ms
      const t1 = setTimeout(() => {
        setPhase(1);
      }, 450);

      // Phase 2: Attribute Impact at 1250ms
      const t2 = setTimeout(() => {
        setPhase(2);
        playPistonThud();
      }, 1250);

      // Phase 3: Level Odometer & Elevation at 2100ms
      const t3 = setTimeout(() => {
        setPhase(3);
        if (p.newLevel > p.oldLevel) {
          playLevelUpChime();
        }
      }, 2100);

      // Auto dismiss at 3800ms IF no level up; if level up, wait for user acknowledgment
      if (p.newLevel <= p.oldLevel) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          handleDismiss();
        }, 3800);
      }

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    };

    window.addEventListener(TACTILE_EVENT_NAME, handleEvent);
    return () => {
      window.removeEventListener(TACTILE_EVENT_NAME, handleEvent);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Keyboard shortcut listener (Space, Enter, Escape to dismiss)
  useEffect(() => {
    if (!payload) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [payload]);

  if (!payload) return null;

  const isLevelUp = payload.newLevel > payload.oldLevel;
  const domainHeader = payload.domain === 'career' 
    ? 'OPERATION RESOLVED' 
    : payload.domain === 'health' 
      ? 'PROTOCOL COMPLETE' 
      : 'QUEST COMPLETE';

  const domainLabel = payload.domain.toUpperCase();

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-text-primary/70 backdrop-blur-xs select-none"
      onClick={handleDismiss}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="w-full max-w-md sm:max-w-lg bg-bg-secondary border-4 border-text-primary shadow-[12px_12px_0_0_#121212] overflow-hidden animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP INDUSTRIAL TELEMETRY STATUS BAR */}
        <div className="bg-text-primary text-bg-primary px-5 py-2.5 flex items-center justify-between font-mono text-xs border-b-2 border-text-primary">
          <div className="flex items-center gap-2 font-bold tracking-widest uppercase">
            <span className="w-2 h-2 bg-accent animate-ping inline-block" />
            <span>JARVIS // {domainLabel} TELEMETRY</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleMute}
              className="text-bg-primary hover:text-accent transition-colors p-1 flex items-center gap-1 text-2xs uppercase tracking-wider"
              title={muted ? 'Unmute mechanical audio' : 'Mute mechanical audio'}
            >
              {muted ? <VolumeX size={14} className="text-accent" /> : <Volume2 size={14} />}
              <span>{muted ? 'MUTED' : 'AUDIO'}</span>
            </button>
            <div className="w-px h-3 bg-border-strong" />
            <button
              onClick={handleDismiss}
              className="text-bg-primary hover:text-accent transition-colors p-1"
              aria-label="Dismiss completion dialog"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* BODY CONTAINER */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          
          {/* STEP 1: STAMPED HEADER */}
          <div className="flex flex-col border-b-2 border-text-primary pb-4">
            <div className="flex items-center justify-between text-2xs font-mono font-bold uppercase tracking-widest text-text-secondary mb-1">
              <span>STATUS: CONFIRMED</span>
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-sans tracking-tight uppercase leading-none text-text-primary">
              {domainHeader}
            </h2>
            <div className="text-xs font-mono text-text-secondary mt-1.5 truncate">
              {payload.questTitle}
            </div>
          </div>

          {/* STEP 2: +XP MECHANICAL ODOMETER COUNT-UP */}
          <div className="bg-bg-primary border-2 border-text-primary p-4 sm:p-6 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-2xs font-mono uppercase tracking-widest text-text-muted">Ledger Credit</span>
              <span className="text-xs font-mono font-bold text-text-secondary uppercase">
                {domainLabel} EXP
              </span>
            </div>

            <div className="text-right">
              {phase >= 1 ? (
                <RollingOdometer 
                  target={payload.expGained} 
                  prefix="+" 
                  suffix="XP"
                  durationMs={700}
                  className="text-4xl sm:text-5xl font-black font-mono text-text-primary"
                  sizeClass="h-[1.2em] w-[0.7em] text-3xl sm:text-4xl"
                />
              ) : (
                <span className="text-4xl sm:text-5xl font-black font-mono text-text-muted">+0 XP</span>
              )}
            </div>
          </div>

          {/* STEP 3: ATTRIBUTE SURGE */}
          <div className={`transition-all duration-300 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-20 translate-y-1'}`}>
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase mb-2">
              <span className="text-text-primary flex items-center gap-1.5">
                <Zap size={14} className="text-accent" />
                <span>{payload.attributeName}</span>
              </span>
              <span className="px-2 py-0.5 bg-text-primary text-bg-primary font-mono text-xs">
                +{payload.attributeDelta} PTS
              </span>
            </div>

            {/* Industrial segmented attribute gauge */}
            <div className="h-2 bg-border-subtle w-full flex gap-1 p-[1px] border border-border-strong">
              {[...Array(10)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-full flex-1 transition-colors duration-200 ${
                    phase >= 2 && i < 8 ? 'bg-text-primary' : 'bg-transparent'
                  }`} 
                />
              ))}
            </div>
          </div>

          {/* STEP 4: LEVEL PROGRESSION / LEVEL-UP ODOMETER */}
          <div className={`border-t-2 border-text-primary pt-4 transition-all duration-300 ${phase >= 3 ? 'opacity-100' : 'opacity-20'}`}>
            {isLevelUp ? (
              /* PROMOTION LEVEL-UP SPLIT FLAP / ODOMETER */
              <div className="bg-accent text-white p-4 border-2 border-text-primary flex flex-col gap-2">
                <div className="flex items-center justify-between text-2xs font-mono font-bold tracking-widest uppercase">
                  <span>CLEARANCE ELEVATION CONFIRMED</span>
                  <Award size={14} />
                </div>
                
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-mono font-bold uppercase">LEVEL</span>
                    <MechanicalOdometer 
                      value={payload.oldLevel} 
                      className="text-2xl font-black text-white" 
                      sizeClass="h-[1.2em] w-[0.7em] text-xl"
                    />
                  </div>

                  <span className="font-mono text-xl font-black">→</span>

                  <div className="flex items-baseline gap-2 bg-white text-text-primary px-3 py-1 border border-black shadow-sm">
                    <span className="text-xs font-mono font-bold uppercase">LEVEL</span>
                    <MechanicalOdometer 
                      value={payload.newLevel} 
                      className="text-2xl font-black text-text-primary" 
                      sizeClass="h-[1.2em] w-[0.7em] text-xl"
                    />
                  </div>
                </div>

                {payload.rankTitle && (
                  <div className="text-3xs font-mono font-bold uppercase tracking-wider text-white/90 pt-1 border-t border-white/20">
                    Tier Rank: {payload.rank} • {payload.rankTitle}
                  </div>
                )}
              </div>
            ) : (
              /* STANDARD BRACKET PROGRESS */
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono text-text-secondary uppercase">
                  <span>Level {payload.newLevel} Bracket</span>
                  <span className="font-bold text-text-primary">
                    {payload.currentLevelExp} / {payload.expToNext} XP
                  </span>
                </div>

                <div className="h-1.5 bg-border-subtle w-full overflow-hidden">
                  <div 
                    className="h-full bg-text-primary transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, (payload.currentLevelExp / payload.expToNext) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM ACTIONS / DISMISS PROMPT */}
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-2xs font-mono text-text-secondary">
            <span className="tracking-wider uppercase">
              {isLevelUp ? 'Elevation Acknowledgment' : 'Auto-closing...'}
            </span>

            <button
              onClick={handleDismiss}
              className="btn-primary py-2 px-4 text-xs font-mono flex items-center gap-1.5"
            >
              <span>{isLevelUp ? 'Acknowledge' : 'Continue'}</span>
              <ChevronRight size={14} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
