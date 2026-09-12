import { useEffect } from 'react';
import { Award, Sparkles, X, ChevronRight } from 'lucide-react';

interface TactileLevelUpModalProps {
  isOpen: boolean;
  domainName: string; // "HEALTH" | "PERSONAL" | "CAREER"
  level: number;
  rank: string;
  rankTitle?: string;
  expGained?: number;
  onClose: () => void;
}

export function TactileLevelUpModal({
  isOpen,
  domainName,
  level,
  rank,
  rankTitle,
  expGained,
  onClose,
}: TactileLevelUpModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    // Optional audio tone via Web Audio API (tactile mechanical frequency)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime); // Low frequency
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.18); // Ascend
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // Ignore audio failure
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] bg-[#08090C]/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(216, 168, 78, 0.15) 0%, rgba(8, 9, 12, 0.95) 75%)'
      }}
    >
      <div className="bg-bg-secondary border-2 border-rpg-gold/50 w-full max-w-md shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_25px_rgba(216,168,78,0.25)] relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Animated Gold Sweep Bar */}
        <div className="h-1 bg-gradient-to-r from-transparent via-rpg-gold to-transparent w-full animate-shimmer" />

        {/* Top Status Bar */}
        <div className="bg-bg-primary text-text-primary px-6 py-3 flex items-center justify-between font-mono border-b border-border-strong">
          <div className="flex items-center gap-2 text-3xs font-bold uppercase tracking-widest text-rpg-gold">
            <Sparkles size={14} className="animate-spin text-rpg-gold" />
            <span>HUNTER ASCENSION PROTOCOL</span>
          </div>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
            aria-label="Close promotion dialog"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8 flex flex-col items-center text-center">
          <div className="inline-block px-3 py-1 bg-rpg-gold/10 border border-rpg-gold/30 text-3xs font-mono font-bold uppercase tracking-widest text-rpg-gold mb-4">
            {domainName} PROTOCOL // STATUS UPGRADE
          </div>

          <div className="text-3xl font-black uppercase tracking-tight font-cinzel text-rpg-gold mb-1 drop-shadow-[0_0_12px_rgba(216,168,78,0.4)]">
            LEVEL UP
          </div>
          <p className="text-xs font-mono text-text-secondary mb-6">
            Your competency bandwidth has expanded. Clearance thresholds elevated.
          </p>

          {/* Central Monumental Display */}
          <div className="w-full bg-bg-primary border border-rpg-gold/30 p-6 mb-6 relative">
            <div className="flex items-center justify-around">
              <div className="flex flex-col items-center">
                <span className="text-3xs font-mono uppercase tracking-widest text-text-muted mb-1">Clearance</span>
                <span className="text-5xl font-black font-cinzel text-text-primary leading-none tracking-tight">
                  LVL {level}
                </span>
              </div>

              <div className="w-px h-12 bg-border-strong" />

              <div className="flex flex-col items-center">
                <span className="text-3xs font-mono uppercase tracking-widest text-text-muted mb-1">Tier Rank</span>
                <span className="text-5xl font-black font-cinzel text-rpg-gold leading-none tracking-tight">
                  {rank}
                </span>
              </div>
            </div>

            {rankTitle && (
              <div className="mt-4 pt-3 border-t border-border-subtle text-3xs font-mono font-bold text-rpg-gold uppercase tracking-wider">
                {rankTitle}
              </div>
            )}
          </div>

          {expGained !== undefined && (
            <div className="text-xs font-mono font-bold text-rpg-gold mb-6 flex items-center gap-1.5">
              <Award size={14} /> +{expGained} XP Credited to {domainName} Ledger
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={onClose}
            className="w-full btn-primary py-3 text-xs flex items-center justify-center gap-2"
          >
            <span>Confirm Elevation</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
