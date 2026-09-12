import { Link } from 'react-router-dom';
import { Activity, Shield, Target, Terminal } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary overflow-hidden flex flex-col relative font-sans">

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-8 py-24 border-x-2 border-text-primary max-w-[1400px] mx-auto w-full">
        
        {/* Hero Section */}
        <div className="text-center max-w-5xl mx-auto mb-24 border-b-4 border-text-primary pb-16">
          <div className="flex items-center justify-center gap-3 mb-8 border border-border-strong inline-flex px-4 py-1.5 bg-bg-secondary">
            <div className="w-2 h-2 bg-success"></div>
            <div className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary">System Status: Online</div>
          </div>
          
          <h1 className="text-7xl md:text-[9rem] font-black tracking-tighter text-text-primary mb-8 leading-none uppercase">
            Jarvis
          </h1>
          
          <p className="text-xl md:text-2xl text-text-secondary max-w-3xl mx-auto mb-12 leading-relaxed font-serif italic">
            The elite competency tracker. Elevate your engineering path through rigorous tracking, dynamic ranking, and S-Tier placement readiness.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/dashboard" className="btn-primary text-xl px-12 py-5 uppercase tracking-widest font-bold">
              <span className="flex items-center gap-3">
                <Terminal size={24} /> Access Console
              </span>
            </Link>
          </div>
        </div>

        {/* System Features */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-text-primary bg-text-primary">
          
          {/* Card 1 */}
          <div className="p-10 relative overflow-hidden group bg-bg-primary hover:bg-bg-secondary transition-colors border-r-2 border-text-primary last:border-r-0">
            <div className="mb-8">
              <Target size={48} className="text-text-primary" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight mb-4 border-b-2 border-text-primary pb-4">6 Core Domains</h3>
            <p className="text-base text-text-secondary leading-relaxed font-serif">
              Track mastery across LeetCode, Projects, Hackathons, Coursework, Learning, and General operations. Specialized EXP algorithms reward consistency.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-10 relative overflow-hidden group bg-bg-primary hover:bg-bg-secondary transition-colors border-r-2 border-text-primary last:border-r-0">
            <div className="mb-8">
              <Activity size={48} className="text-text-primary" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight mb-4 border-b-2 border-text-primary pb-4">Dynamic Ranking</h3>
            <p className="text-base text-text-secondary leading-relaxed font-serif">
              Ascend from E-Tier to S-Tier in every domain. Your highest rank dictates your Jarvis Class. S-Tier requires breaking through explicit competency S-Gates.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-10 relative overflow-hidden group bg-bg-primary hover:bg-bg-secondary transition-colors border-r-2 border-text-primary last:border-r-0">
            <div className="mb-8">
              <Shield size={48} className="text-text-primary" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight mb-4 border-b-2 border-text-primary pb-4">Placement Readiness</h3>
            <p className="text-base text-text-secondary leading-relaxed font-serif">
              Real-time 0-100 gauge synthesizing your domain mastery into a singular career readiness metric. Don't leave your placement to chance.
            </p>
          </div>

        </div>
      </div>
      
      {/* Footer minimal */}
      <div className="py-8 text-center border-t-2 border-text-primary bg-bg-secondary relative z-10 font-mono">
        <span className="text-xs text-text-secondary font-bold uppercase tracking-widest">
          JARVIS V1.0 // AUTHORIZED PERSONNEL ONLY
        </span>
      </div>
    </div>
  );
}
