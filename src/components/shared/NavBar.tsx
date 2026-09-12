import { Link, useLocation } from 'react-router-dom';
import { LogOut, Terminal, Activity, Target, Folder, Layers, HeartPulse, Brain, Menu, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useState, useEffect } from 'react';

export function NavBar() {
  const location = useLocation();
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
        setCareerStreak(calcStreakFromDates(cExpData.map(l => l.awarded_at)));
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
        setHealthStreak(calcStreakFromDates(hExpData.map(l => l.awarded_at)));
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
        setPersonalStreak(calcStreakFromDates(pExpData.map(l => l.awarded_at)));
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

  const calcStreakFromDates = (dateStrings: string[]): number => {
    const distinctDates = Array.from(new Set(
      dateStrings.map(ds => {
        const d = new Date(ds);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    ));

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

    let checkDate = today;
    let checkDateStr = todayStr;
    let streak = 0;
    
    if (!distinctDates.includes(todayStr) && distinctDates.includes(yesterdayStr)) {
      checkDate = yesterday;
      checkDateStr = yesterdayStr;
    }

    while (distinctDates.includes(checkDateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
      checkDateStr = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
    }
    return streak;
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

  const path = location.pathname;

  // Detect Active Top Domain
  const isLifeDomain = path === '/life' || path === '/life-map' || path === '/';
  const isHealthDomain = path.startsWith('/health');
  const isPersonalDomain = path.startsWith('/personal');
  const isCareerDomain = !isLifeDomain && !isHealthDomain && !isPersonalDomain;

  // Career Sub-routes
  const isDashboard = path === '/dashboard';
  const isStatus = path === '/status';
  const isHuntLog = path === '/hunt-log';
  const isCollections = path.startsWith('/collections');

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    { name: 'Hunt Log', path: '/hunt-log', icon: Target, active: isHuntLog },
    { name: 'Collections', path: '/collections', icon: Folder, active: isCollections },
  ];

  if (isLifeDomain) {
    currentSubLinks = [
      { name: 'Life Map', path: '/life', icon: Layers, active: isLifeDomain },
    ];
  } else if (isHealthDomain) {
    currentSubLinks = [
      { name: 'Health Protocols', path: '/health', icon: HeartPulse, active: isHealthDomain },
    ];
  } else if (isPersonalDomain) {
    currentSubLinks = [
      { name: 'Personal Mastery', path: '/personal', icon: Brain, active: isPersonalDomain },
    ];
  }

  // Active domain telemetry readout
  const activeStreak = isHealthDomain ? healthStreak : isPersonalDomain ? personalStreak : careerStreak;
  const activeRank = isHealthDomain ? healthRank : isPersonalDomain ? personalRank : careerRank;
  const activeRankLabel = isHealthDomain ? 'Vanguard' : isPersonalDomain ? 'Polymath' : 'Hunter';

  return (
    <>
      <nav className="sticky top-0 z-50 bg-bg-primary border-b-2 border-text-primary">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Primary Domain Switcher */}
          <div className="flex items-center gap-8 h-full">
            <Link to="/life" className="flex items-center gap-3 group">
              <div className="w-3 h-3 bg-text-primary group-hover:bg-accent transition-colors" />
              <span className="text-xl font-black uppercase tracking-tighter text-text-primary">JARVIS</span>
            </Link>

            {/* Top Domain Switcher Tabs */}
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
          </div>

          {/* Sub-Nav for Current Domain */}
          <div className="hidden md:flex items-center gap-6 h-full">
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

          {/* Domain-specific User Actions */}
          <div className="hidden md:flex items-center gap-6">
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

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-text-primary hover:bg-bg-tertiary border border-border-strong"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-bg-secondary border-b-2 border-text-primary px-6 py-4 flex flex-col gap-4">
            <div className="label text-accent">Switch Domain</div>
            <div className="grid grid-cols-2 gap-2">
              {topDomainTabs.map(tab => (
                <Link
                  key={tab.name}
                  to={tab.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 text-xs font-mono font-bold uppercase flex items-center gap-2 border ${
                    tab.active ? 'bg-text-primary text-bg-primary border-text-primary' : 'border-border-strong text-text-secondary'
                  }`}
                >
                  <tab.icon size={13} />
                  <span>{tab.name}</span>
                </Link>
              ))}
            </div>

            <div className="label text-text-muted mt-2 border-t border-border-subtle pt-3">Navigation</div>
            <div className="flex flex-col gap-2">
              {currentSubLinks.map(link => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 px-3 text-xs font-mono font-bold uppercase flex items-center gap-2 ${
                    link.active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  <link.icon size={14} className={link.active ? 'text-accent' : ''} />
                  <span>{link.name}</span>
                </Link>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border-subtle pt-3 text-xs font-mono">
              <span className="text-text-secondary">Active Rank: <strong className="text-accent">{activeRank}</strong></span>
              <button
                onClick={handleLogout}
                className="text-xs font-mono font-bold uppercase text-accent hover:underline flex items-center gap-1"
              >
                <LogOut size={12} /> Disconnect
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
