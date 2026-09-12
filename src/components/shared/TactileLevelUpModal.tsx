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
      className="fixed inset-0 z-[200] bg-text-primary/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-secondary border-4 border-text-primary w-full max-w-md shadow-[10px_10px_0_0_var(--color-text-primary)] relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Mechanical Status Bar */}
        <div className="bg-text-primary text-bg-primary px-6 py-3 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent">
            <Sparkles size={14} className="animate-spin text-accent" />
            <span>PROTOCOL PROMOTION</span>
          </div>
          <button 
            onClick={onClose}
            className="text-bg-primary hover:text-accent transition-colors p-1"
            aria-label="Close promotion dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8 flex flex-col items-center text-center">
          <div className="inline-block px-3 py-1 bg-bg-tertiary border border-border-strong text-2xs font-mono font-bold uppercase tracking-ultra text-text-secondary mb-4">
            {domainName} PROTOCOL // STATUS UPGRADE
          </div>

          <div className="text-3xl font-black uppercase tracking-tight text-text-primary mb-1">
            Elevation Confirmed
          </div>
          <p className="text-xs font-mono text-text-secondary mb-8">
            Your competency bandwidth has expanded. Clearance thresholds upgraded.
          </p>

          {/* Central Monumental Display */}
          <div className="w-full bg-bg-primary border-2 border-text-primary p-6 mb-6 relative">
            <div className="flex items-center justify-around">
              <div className="flex flex-col items-center">
                <span className="text-2xs font-mono uppercase tracking-widest text-text-muted mb-1">Level</span>
                <span className="text-5xl font-black font-mono text-text-primary leading-none tracking-tight">
                  {level}
                </span>
              </div>

              <div className="w-px h-12 bg-border-strong" />

              <div className="flex flex-col items-center">
                <span className="text-2xs font-mono uppercase tracking-widest text-text-muted mb-1">Rank</span>
                <span className="text-5xl font-black font-mono text-accent leading-none tracking-tight">
                  {rank}
                </span>
              </div>
            </div>

            {rankTitle && (
              <div className="mt-4 pt-3 border-t border-border-subtle text-xs font-mono font-bold text-text-secondary uppercase tracking-wider">
                {rankTitle}
              </div>
            )}
          </div>

          {expGained !== undefined && (
            <div className="text-xs font-mono font-bold text-success mb-6 flex items-center gap-1.5">
              <Award size={14} /> +{expGained} XP Credited to {domainName} Ledger
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={onClose}
            className="w-full btn-primary py-3 text-xs flex items-center justify-center gap-2"
          >
            <span>Resume Operations</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
