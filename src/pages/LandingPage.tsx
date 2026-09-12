import { Link } from 'react-router-dom';
import { 
  Terminal, 
  RotateCcw, 
  HeartPulse, 
  Brain, 
  Bot, 
  GripVertical, 
  Trophy, 
  Layers, 
  Shield, 
  Activity, 
  Target, 
  Sparkles, 
  Clock 
} from 'lucide-react';

interface LandingPageProps {
  isAuthenticated?: boolean;
}

export function LandingPage({ isAuthenticated }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary overflow-x-hidden flex flex-col font-sans selection:bg-accent selection:text-bg-primary">

      {/* Top Protocol Telemetry Header */}
      <header className="border-b border-border-strong bg-bg-secondary sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-cinzel font-black text-base uppercase tracking-widest text-rpg-gold">
              JARVIS
            </span>
            <span className="hidden sm:inline-block text-3xs font-mono uppercase tracking-widest px-2 py-0.5 border border-rpg-gold/30 bg-rpg-gold/10 text-rpg-gold">
              SYSTEM // RPG V3.0
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 font-mono text-3xs uppercase tracking-widest text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-rpg-green animate-pulse shrink-0" />
              <span className="hidden sm:inline">THE SYSTEM IS ONLINE</span>
              <span className="sm:hidden">ONLINE</span>
            </div>

            {isAuthenticated && (
              <Link
                to="/rewards"
                className="hidden sm:flex items-center gap-1.5 text-3xs font-mono font-bold uppercase tracking-wider text-rpg-gold hover:text-text-primary transition-colors px-2 py-1 border border-rpg-gold/30"
              >
                <Trophy size={11} />
                <span>Rewards</span>
              </Link>
            )}

            <Link
              to={isAuthenticated ? "/life" : "/auth"}
              className="btn-primary text-2xs sm:text-xs py-1.5 px-4 font-mono uppercase tracking-wider"
            >
              <Terminal size={13} />
              <span>{isAuthenticated ? 'Character Matrix' : 'Awaken System'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full border-x border-border-strong bg-bg-primary">

        {/* HERO SECTION */}
        <section 
          className="px-6 sm:px-12 pt-20 pb-24 border-b border-border-strong relative overflow-hidden bg-bg-primary"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(28, 110, 140, 0.08) 0%, rgba(251, 252, 255, 1) 75%)'
          }}
        >
          <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
            
            {/* System Status Pill */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1 bg-bg-secondary border border-rpg-gold/30 mb-8 text-3xs font-mono uppercase tracking-widest text-rpg-gold shadow-xs">
              <span className="w-1.5 h-1.5 bg-rpg-gold rounded-full animate-pulse" />
              <span>AUTONOMOUS LIFE & RPG PROGRESSION SYSTEM</span>
            </div>

            {/* Massive Display Title */}
            <h1 className="text-6xl sm:text-8xl md:text-[9.5rem] font-black font-cinzel tracking-tighter text-text-primary mb-6 leading-none uppercase select-none drop-shadow-[0_4px_20px_rgba(39,65,86,0.12)]">
              JARVIS
            </h1>

            {/* Editorial Subtitle */}
            <p className="text-xl sm:text-2xl md:text-3xl font-serif italic text-text-secondary max-w-3xl mx-auto mb-6 leading-tight">
              Awaken human capability across Career, Health, and Personal realms through mathematical progression.
            </p>

            <p className="text-sm sm:text-base text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
              Decouple daily triage from long-term memory retention. Featuring autonomous AI re-planning, interval-based LeetCode spaced repetition, Gemini project audits, title unlocks, and zero cross-realm XP contamination.
            </p>

            {/* Call To Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mb-14">
              <Link 
                to={isAuthenticated ? "/life" : "/auth"} 
                className="btn-primary w-full sm:w-auto text-sm sm:text-base px-8 py-4 uppercase tracking-widest font-mono font-bold shadow-sm"
              >
                <Terminal size={18} /> 
                <span>{isAuthenticated ? 'Open Character Matrix' : 'Awaken Console'}</span>
              </Link>
              
              {isAuthenticated ? (
                <Link 
                  to="/dashboard" 
                  className="btn-secondary w-full sm:w-auto text-sm sm:text-base px-8 py-4 uppercase tracking-widest font-mono font-bold"
                >
                  <span>Career Quests →</span>
                </Link>
              ) : (
                <a 
                  href="#domains" 
                  className="btn-secondary w-full sm:w-auto text-sm sm:text-base px-8 py-4 uppercase tracking-widest font-mono font-bold"
                >
                  <span>Explore Architecture ↓</span>
                </a>
              )}
            </div>

            {/* Live Telemetry Ticker Strip */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 border border-border-strong bg-bg-secondary text-left font-mono">
              <div className="p-4 border-b sm:border-b-0 sm:border-r border-border-strong flex flex-col justify-between">
                <span className="text-3xs uppercase tracking-widest text-text-muted">01 // REALM ONE</span>
                <span className="text-sm font-bold uppercase tracking-wide text-text-primary mt-1 font-cinzel">CAREER REALM</span>
                <span className="text-2xs text-rpg-gold font-bold mt-0.5">APEX HUNTER ASCENSION (S-TIER)</span>
              </div>
              <div className="p-4 border-b sm:border-b-0 sm:border-r border-border-strong flex flex-col justify-between">
                <span className="text-3xs uppercase tracking-widest text-text-muted">02 // REALM TWO</span>
                <span className="text-sm font-bold uppercase tracking-wide text-text-primary mt-1 font-cinzel">HEALTH REALM</span>
                <span className="text-2xs text-rpg-green font-bold mt-0.5">IRON VANGUARD TITAN (S-TIER)</span>
              </div>
              <div className="p-4 flex flex-col justify-between">
                <span className="text-3xs uppercase tracking-widest text-text-muted">03 // REALM THREE</span>
                <span className="text-sm font-bold uppercase tracking-wide text-text-primary mt-1 font-cinzel">PERSONAL REALM</span>
                <span className="text-2xs text-rpg-rare font-bold mt-0.5">POLYMATH SOVEREIGN (S-TIER)</span>
              </div>
            </div>

          </div>
        </section>

        {/* SECTION 1: TRI-DOMAIN LIFE MAP ARCHITECTURE */}
        <section id="domains" className="px-6 sm:px-12 py-20 border-b-2 border-text-primary bg-bg-secondary">
          <div className="max-w-6xl mx-auto">
            
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 border-b-2 border-text-primary pb-4 gap-4">
              <div>
                <span className="label text-accent mb-1 block">ARCHITECTURAL TOPOLOGY</span>
                <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-text-primary">
                  The Tri-Domain Life Map
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-text-secondary max-w-md font-mono text-left sm:text-right">
                Three autonomous territories of human capability. Strict non-destructive progression with zero XP pooling.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Career */}
              <div className="panel border-2 border-text-primary p-7 flex flex-col justify-between group hover:border-accent transition-colors bg-bg-primary">
                <div>
                  <div className="flex items-center justify-between mb-6 pb-3 border-b border-border-strong">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">TERRITORY // 01</span>
                    <Target size={20} className="text-accent" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-text-primary mb-2">
                    Career Domain
                  </h3>
                  <div className="text-xs font-mono uppercase tracking-wider text-text-secondary mb-4">
                    Hunter Clearance • Ranks E → S
                  </div>
                  <p className="text-sm text-text-secondary font-serif leading-relaxed mb-6">
                    Master technical placement readiness through LeetCode algorithmic tracking, Gemini-evaluated engineering projects, hackathon sprints, and target company pipelines.
                  </p>
                </div>
                <div className="pt-4 border-t border-border-subtle font-mono text-2xs space-y-2">
                  <div className="flex justify-between text-text-secondary">
                    <span>S-Gate Criteria</span>
                    <span className="font-bold text-text-primary">300+ Solves // 2+ Projects</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Core Engine</span>
                    <span className="font-bold text-text-primary">Daily AI Triage</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Health */}
              <div className="panel border-2 border-text-primary p-7 flex flex-col justify-between group hover:border-success transition-colors bg-bg-primary">
                <div>
                  <div className="flex items-center justify-between mb-6 pb-3 border-b border-border-strong">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-success">TERRITORY // 02</span>
                    <HeartPulse size={20} className="text-success" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-text-primary mb-2">
                    Health Domain
                  </h3>
                  <div className="text-xs font-mono uppercase tracking-wider text-text-secondary mb-4">
                    Vanguard Clearance • Ranks E → S
                  </div>
                  <p className="text-sm text-text-secondary font-serif leading-relaxed mb-6">
                    Quantify physiological readiness across 5 biometrics: Workout Intensity, Recovery, Sleep Quality, Nutrition, and Mobility. Driven by weekly Monday–Sunday activity heatmaps.
                  </p>
                </div>
                <div className="pt-4 border-t border-border-subtle font-mono text-2xs space-y-2">
                  <div className="flex justify-between text-text-secondary">
                    <span>S-Gate Criteria</span>
                    <span className="font-bold text-text-primary">90+ Sleep // 5x Workouts/Wk</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Mastery Pillars</span>
                    <span className="font-bold text-text-primary">5 Biometric Vectors</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Personal */}
              <div className="panel border-2 border-text-primary p-7 flex flex-col justify-between group hover:border-text-primary transition-colors bg-bg-primary">
                <div>
                  <div className="flex items-center justify-between mb-6 pb-3 border-b border-border-strong">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-text-primary">TERRITORY // 03</span>
                    <Brain size={20} className="text-text-primary" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-text-primary mb-2">
                    Personal Domain
                  </h3>
                  <div className="text-xs font-mono uppercase tracking-wider text-text-secondary mb-4">
                    Polymath Clearance • Ranks E → S
                  </div>
                  <p className="text-sm text-text-secondary font-serif leading-relaxed mb-6">
                    Cultivate sovereign intellect through deliberate study: Deep Reading, Analytical Treatises, Deliberate Practice, and Systems Design with dedicated mastery logs.
                  </p>
                </div>
                <div className="pt-4 border-t border-border-subtle font-mono text-2xs space-y-2">
                  <div className="flex justify-between text-text-secondary">
                    <span>S-Gate Criteria</span>
                    <span className="font-bold text-text-primary">50 Treatises // 1000h Practice</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Focus Vectors</span>
                    <span className="font-bold text-text-primary">Polymath Mastery</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION 2: DUAL-QUEUE COMMAND ARCHITECTURE */}
        <section className="px-6 sm:px-12 py-20 border-b-2 border-text-primary bg-bg-primary">
          <div className="max-w-6xl mx-auto">
            
            <div className="mb-12 border-b-2 border-text-primary pb-4">
              <span className="label text-accent mb-1 block">EXECUTION ARCHITECTURE</span>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-text-primary">
                The Dual-Queue Engine
              </h2>
              <p className="text-sm text-text-secondary font-serif mt-2 max-w-2xl">
                Daily task execution decoupled from interval-based algorithmic retention. Re-Plan AI optimizes daily output while the Spaced Repetition Protocol locks in long-term memory.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Queue 1: Operation Queue */}
              <div className="border-2 border-text-primary bg-bg-secondary p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bot size={18} className="text-accent" />
                      <span className="font-mono font-bold text-sm uppercase tracking-wider text-text-primary">
                        Operation Queue
                      </span>
                    </div>
                    <span className="text-3xs font-mono uppercase tracking-widest text-accent border border-accent/40 bg-accent/10 px-2 py-0.5">
                      ACTIVE SPRINTS
                    </span>
                  </div>

                  <p className="text-sm text-text-secondary font-serif leading-relaxed mb-6">
                    Focuses exclusively on actionable, forward-moving operations. Never polluted by recurring revisions or passive reminders.
                  </p>

                  <div className="space-y-3 font-mono text-xs mb-6">
                    <div className="p-3 bg-bg-primary border border-border-strong flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot size={14} className="text-accent" />
                        <span className="font-bold text-text-primary">Gemini Daily Re-Plan</span>
                      </div>
                      <span className="text-3xs text-text-muted">Dynamic AI Triage</span>
                    </div>

                    <div className="p-3 bg-bg-primary border border-border-strong flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical size={14} className="text-text-primary" />
                        <span className="font-bold text-text-primary">Manual Drag & Slide</span>
                      </div>
                      <span className="text-3xs text-text-muted">Sub-Millisecond Reordering</span>
                    </div>

                    <div className="p-3 bg-bg-primary border border-border-strong flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy size={14} className="text-accent" />
                        <span className="font-bold text-text-primary">Highest Priority Slot</span>
                      </div>
                      <span className="text-3xs text-text-muted">Strict Operational Isolation</span>
                    </div>
                  </div>
                </div>

                <div className="text-2xs font-mono text-text-muted pt-4 border-t border-border-subtle flex items-center justify-between">
                  <span>AI OPTIMIZATION SCOPE</span>
                  <span className="text-text-primary font-bold">OPERATIONS ONLY</span>
                </div>
              </div>

              {/* Queue 2: Revision Queue */}
              <div className="border-2 border-text-primary bg-bg-secondary p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <RotateCcw size={18} className="text-accent" />
                      <span className="font-mono font-bold text-sm uppercase tracking-wider text-text-primary">
                        Revision Queue
                      </span>
                    </div>
                    <span className="text-3xs font-mono uppercase tracking-widest text-accent border border-accent/40 bg-accent/10 px-2 py-0.5">
                      SPACED REPETITION
                    </span>
                  </div>

                  <p className="text-sm text-text-secondary font-serif leading-relaxed mb-6">
                    A dedicated retention engine for solved algorithmic problems, operating on a mathematical spaced repetition interval (Day 5, Day 15, Day 30).
                  </p>

                  <div className="space-y-3 font-mono text-xs mb-6">
                    <div className="p-3 bg-bg-primary border border-border-strong flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-accent" />
                        <span className="font-bold text-text-primary">Interval Protocol</span>
                      </div>
                      <span className="text-3xs text-text-muted">5d • 15d • 30d Review Cadence</span>
                    </div>

                    <div className="p-3 bg-bg-primary border border-border-strong flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RotateCcw size={14} className="text-text-primary" />
                        <span className="font-bold text-text-primary">Recall Verification Modal</span>
                      </div>
                      <span className="text-3xs text-text-muted">Hint Reliance Auditing</span>
                    </div>

                    <div className="p-3 bg-bg-primary border border-border-strong flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-accent" />
                        <span className="font-bold text-text-primary">Tiered Recall EXP</span>
                      </div>
                      <span className="text-3xs text-text-muted">+8 XP (Recall) → +25 XP (Solve)</span>
                    </div>
                  </div>
                </div>

                <div className="text-2xs font-mono text-text-muted pt-4 border-t border-border-subtle flex items-center justify-between">
                  <span>RETENTION PROTOCOL</span>
                  <span className="text-text-primary font-bold">100% UNBIASED BY DAILY AI</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION 3: DEEP COMPETENCY SYSTEMS GRID */}
        <section className="px-6 sm:px-12 py-20 border-b-2 border-text-primary bg-bg-secondary">
          <div className="max-w-6xl mx-auto">
            
            <div className="mb-12 border-b-2 border-text-primary pb-4">
              <span className="label text-accent mb-1 block">SUBSYSTEM INTELLIGENCE</span>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-text-primary">
                Advanced Tactical Subsystems
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Feature 1 */}
              <div className="panel border border-border-strong p-6 bg-bg-primary flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 border border-text-primary bg-bg-secondary flex items-center justify-center mb-4">
                    <Bot size={20} className="text-accent" />
                  </div>
                  <h4 className="font-bold text-base uppercase tracking-tight text-text-primary mb-2">
                    Gemini Project Evaluator
                  </h4>
                  <p className="text-xs text-text-secondary font-serif leading-relaxed">
                    Automated architecture and complexity evaluations. Submits codebases to Gemini models to grade engineering depth and system maturity.
                  </p>
                </div>
                <div className="pt-4 mt-6 border-t border-border-subtle font-mono text-3xs text-text-muted">
                  0-10 COMPLEXITY SCORE • SYSTEM EVALUATION
                </div>
              </div>

              {/* Feature 2 */}
              <div className="panel border border-border-strong p-6 bg-bg-primary flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 border border-text-primary bg-bg-secondary flex items-center justify-center mb-4">
                    <Trophy size={20} className="text-accent" />
                  </div>
                  <h4 className="font-bold text-base uppercase tracking-tight text-text-primary mb-2">
                    Hackathon Radar
                  </h4>
                  <p className="text-xs text-text-secondary font-serif leading-relaxed">
                    Live multi-day sprint monitoring. Tracks overarching hackathon entries in a dedicated radar without congesting your daily task queue.
                  </p>
                </div>
                <div className="pt-4 mt-6 border-t border-border-subtle font-mono text-3xs text-text-muted">
                  SPRINT RADAR • COMPETENCY EXP BOOST
                </div>
              </div>

              {/* Feature 3 */}
              <div className="panel border border-border-strong p-6 bg-bg-primary flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 border border-text-primary bg-bg-secondary flex items-center justify-center mb-4">
                    <Layers size={20} className="text-text-primary" />
                  </div>
                  <h4 className="font-bold text-base uppercase tracking-tight text-text-primary mb-2">
                    Smart Collections
                  </h4>
                  <p className="text-xs text-text-secondary font-serif leading-relaxed">
                    Dynamic problem curation. Filter candidate tasks by "Quick Wins", "Weak Patterns", or company-specific preparation pipelines.
                  </p>
                </div>
                <div className="pt-4 mt-6 border-t border-border-subtle font-mono text-3xs text-text-muted">
                  DYNAMIC SMART LISTS • COMPANY TARGETS
                </div>
              </div>

              {/* Feature 4 */}
              <div className="panel border border-border-strong p-6 bg-bg-primary flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 border border-text-primary bg-bg-secondary flex items-center justify-center mb-4">
                    <Activity size={20} className="text-text-primary" />
                  </div>
                  <h4 className="font-bold text-base uppercase tracking-tight text-text-primary mb-2">
                    Weekly Activity Grids
                  </h4>
                  <p className="text-xs text-text-secondary font-serif leading-relaxed">
                    Visual heatmaps calculated strictly in Monday–Sunday local calendar time to keep daily consistency uncompromised across all three realms.
                  </p>
                </div>
                <div className="pt-4 mt-6 border-t border-border-subtle font-mono text-3xs text-text-muted">
                  LOCAL TIME TELEMETRY • ACTIVITY INTENSITY
                </div>
              </div>

              {/* Feature 5: Rewards & Insignia Vault */}
              <div className="panel border border-border-strong p-6 bg-bg-primary flex flex-col justify-between group hover:border-rpg-gold transition-colors">
                <div>
                  <div className="w-10 h-10 border border-border-strong bg-bg-secondary flex items-center justify-center mb-4 group-hover:border-rpg-gold transition-colors">
                    <Trophy size={20} className="text-rpg-gold" />
                  </div>
                  <h4 className="font-bold text-base uppercase tracking-tight text-text-primary mb-2 font-cinzel">
                    Rewards & Insignia Vault
                  </h4>
                  <p className="text-xs text-text-secondary font-serif leading-relaxed">
                    Earn legendary protagonist titles, realm milestone badges, and insignia honors. Equip titles like "The Architect" or "S-Tier Hunter" to customize your operator card.
                  </p>
                </div>
                <div className="pt-4 mt-6 border-t border-border-subtle font-mono text-3xs text-rpg-gold font-bold">
                  EQUIPPABLE TITLES • BADGES • INSIGNIAS
                </div>
              </div>

              {/* Feature 6 */}
              <div className="panel border border-border-strong p-6 bg-bg-primary flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 border border-text-primary bg-bg-secondary flex items-center justify-center mb-4">
                    <Shield size={20} className="text-text-primary" />
                  </div>
                  <h4 className="font-bold text-base uppercase tracking-tight text-text-primary mb-2">
                    Strict S-Gate Validation
                  </h4>
                  <p className="text-xs text-text-secondary font-serif leading-relaxed">
                    Ascending to S-Tier requires breaking through concrete algorithmic gates. No inflated XP progression or vanity metrics.
                  </p>
                </div>
                <div className="pt-4 mt-6 border-t border-border-subtle font-mono text-3xs text-text-muted">
                  RIGOROUS GATES • UNCOMPROMISED STANDARDS
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* BOTTOM COMMAND ACTION BANNER */}
        <section className="px-6 sm:px-12 py-20 bg-bg-primary text-center">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            
            <span className="label text-accent mb-4 block">CLEARANCE PROTOCOL READY</span>
            
            <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-text-primary mb-6">
              Initialize Your Command Console
            </h2>

            <p className="text-base sm:text-lg text-text-secondary font-serif italic max-w-xl mb-10">
              Transform unstructured ambition into mathematical mastery across Career, Health, and Personal realms.
            </p>

            <Link 
              to={isAuthenticated ? "/life" : "/auth"} 
              className="btn-primary text-base px-10 py-4 uppercase tracking-widest font-mono font-bold shadow-sm"
            >
              <Terminal size={20} /> 
              <span>{isAuthenticated ? 'Open Command Center' : 'Access Console'}</span>
            </Link>

          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t-2 border-text-primary bg-bg-secondary py-6 px-8 font-mono text-3xs text-text-secondary uppercase tracking-widest">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-primary">JARVIS</span>
            <span>// AUTONOMOUS LIFE PROGRESSION SYSTEM</span>
          </div>
          <div>
            <span>DISTRIBUTED LOCAL-FIRST ARCHITECTURE • S-TIER CLEARANCE</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
