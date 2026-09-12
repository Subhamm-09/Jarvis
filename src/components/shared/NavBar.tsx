import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Terminal, Activity, Target, Folder, Layers, HeartPulse, Brain, Menu, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useState, useEffect } from 'react';
import { calculateCalendarStreak } from '../../lib/domainTelemetry';

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
  const isHealthDomain = path.startsWith('/health') || (isHuntLog && queryDomain === 'health');
  const isPersonalDomain = path.startsWith('/personal') || (isHuntLog && queryDomain === 'personal');
  const isLifeDomain = (path === '/life' || path === '/life-map' || path === '/') || (isHuntLog && (queryDomain === 'all' || queryDomain === 'life'));
  const isCareerDomain = !isLifeDomain && !isHealthDomain && !isPersonalDomain;

  // Career Sub-routes
  const isDashboard = path === '/dashboard';
  const isStatus = path === '/status';
  const isCollections = path.startsWith('/collections');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/landing');
  };

  // Top Domain Switcher Tabs
  const topDomainTabs = [
    { name: 'Life', path: '/life', active: isLifeDomain, icon: Layers },
    { name: 'Career', path: '/dashboard', active: isCareerDomain, icon: Terminal },
    { name: 'Health', path: '/health', active: isHealthDomain, icon: HeartPulse },
    { name: 'Personal', path: '/personal', active: isPersonalDomain, icon: Brain },
  ];

  // Current Sub-navigation links based on active domain
  let currentSubLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: Terminal, active: isDashboard },
    { name: 'Status Report', path: '/status', icon: Activity, active: isStatus },
    { name: 'Hunt Log', path: '/hunt-log?domain=career', icon: Target, active: isHuntLog && queryDomain === 'career' },
    { name: 'Collections', path: '/collections', icon: Folder, active: isCollections },
  ];

  if (isLifeDomain) {
    currentSubLinks = [
      { name: 'Life Map', path: '/life', icon: Layers, active: !isHuntLog },
      { name: 'Unified Log', path: '/hunt-log?domain=all', icon: Target, active: isHuntLog && (!queryDomain || queryDomain === 'all' || queryDomain === 'life') },
    ];
  } else if (isHealthDomain) {
    currentSubLinks = [
      { name: 'Health Protocols', path: '/health', icon: HeartPulse, active: !isHuntLog },
      { name: 'Protocol Log', path: '/hunt-log?domain=health', icon: Target, active: isHuntLog && queryDomain === 'health' },
    ];
  } else if (isPersonalDomain) {
    currentSubLinks = [
      { name: 'Personal Mastery', path: '/personal', icon: Brain, active: !isHuntLog },
      { name: 'Mastery Log', path: '/hunt-log?domain=personal', icon: Target, active: isHuntLog && queryDomain === 'personal' },
    ];
  }

  // Active domain telemetry readout
  const activeStreak = isHealthDomain ? healthStreak : isPersonalDomain ? personalStreak : careerStreak;
  const activeRank = isHealthDomain ? healthRank : isPersonalDomain ? personalRank : careerRank;
  const activeRankLabel = isHealthDomain ? 'Vanguard' : isPersonalDomain ? 'Polymath' : isLifeDomain ? 'Operator' : 'Hunter';

  return (
    <>
      <nav className="sticky top-0 z-50 bg-bg-primary border-b-2 border-text-primary">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Primary Domain Switcher */}
          <div className="flex items-center gap-4 lg:gap-8 h-full">
            <Link 
              to="/landing" 
              className="flex items-center gap-2.5 sm:gap-3 group"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="w-3 h-3 bg-text-primary group-hover:bg-accent transition-colors" />
              <span className="text-xl font-black uppercase tracking-tighter text-text-primary">JARVIS</span>
            </Link>

            {/* Top Domain Switcher Tabs (Desktop lg+) */}
            <div className="hidden lg:flex items-center gap-1 bg-bg-tertiary p-1 border border-border-strong rounded-none">
              {topDomainTabs.map(tab => (
                <Link
                  key={tab.name}
                  to={tab.path}
                  className={`px-3 py-1 text-2xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    tab.active
                      ? 'bg-text-primary text-bg-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
                  }`}
                >
                  <tab.icon size={12} className={tab.active ? 'text-accent' : ''} />
                  <span>{tab.name}</span>
                </Link>
              ))}
            </div>

            {/* Active Domain Indicator (Mobile & Tablet < lg) */}
            <div className="flex lg:hidden items-center gap-2 font-mono text-2xs uppercase tracking-widest text-text-secondary border-l border-border-strong pl-3">
              <span className="text-text-primary font-bold">{topDomainTabs.find(t => t.active)?.name || 'Domain'}</span>
              <span className="text-accent">•</span>
              <span className="text-accent font-bold">{activeRank}</span>
            </div>
          </div>

          {/* Sub-Nav for Current Domain (Desktop lg+) */}
          <div className="hidden lg:flex items-center gap-6 h-full">
            {currentSubLinks.map(link => (
              <Link 
                key={link.name}
                to={link.path}
                className={`flex items-center gap-2 h-full px-2 border-b-4 transition-colors font-mono text-xs font-bold tracking-widest uppercase ${
                  link.active 
                    ? 'border-text-primary text-text-primary' 
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
                }`}
              >
                <link.icon size={13} className={link.active ? 'text-accent' : ''} />
                {link.name}
              </Link>
            ))}
          </div>

          {/* Domain-specific User Actions (Desktop lg+) */}
          <div className="hidden lg:flex items-center gap-6">
            <div className="text-right flex items-center gap-2 border-r-2 border-border-strong pr-6">
              <span className="label">Streak</span>
              <span className="text-sm font-bold text-text-primary font-mono">{activeStreak > 0 ? activeStreak : '—'}</span>
            </div>
            <div className="flex items-center gap-2 border-r-2 border-border-strong pr-6">
              <span className="label">{activeRankLabel} Rank</span>
              <span className="text-sm font-bold text-accent font-mono">{activeRank}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary hover:text-accent transition-colors flex items-center gap-2"
              title="End Session"
            >
              <LogOut size={14} /> Disconnect
            </button>
          </div>

          {/* Mobile & Tablet Controls (< lg) */}
          <div className="flex lg:hidden items-center gap-3">
            {/* Quick Streak badge on mobile/tablet */}
            {activeStreak > 0 && (
              <div className="flex items-center gap-1 font-mono text-2xs font-bold uppercase tracking-wider px-2 py-1 bg-bg-tertiary border border-border-strong">
                <span className="text-accent font-mono">STREAK</span>
                <span className="text-text-primary">{activeStreak}D</span>
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 transition-colors border ${
                mobileMenuOpen 
                  ? 'bg-text-primary text-bg-primary border-text-primary' 
                  : 'text-text-primary hover:bg-bg-tertiary border-border-strong'
              }`}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer & Backdrop (< lg) */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 top-16 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer Overlay */}
            <div 
              id="mobile-nav-drawer"
              className="fixed top-16 left-0 right-0 max-h-[calc(100vh-4rem)] overflow-y-auto bg-bg-secondary border-b-2 border-text-primary shadow-2xl z-50 lg:hidden px-6 py-6 flex flex-col gap-6"
            >
              {/* 1. DOMAIN SELECTOR */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="label text-accent">Select Domain</span>
                  <span className="text-3xs font-mono uppercase text-text-muted">4 Independent Domains</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {topDomainTabs.map(tab => {
                    const tabStreak = tab.name === 'Health' ? healthStreak : tab.name === 'Personal' ? personalStreak : tab.name === 'Career' ? careerStreak : 0;
                    const tabRank = tab.name === 'Health' ? healthRank : tab.name === 'Personal' ? personalRank : tab.name === 'Career' ? careerRank : null;

                    return (
                      <Link
                        key={tab.name}
                        to={tab.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`p-3 text-xs font-mono font-bold uppercase flex flex-col justify-between gap-2 border transition-all ${
                          tab.active 
                            ? 'bg-text-primary text-bg-primary border-text-primary shadow-sm' 
                            : 'bg-bg-primary border-border-strong text-text-secondary hover:text-text-primary hover:border-text-primary'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <tab.icon size={14} className={tab.active ? 'text-accent' : ''} />
                            <span className="font-sans font-bold text-sm tracking-tight">{tab.name}</span>
                          </div>
                          {tab.active && (
                            <span className="w-1.5 h-1.5 bg-accent" />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-2xs opacity-80 pt-1 border-t border-current/10">
                          <span>{tabRank ? `RANK ${tabRank}` : 'OVERVIEW'}</span>
                          {tabStreak > 0 && <span>{tabStreak}D</span>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* 2. ACTIVE DOMAIN NAVIGATION */}
              <div>
                <div className="flex items-center justify-between mb-3 border-t border-border-subtle pt-4">
                  <span className="label text-text-muted">
                    {topDomainTabs.find(t => t.active)?.name} Operations
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
                      onClick={() => setMobileMenuOpen(false)}
                      className={`py-3 px-4 text-xs font-mono font-bold uppercase flex items-center justify-between border transition-colors ${
                        link.active 
                          ? 'bg-bg-tertiary text-text-primary border-text-primary' 
                          : 'bg-bg-primary/50 text-text-secondary border-border-subtle hover:text-text-primary hover:border-border-strong'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <link.icon size={15} className={link.active ? 'text-accent' : 'text-text-muted'} />
                        <span className="tracking-wider">{link.name}</span>
                      </div>
                      <span className="text-2xs text-text-muted">→</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* 3. TELEMETRY & DISCONNECT */}
              <div className="border-t border-border-subtle pt-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 p-3 bg-bg-primary border border-border-strong text-xs font-mono">
                  <div>
                    <span className="text-3xs uppercase tracking-wider text-text-muted block">Active Rank</span>
                    <span className="text-sm font-bold text-accent">{activeRankLabel} • {activeRank}</span>
                  </div>
                  <div className="text-right border-l border-border-subtle pl-3">
                    <span className="text-3xs uppercase tracking-wider text-text-muted block">Active Streak</span>
                    <span className="text-sm font-bold text-text-primary">{activeStreak > 0 ? `${activeStreak} DAYS` : '0 DAYS'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="btn-secondary w-full text-xs font-mono font-bold uppercase tracking-widest text-accent hover:bg-accent hover:text-white flex items-center justify-center gap-2 px-3 py-2"
                  >
                    <LogOut size={13} /> Disconnect
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
}
