import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { NavBar } from './components/shared/NavBar';
import { TactileFeedbackHUD } from './components/shared/TactileFeedbackHUD';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

// Lazy-loaded routes for code-splitting and rapid initial bundle loading
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const HuntLogPage = lazy(() => import('./pages/HuntLogPage').then(m => ({ default: m.HuntLogPage })));
const StatusPage = lazy(() => import('./pages/StatusPage').then(m => ({ default: m.StatusPage })));
const CollectionsPage = lazy(() => import('./pages/CollectionsPage').then(m => ({ default: m.CollectionsPage })));
const CollectionDetailPage = lazy(() => import('./pages/CollectionDetailPage').then(m => ({ default: m.CollectionDetailPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LifeMapPage = lazy(() => import('./pages/LifeMapPage').then(m => ({ default: m.LifeMapPage })));
const HealthDashboardPage = lazy(() => import('./pages/HealthDashboardPage').then(m => ({ default: m.HealthDashboardPage })));
const PersonalDashboardPage = lazy(() => import('./pages/PersonalDashboardPage').then(m => ({ default: m.PersonalDashboardPage })));
const RewardsPage = lazy(() => import('./pages/RewardsPage').then(m => ({ default: m.RewardsPage })));

function RouteLoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center p-12 min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-2 h-2 bg-accent animate-ping" />
        <div className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary">
          INITIALIZING TELEMETRY...
        </div>
      </div>
    </div>
  );
}

function AppContent({ session }: { session: Session | null }) {
  const location = useLocation();
  const isAuthenticated = !!session;
  const isLanding = location.pathname === '/' || location.pathname === '/landing';
  const showNavBar = isAuthenticated && !isLanding;

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary">
      {showNavBar && <NavBar />}
      <TactileFeedbackHUD />
      
      <main className={`flex-1 flex flex-col ${showNavBar ? 'pt-[54px] lg:pt-[82px]' : ''}`}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Public Landing & Auth Routes */}
            <Route path="/" element={<LandingPage isAuthenticated={isAuthenticated} />} />
            <Route path="/landing" element={<LandingPage isAuthenticated={isAuthenticated} />} />
            <Route path="/auth" element={!isAuthenticated ? <AuthPage /> : <Navigate to="/life" />} />
            
            {/* Protected Routes */}
            <Route path="/life" element={isAuthenticated ? <LifeMapPage /> : <Navigate to="/auth" />} />
            <Route path="/life-map" element={isAuthenticated ? <LifeMapPage /> : <Navigate to="/auth" />} />

            {/* Career Domain (FROZEN BASELINE) */}
            <Route path="/dashboard" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/auth" />} />
            <Route path="/status" element={isAuthenticated ? <StatusPage /> : <Navigate to="/auth" />} />
            <Route path="/hunt-log" element={isAuthenticated ? <HuntLogPage /> : <Navigate to="/auth" />} />
            <Route path="/collections" element={isAuthenticated ? <CollectionsPage /> : <Navigate to="/auth" />} />
            <Route path="/collections/:id" element={isAuthenticated ? <CollectionDetailPage /> : <Navigate to="/auth" />} />

            {/* Health Domain (ISOLATED RPG DOMAIN) */}
            <Route path="/health" element={isAuthenticated ? <HealthDashboardPage /> : <Navigate to="/auth" />} />

            {/* Personal Domain (ISOLATED RPG DOMAIN) */}
            <Route path="/personal" element={isAuthenticated ? <PersonalDashboardPage /> : <Navigate to="/auth" />} />

            {/* Rewards Domain */}
            <Route path="/rewards" element={isAuthenticated ? <RewardsPage /> : <Navigate to="/auth" />} />
            
            <Route path="*" element={<Navigate to="/life" />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
      <div className="flex flex-col items-center gap-4">
        <div className="label">INITIALIZING SYSTEM...</div>
      </div>
    </div>;
  }

  return (
    <Router>
      <AppContent session={session} />
    </Router>
  );
}

export default App;
