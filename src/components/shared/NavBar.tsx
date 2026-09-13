import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Activity, Target, Folder, Layers, HeartPulse, Brain, Menu, X, Compass, Trophy, Award, Flame } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useState, useEffect } from 'react';
import { calculateCalendarStreak } from '../../lib/domainTelemetry';
import { playSolenoidClick } from '../../lib/mechanicalAudio';

export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Career telemetry
  const [careerStreak, setCareerStreak] = useState(0);
  const [careerRank, setCareerRank] = useState('E');

  // Health telemetry
  const [healthRank, setHealthRank] = useState('E');
  const [healthStreak, setHealthStreak] = useState(0);

  // Personal telemetry
  const [personalRank, setPersonalRank] = useState('E');
  const [personalStreak, setPersonalStreak] = useState(0);

  const fetchAllNavStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Career stats & streak
      const { data: cExpData } = await supabase
        .from('exp_log')
        .select('awarded_at')
        .eq('user_id', user.id)
        .order('awarded_at', { ascending: false });

      if (cExpData && cExpData.length > 0) {
        setCareerStreak(calculateCalendarStreak(cExpData.map(l => l.awarded_at)));
      }

      const { data: cStatsData } = await supabase
        .from('stats')
        .select('rank')
        .eq('user_id', user.id);

      if (cStatsData) {
        let highest = 'E';
        const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];
        cStatsData.forEach((row: any) => {
          if (row.rank && ranks.indexOf(row.rank) > ranks.indexOf(highest)) {
            highest = row.rank;
          }
        });
        setCareerRank(highest);
      }

      // 2. Fetch Health stats & streak
      const { data: hExpData } = await supabase
        .from('health_exp_log')
        .select('awarded_at')
        .eq('user_id', user.id)
        .order('awarded_at', { ascending: false });

      if (hExpData && hExpData.length > 0) {
        setHealthStreak(calculateCalendarStreak(hExpData.map(l => l.awarded_at)));
      }

      const { data: hStatsData } = await supabase
        .from('health_stats')
        .select('rank')
        .eq('user_id', user.id);

      if (hStatsData && hStatsData.length > 0) {
        let highest = 'E';
        const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];
        hStatsData.forEach((row: any) => {
          if (row.rank && ranks.indexOf(row.rank) > ranks.indexOf(highest)) {
            highest = row.rank;
          }
        });
        setHealthRank(highest);
      }

      // 3. Fetch Personal stats & streak
      const { data: pExpData } = await supabase
        .from('personal_exp_log')
        .select('awarded_at')
        .eq('user_id', user.id)
        .order('awarded_at', { ascending: false });

      if (pExpData && pExpData.length > 0) {
        setPersonalStreak(calculateCalendarStreak(pExpData.map(l => l.awarded_at)));
      }

      const { data: pStatsData } = await supabase
        .from('personal_stats')
        .select('rank')
        .eq('user_id', user.id);

      if (pStatsData && pStatsData.length > 0) {
        let highest = 'E';
        const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];
        pStatsData.forEach((row: any) => {
          if (row.rank && ranks.indexOf(row.rank) > ranks.indexOf(highest)) {
            highest = row.rank;
          }
        });
        setPersonalRank(highest);
      }

    } catch (err) {
      console.error('NavBar fetch error:', err);
    }
  };

  useEffect(() => {
    fetchAllNavStats();
    
    const handleUpdate = () => fetchAllNavStats();
    window.addEventListener('exp-awarded', handleUpdate);
    window.addEventListener('health-exp-awarded', handleUpdate);
    window.addEventListener('personal-exp-awarded', handleUpdate);
    return () => {
      window.removeEventListener('exp-awarded', handleUpdate);
      window.removeEventListener('health-exp-awarded', handleUpdate);
      window.removeEventListener('personal-exp-awarded', handleUpdate);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const queryDomain = searchParams.get('domain');

  const isHuntLog = path === '/hunt-log';

  // Detect Active Top Domain
  const isRewardsDomain = path.startsWith('/rewards');
  const isHealthDomain = path.startsWith('/health') || (isHuntLog && queryDomain === 'health');
  const isPersonalDomain = path.startsWith('/personal') || (isHuntLog && queryDomain === 'personal');
  const isLifeDomain = (path === '/life' || path === '/life-map' || path === '/') || (isHuntLog && (queryDomain === 'all' || queryDomain === 'life'));
  const isCareerDomain = !isLifeDomain && !isHealthDomain && !isPersonalDomain && !isRewardsDomain;

  // Career Sub-routes
  const isDashboard = path === '/dashboard';
  const isStatus = path === '/status';
  const isCollections = path.startsWith('/collections');

  const handleLogout = async () => {
    playSolenoidClick();
    await supabase.auth.signOut();
    navigate('/landing');
  };

  // 1. Top Domain Switcher Tabs (RPG Realms + Rewards)
  const topDomainTabs = [
    { name: 'World', path: '/life', active: isLifeDomain, icon: Compass },
    { name: 'Career', path: '/dashboard', active: isCareerDomain, icon: Target },
    { name: 'Health', path: '/health', active: isHealthDomain, icon: HeartPulse },
    { name: 'Personal', path: '/personal', active: isPersonalDomain, icon: Brain },
    { name: 'Rewards', path: '/rewards', active: isRewardsDomain, icon: Trophy },
  ];

  // 2. Contextual Domain Breadcrumbs
  const domainBreadcrumbs: Record<string, string> = {
    career: 'CAREER REALM // OPERATIONAL SUBSYSTEMS',
    health: 'HEALTH REALM // BIOMETRIC & EXERTION LEDGER',
    personal: 'PERSONAL REALM // INTELLECT & CRAFT ENGINE',
    life: 'WORLD CONCORDAT // MULTI-REALM MONARCH MATRIX',
    rewards: 'GLORY VAULT // TITLES, INSIGNIAS & ACHIEVEMENTS',
  };

  const activeDomainKey = isHealthDomain
    ? 'health'
    : isPersonalDomain
    ? 'personal'
    : isLifeDomain
    ? 'life'
    : isRewardsDomain
    ? 'rewards'
    : 'career';

  // 3. Current Sub-navigation links based on active domain
  let currentSubLinks = [
    { name: 'Quests', path: '/dashboard', icon: Target, active: isDashboard },
    { name: 'Trials & Rank', path: '/status', icon: Activity, active: isStatus },
    { name: 'Quest Log', path: '/hunt-log?domain=career', icon: Award, active: isHuntLog && queryDomain === 'career' },
    { name: 'Collections', path: '/collections', icon: Folder, active: isCollections },
  ];

  if (isLifeDomain) {
    currentSubLinks = [
      { name: 'Character Matrix', path: '/life', icon: Layers, active: !isHuntLog },
      { name: 'Unified Log', path: '/hunt-log?domain=all', icon: Target, active: isHuntLog && (!queryDomain || queryDomain === 'all' || queryDomain === 'life') },
    ];
  } else if (isHealthDomain) {
    currentSubLinks = [
      { name: 'Daily Protocols', path: '/health', icon: HeartPulse, active: !isHuntLog },
      { name: 'Health Log', path: '/hunt-log?domain=health', icon: Target, active: isHuntLog && queryDomain === 'health' },
    ];
  } else if (isPersonalDomain) {
    currentSubLinks = [
      { name: 'Daily Pursuits', path: '/personal', icon: Brain, active: !isHuntLog },
      { name: 'Personal Log', path: '/hunt-log?domain=personal', icon: Target, active: isHuntLog && queryDomain === 'personal' },
    ];
  } else if (isRewardsDomain) {
    currentSubLinks = [
      { name: 'Vault & Insignias', path: '/rewards', icon: Trophy, active: true },
    ];
  }

  // Active domain telemetry readout
  const activeStreak = isHealthDomain ? healthStreak : isPersonalDomain ? personalStreak : careerStreak;
  const activeRank = isHealthDomain ? healthRank : isPersonalDomain ? personalRank : careerRank;
  const activeRankLabel = isHealthDomain ? 'Vanguard' : isPersonalDomain ? 'Polymath' : isLifeDomain ? 'Hunter' : isRewardsDomain ? 'Glory' : 'Hunter';

  return (
    <>
      <nav className="sticky top-0 z-50 bg-bg-primary/95 backdrop-blur-md border-b border-border-strong select-none">
        
        {/* ========================================================================= */}
        {/* TIER 1: GLOBAL REALM HUB (Desktop lg+ / 46px)                             */}
        {/* ========================================================================= */}
        <div className="hidden lg:block border-b border-border-subtle">
          <div className="max-w-[1600px] mx-auto px-6 h-[46px] flex items-center justify-between">
            
            {/* Brand Monogram & System Identifier */}
            <div className="flex items-center gap-3">
              <Link 
                to="/life" 
                className="flex items-center gap-2.5 group cursor-pointer"
                onClick={() => playSolenoidClick()}
              >
                <div className="w-3 h-3 bg-accent shadow-[0_0_8px_rgba(194,89,52,0.4)] group-hover:bg-accent-hover transition-colors rotate-45" />
                <span className="text-lg font-black font-cinzel tracking-tight text-text-primary uppercase">
                  JARVIS
                </span>
              </Link>
              <span className="text-border-strong font-mono text-xs">•</span>
              <div className="inline-flex items-center gap-1.5 text-3xs font-mono uppercase tracking-widest px-2 py-0.5 bg-bg-secondary border border-border-subtle text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span>SYSTEM V3.2 // MONARCH</span>
              </div>
            </div>

            {/* 5 Primary Realms Segmented Pill Bar */}
            <div className="flex items-center bg-bg-tertiary/70 p-0.5 border border-border-strong shadow-xs">
              {topDomainTabs.map(tab => (
                <Link
                  key={tab.name}
                  to={tab.path}
                  onClick={() => playSolenoidClick()}
                  className={`px-3 py-1 text-2xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    tab.active
                      ? 'bg-accent text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary/60'
                  }`}
                >
                  <tab.icon size={12} className={tab.active ? 'text-white' : 'text-accent'} />
                  <span>{tab.name}</span>
                </Link>
              ))}
            </div>

            {/* Consolidated Tactical Status HUD & Session Control */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 px-3 py-1 bg-bg-secondary border border-border-strong text-2xs font-mono shadow-xs">
                <div className="flex items-center gap-1.5">
                  <Flame size={12} className="text-accent" />
                  <span className="text-text-muted text-3xs uppercase tracking-wider">Streak</span>
                  <span className="font-bold text-text-primary">{activeStreak > 0 ? `${activeStreak}D` : '—'}</span>
                </div>

                <span className="text-border-strong">•</span>

                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted text-3xs uppercase tracking-wider">{activeRankLabel}</span>
                  <span className="font-black text-accent border border-accent/40 bg-accent/10 px-1.5 py-0.2 shadow-xs">
                    {activeRank}
                  </span>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="text-2xs font-mono font-bold uppercase tracking-wider text-text-muted hover:text-crimson hover:bg-crimson/10 border border-transparent hover:border-crimson/30 px-2.5 py-1 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Disconnect Session"
              >
                <LogOut size={12} />
                <span>Exit</span>
              </button>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* TIER 2: CONTEXTUAL REALM SUB-BAR (Desktop lg+ / 36px)                     */}
        {/* ========================================================================= */}
        <div className="hidden lg:block bg-bg-secondary/90 backdrop-blur-md">
          <div className="max-w-[1600px] mx-auto px-6 h-[36px] flex items-center justify-between">
            
            {/* Realm Breadcrumb & Views Tabs */}
            <div className="flex items-center gap-4 h-full">
              <span className="text-3xs font-mono uppercase tracking-widest text-text-muted font-bold whitespace-nowrap">
                {domainBreadcrumbs[activeDomainKey]}
              </span>

              <span className="text-border-strong font-mono text-xs">•</span>

              <div className="flex items-center gap-1 h-full">
                {currentSubLinks.map(link => (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => playSolenoidClick()}
                    className={`h-full px-3 text-2xs font-mono uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                      link.active
                        ? 'border-accent text-accent font-bold bg-accent/5'
                        : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-strong'
                    }`}
                  >
                    <link.icon size={12} className={link.active ? 'text-accent' : 'text-text-muted'} />
                    <span>{link.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Live Telemetry & Security Heartbeat */}
            <div className="flex items-center gap-2 text-3xs font-mono uppercase tracking-widest text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="hidden xl:inline">SYSTEM ACTIVE</span>
              <span className="text-border-strong">•</span>
              <span className="text-success font-bold">100% PRIVATE ARCHITECTURE</span>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE & TABLET HEADER (< lg / 54px)                                      */}
        {/* ========================================================================= */}
        <div className="flex lg:hidden items-center justify-between px-4 h-[54px]">
          
          {/* Logo & Active Realm Indicator */}
          <div className="flex items-center gap-2.5">
            <Link 
              to="/life" 
              className="flex items-center gap-2 group cursor-pointer"
              onClick={() => {
                playSolenoidClick();
                setMobileMenuOpen(false);
              }}
            >
              <div className="w-3 h-3 bg-accent rotate-45" />
              <span className="text-base font-black font-cinzel tracking-tight text-text-primary uppercase">
                JARVIS
              </span>
            </Link>
            <span className="text-border-strong font-mono text-xs">•</span>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-bg-secondary border border-border-strong text-3xs font-mono uppercase font-bold text-accent shadow-xs">
              <span>{topDomainTabs.find(t => t.active)?.name || 'World'}</span>
              <span>•</span>
              <span>RANK {activeRank}</span>
            </div>
          </div>

          {/* Controls: Streak & Drawer Toggle */}
          <div className="flex items-center gap-2.5">
            {activeStreak > 0 && (
              <div className="flex items-center gap-1 font-mono text-3xs font-bold uppercase tracking-wider px-2 py-1 bg-bg-secondary border border-border-strong shadow-xs">
                <Flame size={11} className="text-accent" />
                <span className="text-text-primary">{activeStreak}D</span>
              </div>
            )}

            <button
              onClick={() => {
                playSolenoidClick();
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className={`p-1.5 transition-colors border cursor-pointer ${
                mobileMenuOpen 
                  ? 'bg-accent text-white border-accent' 
                  : 'text-text-primary hover:bg-bg-secondary border-border-strong'
              }`}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* MOBILE NAVIGATION DRAWER & BACKDROP (< lg)                                */}
        {/* ========================================================================= */}
        {mobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 top-[54px] bg-[#111111]/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => {
                playSolenoidClick();
                setMobileMenuOpen(false);
              }}
              aria-hidden="true"
            />

            <div 
              id="mobile-nav-drawer"
              className="fixed top-[54px] left-0 right-0 max-h-[calc(100vh-54px)] overflow-y-auto bg-bg-secondary border-b-2 border-border-strong shadow-2xl z-50 lg:hidden px-5 py-5 flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              {/* 1. Protagonist Status Capsule */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-bg-tertiary border border-border-strong text-xs font-mono">
                <div>
                  <span className="text-3xs uppercase tracking-wider text-text-muted block">Active Domain</span>
                  <span className="text-sm font-bold text-accent flex items-center gap-1.5">
                    <span>{topDomainTabs.find(t => t.active)?.name}</span>
                    <span className="text-border-strong">•</span>
                    <span>RANK {activeRank}</span>
                  </span>
                </div>
                <div className="text-right border-l border-border-subtle pl-3">
                  <span className="text-3xs uppercase tracking-wider text-text-muted block">Active Streak</span>
                  <span className="text-sm font-bold text-text-primary">{activeStreak > 0 ? `${activeStreak} DAYS` : '0 DAYS'}</span>
                </div>
              </div>

              {/* 2. Realm Selection Matrix (5 Realms) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="label text-accent">Select Realm</span>
                  <span className="text-3xs font-mono uppercase text-text-muted">3 Worlds • 1 Matrix</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {topDomainTabs.map(tab => {
                    const tabStreak = tab.name === 'Health' ? healthStreak : tab.name === 'Personal' ? personalStreak : tab.name === 'Career' ? careerStreak : 0;
                    const tabRank = tab.name === 'Health' ? healthRank : tab.name === 'Personal' ? personalRank : tab.name === 'Career' ? careerRank : null;

                    return (
                      <Link
                        key={tab.name}
                        to={tab.path}
                        onClick={() => {
                          playSolenoidClick();
                          setMobileMenuOpen(false);
                        }}
                        className={`p-2.5 text-xs font-mono font-bold uppercase flex flex-col justify-between gap-1.5 border transition-all cursor-pointer ${
                          tab.active 
                            ? 'bg-accent text-white border-accent shadow-xs' 
                            : 'bg-bg-tertiary border-border-strong text-text-secondary hover:text-text-primary hover:border-accent'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5">
                            <tab.icon size={13} className={tab.active ? 'text-white' : 'text-accent'} />
                            <span className="font-sans font-bold text-xs tracking-tight">{tab.name}</span>
                          </div>
                          {tab.active && (
                            <span className="w-1.5 h-1.5 bg-white" />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-3xs opacity-80 pt-1 border-t border-current/10">
                          <span>{tabRank ? `R:${tabRank}` : 'BASE'}</span>
                          {tabStreak > 0 && <span>{tabStreak}D</span>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* 3. Active Realm Sub-Views */}
              <div>
                <div className="flex items-center justify-between mb-2.5 border-t border-border-strong pt-4">
                  <span className="label text-text-muted">
                    {topDomainTabs.find(t => t.active)?.name} Subsystems
                  </span>
                  <span className="text-3xs font-mono uppercase text-text-muted font-bold">
                    {currentSubLinks.length} Views
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {currentSubLinks.map(link => (
                    <Link
                      key={link.name}
                      to={link.path}
                      onClick={() => {
                        playSolenoidClick();
                        setMobileMenuOpen(false);
                      }}
                      className={`py-2.5 px-3 text-xs font-mono font-bold uppercase flex items-center justify-between border transition-colors cursor-pointer ${
                        link.active 
                          ? 'bg-bg-tertiary text-accent border-accent' 
                          : 'bg-bg-primary/50 text-text-secondary border-border-subtle hover:text-text-primary hover:border-border-strong'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <link.icon size={13} className={link.active ? 'text-accent' : 'text-text-muted'} />
                        <span className="tracking-wider">{link.name}</span>
                      </div>
                      <span className="text-2xs text-text-muted">→</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* 4. Session Control */}
              <div className="border-t border-border-strong pt-3">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="btn-secondary w-full text-xs font-mono font-bold uppercase tracking-widest text-crimson hover:border-crimson flex items-center justify-center gap-2 px-3 py-2 cursor-pointer"
                >
                  <LogOut size={13} /> Disconnect Session
                </button>
              </div>

            </div>
          </>
        )}
      </nav>
    </>
  );
}
