import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Volume2, VolumeX, X, ChevronRight, Zap, Award, Sparkles, Trophy } from 'lucide-react';
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
    ? 'CAREER QUEST RESOLVED' 
    : payload.domain === 'health' 
      ? 'HEALTH PROTOCOL COMPLETE' 
      : 'PERSONAL QUEST COMPLETE';

  const domainLabel = payload.domain.toUpperCase();
  const isSRank = payload.rank === 'S';

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#08090C]/90 backdrop-blur-md select-none"
      onClick={handleDismiss}
      aria-modal="true"
      role="dialog"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(216, 168, 78, 0.12) 0%, rgba(8, 9, 12, 0.95) 75%)'
      }}
    >
      <div 
        className="w-full max-w-md sm:max-w-lg bg-bg-secondary border-2 border-rpg-gold/40 shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_25px_rgba(216,168,78,0.2)] overflow-hidden animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Gold Sweep Bar */}
        <div className="h-1 bg-gradient-to-r from-transparent via-rpg-gold to-transparent w-full animate-shimmer" />

        {/* TOP STATUS BAR */}
        <div className="bg-bg-primary text-text-primary px-5 py-2.5 flex items-center justify-between font-mono text-xs border-b border-border-strong">
          <div className="flex items-center gap-2 font-bold tracking-widest uppercase text-3xs">
            <span className="w-2 h-2 bg-rpg-gold animate-ping inline-block rounded-full" />
            <span className="text-rpg-gold">JARVIS // {domainLabel} TELEMETRY</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleMute}
              className="text-text-secondary hover:text-rpg-gold transition-colors p-1 flex items-center gap-1 text-3xs uppercase tracking-wider"
              title={muted ? 'Unmute mechanical audio' : 'Mute mechanical audio'}
            >
              {muted ? <VolumeX size={13} className="text-rpg-crimson" /> : <Volume2 size={13} />}
              <span>{muted ? 'MUTED' : 'AUDIO'}</span>
            </button>
            <div className="w-px h-3 bg-border-strong" />
            <button
              onClick={handleDismiss}
              className="text-text-muted hover:text-text-primary transition-colors p-1"
              aria-label="Dismiss completion dialog"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* BODY CONTAINER */}
        <div className="p-6 sm:p-8 flex flex-col gap-5">
          
          {/* STEP 1: HEADER */}
          <div className="flex flex-col border-b border-border-subtle pb-4">
            <div className="flex items-center justify-between text-3xs font-mono font-bold uppercase tracking-widest text-text-secondary mb-1">
              <span className="flex items-center gap-1.5 text-rpg-green">
                <span className="w-1.5 h-1.5 rounded-full bg-rpg-green" />
                STATUS: VERIFIED
              </span>
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-cinzel tracking-tight uppercase leading-tight text-text-primary">
              {domainHeader}
            </h2>
            <div className="text-xs font-mono text-text-secondary mt-1 truncate">
              {payload.questTitle}
            </div>
          </div>

          {/* STEP 2: +XP MECHANICAL ODOMETER COUNT-UP */}
          <div className="bg-bg-primary/80 border border-rpg-gold/30 p-4 sm:p-5 flex items-center justify-between relative overflow-hidden shadow-xs">
            <div className="flex flex-col">
              <span className="text-3xs font-mono uppercase tracking-widest text-text-muted">Ledger Credit</span>
              <span className="text-xs font-mono font-bold text-rpg-gold uppercase">
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
                  className="text-3xl sm:text-4xl font-black font-mono text-rpg-gold drop-shadow-[0_0_10px_rgba(216,168,78,0.4)]"
                  sizeClass="h-[1.2em] w-[0.7em] text-2xl sm:text-3xl"
                />
              ) : (
                <span className="text-3xl sm:text-4xl font-black font-mono text-text-muted">+0 XP</span>
              )}
            </div>
          </div>

          {/* STEP 3: ATTRIBUTE SURGE */}
          <div className={`transition-all duration-300 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-20 translate-y-1'}`}>
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase mb-2">
              <span className="text-text-primary flex items-center gap-1.5">
                <Zap size={14} className="text-rpg-gold" />
                <span>{payload.attributeName}</span>
              </span>
              <span className="px-2 py-0.5 bg-rpg-gold/15 text-rpg-gold border border-rpg-gold/30 font-mono text-xs font-black">
                +{payload.attributeDelta} PTS
              </span>
            </div>

            {/* Segmented attribute gauge filling with gold */}
            <div className="h-2 bg-bg-primary w-full flex gap-1 p-[1px] border border-border-strong">
              {[...Array(10)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-full flex-1 transition-colors duration-200 ${
                    phase >= 2 && i < 8 ? 'bg-rpg-gold shadow-[0_0_6px_rgba(216,168,78,0.4)]' : 'bg-transparent'
                  }`} 
                />
              ))}
            </div>
          </div>

          {/* STEP 4: LEVEL PROGRESSION / LEVEL-UP ODOMETER */}
          <div className={`border-t border-border-subtle pt-4 transition-all duration-300 ${phase >= 3 ? 'opacity-100' : 'opacity-20'}`}>
            {isLevelUp ? (
              /* PROMOTION LEVEL-UP CINEMATIC DISPLAY */
              <div className="bg-bg-primary border-2 border-rpg-gold p-5 flex flex-col gap-3 relative overflow-hidden shadow-[0_0_20px_rgba(216,168,78,0.25)]">
                <div className="flex items-center justify-between text-3xs font-mono font-bold tracking-widest uppercase text-rpg-gold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-rpg-gold animate-spin" />
                    CLEARANCE ASCENSION CONFIRMED
                  </span>
                  <Award size={14} className="text-rpg-gold" />
                </div>

                <div className="text-2xl sm:text-3xl font-black font-cinzel uppercase tracking-wider text-rpg-gold text-center py-1">
                  LEVEL UP
                </div>
                
                <div className="flex items-center justify-around pt-1 border-t border-rpg-gold/20">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xs font-mono font-bold uppercase text-text-muted">FROM</span>
                    <MechanicalOdometer 
                      value={payload.oldLevel} 
                      className="text-2xl font-black text-text-secondary" 
                      sizeClass="h-[1.2em] w-[0.7em] text-xl"
                    />
                  </div>

                  <span className="font-mono text-xl font-black text-rpg-gold">→</span>

                  <div className="flex items-baseline gap-2 bg-rpg-gold/15 text-rpg-gold px-3 py-1 border border-rpg-gold/40 shadow-xs">
                    <span className="text-3xs font-mono font-bold uppercase text-rpg-gold">LVL</span>
                    <MechanicalOdometer 
                      value={payload.newLevel} 
                      className="text-2xl font-black text-rpg-gold" 
                      sizeClass="h-[1.2em] w-[0.7em] text-xl"
                    />
                  </div>
                </div>

                {/* S-Tier Breakthrough Banner */}
                {isSRank ? (
                  <div className="p-2.5 bg-rpg-gold/20 border border-rpg-gold text-center font-mono text-3xs font-bold text-rpg-gold uppercase flex items-center justify-center gap-2">
                    <Trophy size={14} />
                    <span>S-TIER TRIAL COMPLETE // APEX HUNTER ASCENDED</span>
                  </div>
                ) : payload.rankTitle && (
                  <div className="text-3xs font-mono font-bold uppercase tracking-wider text-text-secondary text-center pt-1 border-t border-border-subtle">
                    Classification: Tier {payload.rank} &bull; {payload.rankTitle}
                  </div>
                )}

                {/* Link to Rewards Page */}
                <Link
                  to="/rewards"
                  onClick={handleDismiss}
                  className="mt-1 flex items-center justify-center gap-1.5 p-2 bg-rpg-gold/10 hover:bg-rpg-gold/20 border border-rpg-gold/30 text-rpg-gold text-3xs font-mono font-bold uppercase tracking-wider transition-colors"
                >
                  <Sparkles size={12} />
                  <span>New Unlock Available // View Rewards & Titles →</span>
                </Link>
              </div>
            ) : (
              /* STANDARD BRACKET PROGRESS */
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-3xs font-mono text-text-secondary uppercase">
                  <span>Level {payload.newLevel} Ascent Bracket</span>
                  <span className="font-bold text-rpg-gold">
                    {payload.currentLevelExp} / {payload.expToNext} XP
                  </span>
                </div>

                <div className="h-1.5 bg-bg-primary w-full overflow-hidden border border-border-subtle p-[1px]">
                  <div 
                    className="h-full bg-gradient-to-r from-rpg-gold/70 to-rpg-gold transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, (payload.currentLevelExp / payload.expToNext) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM ACTIONS */}
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-3xs font-mono text-text-secondary">
            <span className="tracking-wider uppercase">
              {isLevelUp ? 'Ascension Confirmed' : 'Closing in 3s...'}
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
