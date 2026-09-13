import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Terminal, 
  Target, 
  HeartPulse, 
  Brain, 
  ChevronRight, 
  ArrowDown, 
  Layers, 
  Zap, 
  Lock, 
  Crosshair
} from 'lucide-react';
import { playSolenoidClick } from '../lib/mechanicalAudio';

interface LandingPageProps {
  isAuthenticated?: boolean;
}

type RealmId = 'career' | 'health' | 'personal' | null;

export function LandingPage({ isAuthenticated }: LandingPageProps) {
  const [hoveredRealm, setHoveredRealm] = useState<RealmId>(null);

  const scrollToSection = (id: string) => {
    playSolenoidClick();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary overflow-x-hidden flex flex-col font-sans selection:bg-accent selection:text-white relative bg-blueprint-grid">

      {/* SVG Grain Filter Overlay */}
      <svg className="hidden">
        <filter id="nordic-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.15  0 0 0 0 0.25  0 0 0 0 0.35  0 0 0 0.035 0" />
        </filter>
      </svg>
      <div 
        className="fixed inset-0 pointer-events-none z-50 opacity-40 mix-blend-multiply" 
        style={{ filter: 'url(#nordic-grain)' }} 
        aria-hidden="true"
      />

      {/* HERO SECTION: ASYMMETRIC STORYTELLING & ARTISTIC CENTERPIECE */}
      <section className="relative overflow-hidden border-b border-border-strong pt-16 pb-20 sm:pt-24 sm:pb-32">
        
        {/* Subtle Radial Aura */}
        <div 
          className="absolute top-0 right-1/4 w-[700px] h-[700px] rounded-full pointer-events-none blur-3xl opacity-20 -z-10"
          style={{
            background: 'radial-gradient(circle, rgba(194, 89, 52, 0.25) 0%, rgba(250, 249, 245, 0) 70%)'
          }}
        />

        <div className="max-w-[1600px] mx-auto px-6 sm:px-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* LEFT COLUMN: EDITORIAL PROCLAMATION (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col items-start text-left z-10">
              
              {/* Brand Monogram & Eyebrow */}
              <div className="flex flex-wrap items-center gap-3 mb-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 bg-accent shadow-[0_0_10px_rgba(194,89,52,0.4)] rotate-45" />
                  <span className="text-base sm:text-lg font-mono font-bold tracking-[0.2em] text-text-primary uppercase">
                    JARVIS
                  </span>
                </div>
                <span className="text-border-strong font-mono text-xs">•</span>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-bg-secondary border border-border-strong text-3xs font-mono uppercase tracking-widest text-accent shadow-xs">
                  <Crosshair size={11} className="text-accent animate-spin-slow" />
                  <span>LIFE GOVERNANCE ENGINE // MONARCH PROTOCOL</span>
                </div>
              </div>

              {/* Monumental Life RPG Headline */}
              <h1 className="text-4xl sm:text-6xl xl:text-7xl font-serif font-light sm:font-normal tracking-tight text-text-primary mb-6 leading-[1.08] selection:bg-accent selection:text-white">
                You are the protagonist. <br />
                <span className="italic text-accent font-light">
                  JARVIS is the system.
                </span>
              </h1>

              {/* Editorial Subtitle */}
              <p className="text-lg sm:text-xl font-serif italic font-light text-text-secondary max-w-2xl mb-6 leading-relaxed">
                Eradicate passive to-do list triage. Awaken mathematical human capability across Career, Health, and Personal realms with zero cross-realm contamination.
              </p>

              {/* Manifesto Fragment */}
              <div className="p-4 bg-bg-secondary border-l-2 border-l-accent border border-border-strong mb-10 max-w-2xl shadow-xs">
                <p className="text-xs sm:text-sm font-sans text-text-muted leading-relaxed font-normal">
                  Most productivity tools treat existence as an administrative chore queue. JARVIS models reality as an uncompromising RPG progression architecture: consistency is quantified, trials are unforgiving, and the S-Tier is unlocked solely through mathematical proof of work.
                </p>
              </div>

              {/* Monumental Redesigned CTA Module */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full max-w-xl mb-6">
                <Link
                  to={isAuthenticated ? "/life" : "/auth"}
                  onClick={() => playSolenoidClick()}
                  className="btn-primary py-4 px-7 text-sm font-mono font-medium uppercase tracking-wider flex items-center justify-between gap-4 group transition-all shadow-[0_4px_24px_rgba(194,89,52,0.25)]"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-3xs text-white/80 font-mono tracking-widest">
                      {isAuthenticated ? 'CURRENT SESSION // ACTIVE' : 'INITIALIZE PROTOCOL // REALM MATRIX'}
                    </span>
                    <span className="text-sm font-semibold tracking-wide">
                      {isAuthenticated ? 'Enter Character Matrix' : 'Awaken the System'}
                    </span>
                  </div>
                  <ChevronRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
                </Link>

                <button
                  onClick={() => scrollToSection('act-tri-realms')}
                  className="btn-secondary py-4 px-6 text-xs font-mono font-medium uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <ArrowDown size={14} className="text-accent" />
                  <span>Explore The 3 Realms</span>
                </button>
              </div>

              {/* Status Readout Footnote */}
              <div className="flex flex-wrap items-center gap-3 text-3xs font-mono text-text-muted uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-success font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  100% PRIVATE ARCHITECTURE
                </span>
                <span>•</span>
                <span>E-TIER → S-TIER PROGRESSION</span>
                <span>•</span>
                <span>SPACED RECALL ALGORITHMS</span>
              </div>

            </div>

            {/* RIGHT COLUMN: THE SOVEREIGN ASTROLABE ARTISTIC CENTERPIECE (5 Cols) */}
            <div className="lg:col-span-5 flex items-center justify-center relative">
              
              {/* Artistic Vector Centerpiece */}
              <div className="relative w-full max-w-[480px] aspect-square flex items-center justify-center p-4">
                
                {/* SVG Astrolabe */}
                <svg viewBox="0 0 500 500" className="w-full h-full select-none">
                  
                  {/* Outer Calibration Ring */}
                  <circle 
                    cx="250" 
                    cy="250" 
                    r="230" 
                    fill="none" 
                    stroke="var(--color-border-strong)" 
                    strokeWidth="1" 
                    strokeDasharray="4 6" 
                  />

                  {/* Radians & Degree Marks */}
                  <g className="animate-spin-slow origin-center">
                    <circle 
                      cx="250" 
                      cy="250" 
                      r="215" 
                      fill="none" 
                      stroke="var(--color-text-secondary)" 
                      strokeWidth="1" 
                      strokeOpacity="0.4"
                    />
                    {/* 12 Cardinal Tick Marks */}
                    {[...Array(12)].map((_, i) => {
                      const angle = (i * 30 * Math.PI) / 180;
                      const x1 = 250 + Math.cos(angle) * 210;
                      const y1 = 250 + Math.sin(angle) * 210;
                      const x2 = 250 + Math.cos(angle) * 220;
                      const y2 = 250 + Math.sin(angle) * 220;
                      return (
                        <line 
                          key={i} 
                          x1={x1} 
                          y1={y1} 
                          x2={x2} 
                          y2={y2} 
                          stroke="var(--color-text-primary)" 
                          strokeWidth="1.5" 
                        />
                      );
                    })}
                  </g>

                  {/* Outer Orbital: Personal Realm Ring (R=180) */}
                  <g className={`transition-all duration-300 ${hoveredRealm === 'personal' ? 'opacity-100 scale-102' : 'opacity-70'}`}>
                    <circle 
                      cx="250" 
                      cy="250" 
                      r="180" 
                      fill="none" 
                      stroke={hoveredRealm === 'personal' ? 'var(--color-text-primary)' : 'var(--color-border-strong)'} 
                      strokeWidth={hoveredRealm === 'personal' ? '2.5' : '1'} 
                      strokeDasharray="12 8"
                      className="animate-spin-reverse origin-center"
                    />
                    <text x="250" y="65" textAnchor="middle" className="text-[9px] font-mono fill-text-secondary uppercase tracking-widest font-bold">
                      III // PERSONAL REALM &bull; POLYMATH
                    </text>
                  </g>

                  {/* Middle Orbital: Health Realm Ring (R=135) */}
                  <g className={`transition-all duration-300 ${hoveredRealm === 'health' ? 'opacity-100 scale-102' : 'opacity-70'}`}>
                    <circle 
                      cx="250" 
                      cy="250" 
                      r="135" 
                      fill="none" 
                      stroke={hoveredRealm === 'health' ? 'var(--color-success)' : 'var(--color-border-strong)'} 
                      strokeWidth={hoveredRealm === 'health' ? '2.5' : '1'} 
                      strokeDasharray="8 6"
                      className="animate-spin-slow origin-center"
                    />
                    <text x="250" y="110" textAnchor="middle" className="text-[9px] font-mono fill-success uppercase tracking-widest font-bold">
                      II // HEALTH REALM &bull; VANGUARD
                    </text>
                  </g>

                  {/* Inner Orbital: Career Realm Ring (R=90) */}
                  <g className={`transition-all duration-300 ${hoveredRealm === 'career' ? 'opacity-100 scale-102' : 'opacity-85'}`}>
                    <circle 
                      cx="250" 
                      cy="250" 
                      r="90" 
                      fill="none" 
                      stroke={hoveredRealm === 'career' ? 'var(--color-accent)' : 'var(--color-accent)'} 
                      strokeWidth={hoveredRealm === 'career' ? '3' : '1.5'} 
                      strokeDasharray="6 4"
                      className="animate-spin-reverse origin-center"
                    />
                    <text x="250" y="155" textAnchor="middle" className="text-[9px] font-mono fill-accent uppercase tracking-widest font-bold">
                      I // CAREER REALM &bull; HUNTER
                    </text>
                  </g>

                  {/* Precision Calipers Crosshair (Static Grid) */}
                  <line x1="250" y1="20" x2="250" y2="480" stroke="var(--color-border-subtle)" strokeWidth="1" />
                  <line x1="20" y1="250" x2="480" y2="250" stroke="var(--color-border-subtle)" strokeWidth="1" />
                  <line x1="85" y1="85" x2="415" y2="415" stroke="var(--color-border-subtle)" strokeWidth="0.75" strokeDasharray="4 4" />
                  <line x1="85" y1="415" x2="415" y2="85" stroke="var(--color-border-subtle)" strokeWidth="0.75" strokeDasharray="4 4" />

                  {/* The Monarch Core (Center Diamond & Glyph) */}
                  <g className="animate-pulse-subtle origin-center">
                    <rect 
                      x="220" 
                      y="220" 
                      width="60" 
                      height="60" 
                      transform="rotate(45 250 250)" 
                      fill="var(--color-bg-secondary)" 
                      stroke="var(--color-accent)" 
                      strokeWidth="2" 
                    />
                    <rect 
                      x="232" 
                      y="232" 
                      width="36" 
                      height="36" 
                      transform="rotate(45 250 250)" 
                      fill="var(--color-accent)" 
                      fillOpacity="0.15" 
                      stroke="var(--color-accent)" 
                      strokeWidth="1" 
                    />
                    <circle cx="250" cy="250" r="4" fill="var(--color-accent)" />
                  </g>

                  {/* Peripheral Notation Stamps */}
                  <text x="35" y="475" className="text-[8px] font-mono fill-text-muted">AXIS // HARMONIC</text>
                  <text x="465" y="475" textAnchor="end" className="text-[8px] font-mono fill-text-muted">CORE // EQUILIBRIUM</text>
                  <text x="250" y="495" textAnchor="middle" className="text-[8px] font-mono fill-text-muted">ZERO DATA CONTAMINATION</text>
                </svg>

                {/* Tactical Corner Bracket Accents */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-border-strong" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-border-strong" />
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ACT I: THE TRI-DOMAIN CONCORDAT (CAREER / HEALTH / PERSONAL REVEAL) */}
      <section id="act-tri-realms" className="py-24 border-b border-border-strong bg-bg-secondary/40">
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-strong pb-8 mb-16">
            <div>
              <div className="flex items-center gap-2 mb-2 font-mono text-3xs uppercase tracking-widest text-accent font-bold">
                <Layers size={13} />
                <span>SOVEREIGN ARCHITECTURE // THE THREE REALMS</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-serif font-light sm:font-normal tracking-tight text-text-primary">
                The Tri-Domain <span className="italic text-accent">Concordat</span>
              </h2>
            </div>
            <p className="text-sm sm:text-base font-serif italic font-light text-text-secondary max-w-md">
              Each domain maintains its own XP mathematical engine, ranking hierarchy, and unforgiving S-Tier clearance gate. Zero pooling. Zero dilution.
            </p>
          </div>

          {/* 3 Asymmetric Realm Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* REALM 01: CAREER */}
            <div 
              onMouseEnter={() => setHoveredRealm('career')}
              onMouseLeave={() => setHoveredRealm(null)}
              className="rpg-panel p-8 flex flex-col justify-between transition-all duration-300 hover:border-accent hover:shadow-[0_8px_32px_rgba(194,89,52,0.12)] relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xs font-mono font-bold uppercase tracking-widest px-2.5 py-1 bg-accent/10 border border-accent/40 text-accent flex items-center gap-1.5">
                    <Target size={12} />
                    <span>WORLD 01 &bull; CAREER</span>
                  </span>
                  <span className="text-xs font-mono text-text-muted font-medium">
                    HUNTER CLASS
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-text-primary mb-3 group-hover:text-accent transition-colors">
                  Algorithmic Combat & Production Systems
                </h3>

                <p className="text-xs font-mono text-text-secondary leading-relaxed mb-8">
                  Engineered for elite placements. Isolates daily triage from long-term spaced recall. High-stakes hackathon deployment tracking and Gemini AI architectural project reviews.
                </p>

                {/* Mechanics List */}
                <div className="space-y-3 mb-8 border-t border-border-subtle pt-6 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Primary Mechanics:</span>
                    <span className="font-bold text-text-primary">LeetCode Spaced Recall</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Combat Ground:</span>
                    <span className="font-bold text-text-primary">Hackathons & Projects</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Attribute Surge:</span>
                    <span className="font-bold text-accent flex items-center gap-1">
                      <Zap size={11} /> +INTELLECT / +EXECUTION
                    </span>
                  </div>
                </div>
              </div>

              {/* S-Tier Gate Preview */}
              <div className="p-4 bg-bg-tertiary border border-border-strong flex flex-col gap-2">
                <div className="flex items-center justify-between text-3xs font-mono font-bold text-accent uppercase">
                  <span>S-Tier Gate Threshold</span>
                  <Lock size={12} />
                </div>
                <div className="text-xs font-mono text-text-primary font-bold">
                  300 Solves (150 Medium / 20 Hard) &bull; 8+ Hackathons &bull; 2 Podiums
                </div>
              </div>
            </div>

            {/* REALM 02: HEALTH */}
            <div 
              onMouseEnter={() => setHoveredRealm('health')}
              onMouseLeave={() => setHoveredRealm(null)}
              className="rpg-panel p-8 flex flex-col justify-between transition-all duration-300 hover:border-success hover:shadow-[0_8px_32px_rgba(46,125,86,0.12)] relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xs font-mono font-bold uppercase tracking-widest px-2.5 py-1 bg-success/10 border border-success/40 text-success flex items-center gap-1.5">
                    <HeartPulse size={12} />
                    <span>WORLD 02 &bull; HEALTH</span>
                  </span>
                  <span className="text-xs font-mono text-text-muted font-medium">
                    VANGUARD CLASS
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-text-primary mb-3 group-hover:text-success transition-colors">
                  Biological Mastery & Iron Endurance
                </h3>

                <p className="text-xs font-mono text-text-secondary leading-relaxed mb-8">
                  Your physical vessel is non-negotiable. Quantifies cardiovascular Zone-2 conditioning, heavy strength tonnage, circadian sleep hygiene, and active recovery protocols.
                </p>

                {/* Mechanics List */}
                <div className="space-y-3 mb-8 border-t border-border-subtle pt-6 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Primary Mechanics:</span>
                    <span className="font-bold text-text-primary">Strength & Zone-2 Cardio</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Recovery Gate:</span>
                    <span className="font-bold text-text-primary">Circadian Architecture</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Attribute Surge:</span>
                    <span className="font-bold text-success flex items-center gap-1">
                      <Zap size={11} /> +VITALITY / +DISCIPLINE
                    </span>
                  </div>
                </div>
              </div>

              {/* S-Tier Gate Preview */}
              <div className="p-4 bg-bg-tertiary border border-border-strong flex flex-col gap-2">
                <div className="flex items-center justify-between text-3xs font-mono font-bold text-success uppercase">
                  <span>S-Tier Gate Threshold</span>
                  <Lock size={12} />
                </div>
                <div className="text-xs font-mono text-text-primary font-bold">
                  100 Physical Protocols &bull; 14-Day Cadence &bull; 8h Sleep Compliance
                </div>
              </div>
            </div>

            {/* REALM 03: PERSONAL */}
            <div 
              onMouseEnter={() => setHoveredRealm('personal')}
              onMouseLeave={() => setHoveredRealm(null)}
              className="rpg-panel p-8 flex flex-col justify-between transition-all duration-300 hover:border-text-primary hover:shadow-[0_8px_32px_rgba(17,17,17,0.08)] relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xs font-mono font-bold uppercase tracking-widest px-2.5 py-1 bg-bg-tertiary border border-border-strong text-text-primary flex items-center gap-1.5">
                    <Brain size={12} />
                    <span>WORLD 03 &bull; PERSONAL</span>
                  </span>
                  <span className="text-xs font-mono text-text-muted font-medium">
                    POLYMATH CLASS
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-text-primary mb-3 group-hover:text-accent transition-colors">
                  Philosophical Synthesis & Deliberate Practice
                </h3>

                <p className="text-xs font-mono text-text-secondary leading-relaxed mb-8">
                  Mind expansion beyond professional utility. Deep literature digestion, treatise synthesis, creative compositions, deliberate craft practice, and relationship stewardship.
                </p>

                {/* Mechanics List */}
                <div className="space-y-3 mb-8 border-t border-border-subtle pt-6 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Primary Mechanics:</span>
                    <span className="font-bold text-text-primary">Literature & Treatises</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Deep Work:</span>
                    <span className="font-bold text-text-primary">Deliberate Practice Logs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Attribute Surge:</span>
                    <span className="font-bold text-text-primary flex items-center gap-1">
                      <Zap size={11} className="text-accent" /> +WISDOM / +CREATIVITY
                    </span>
                  </div>
                </div>
              </div>

              {/* S-Tier Gate Preview */}
              <div className="p-4 bg-bg-tertiary border border-border-strong flex flex-col gap-2">
                <div className="flex items-center justify-between text-3xs font-mono font-bold text-text-primary uppercase">
                  <span>S-Tier Gate Threshold</span>
                  <Lock size={12} />
                </div>
                <div className="text-xs font-mono text-text-primary font-bold">
                  50 Books Synthesized &bull; 300+ Deep Hours &bull; Polymath Sovereign
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* FINAL INITIATION CTA SECTION */}
      <section className="py-24 bg-bg-primary text-center border-b border-border-strong relative">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center">
          
          <div className="w-8 h-8 bg-accent rotate-45 mb-8 shadow-[0_0_16px_rgba(194,89,52,0.3)]" />

          <h2 className="text-3xl sm:text-5xl font-serif font-light sm:font-normal tracking-tight text-text-primary mb-5">
            Commence Your <span className="italic text-accent">Ascension.</span>
          </h2>

          <p className="text-base sm:text-lg font-serif italic font-light text-text-secondary max-w-xl mb-8 leading-relaxed">
            The system is online. The three realms are ready. The S-Tier barrier awaits your proof of work.
          </p>

          <Link
            to={isAuthenticated ? "/life" : "/auth"}
            onClick={() => playSolenoidClick()}
            className="btn-primary py-4 px-10 text-sm font-mono font-medium uppercase tracking-widest flex items-center gap-3 shadow-[0_4px_30px_rgba(194,89,52,0.25)]"
          >
            <Terminal size={16} />
            <span>{isAuthenticated ? 'Enter Character Matrix' : 'Awaken the Protocol'}</span>
          </Link>

        </div>
      </section>

      {/* MINIMALIST ARCHITECTURAL FOOTER */}
      <footer className="py-8 bg-bg-secondary border-t border-border-strong font-mono text-3xs text-text-secondary">
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rotate-45" />
            <span className="font-bold text-text-primary uppercase">JARVIS // AUTONOMOUS LIFE PROGRESSION SYSTEM</span>
          </div>
          <div className="flex items-center gap-6 text-text-muted uppercase">
            <span>Client-Side RLS Enforcement</span>
            <span>&bull;</span>
            <span>Zero Data Sharing</span>
            <span>&bull;</span>
            <span>Local Machine Telemetry</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
