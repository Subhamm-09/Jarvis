import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { HuntLogPage } from './pages/HuntLogPage';
import { StatusPage } from './pages/StatusPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { CollectionDetailPage } from './pages/CollectionDetailPage';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { LifeMapPage } from './pages/LifeMapPage';
import { HealthDashboardPage } from './pages/HealthDashboardPage';
import { PersonalDashboardPage } from './pages/PersonalDashboardPage';
import { NavBar } from './components/shared/NavBar';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

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

  const isAuthenticated = !!session;

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary">
        {isAuthenticated && <NavBar />}
        
        <main className="flex-1 flex flex-col pt-[60px]">
          <Routes>
            <Route path="/auth" element={!isAuthenticated ? <AuthPage /> : <Navigate to="/life" />} />
            
            {/* Protected Routes */}
            <Route path="/" element={isAuthenticated ? <LifeMapPage /> : <Navigate to="/auth" />} />
            <Route path="/life" element={isAuthenticated ? <LifeMapPage /> : <Navigate to="/auth" />} />
            <Route path="/life-map" element={isAuthenticated ? <LifeMapPage /> : <Navigate to="/auth" />} />
            <Route path="/landing" element={isAuthenticated ? <LandingPage /> : <Navigate to="/auth" />} />

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
            
            <Route path="*" element={<Navigate to="/life" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
