/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navigation } from './components/Navigation.js';
import { Login } from './pages/Login.js';
import { Signup } from './pages/Signup.js';
import { ForgotPassword } from './pages/ForgotPassword.js';
import { ResetPassword } from './pages/ResetPassword.js';
import { Dashboard } from './pages/Dashboard.js';
import { PlanSession } from './pages/PlanSession.js';
import { PracticeSession } from './pages/PracticeSession.js';
import { UpcomingSessions } from './pages/UpcomingSessions.js';
import { Analytics } from './pages/Analytics.js';
import { Profile } from './pages/Profile.js';
import { SessionWorkspace } from './pages/SessionWorkspace.js';

const AppContent: React.FC = () => {
  const { token, loading } = useAuth();
  const [hash, setHash] = useState(window.location.hash || '#dashboard');

  // Handle browser Back/Forward buttons and URL updates
  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash || '#dashboard');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (newHash: string) => {
    window.location.hash = newHash;
    setHash(newHash);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">SpeakWise AI Launching...</p>
        </div>
      </div>
    );
  }

  // --- UNAUTHENTICATED ROUTING ---
  if (!token) {
    switch (hash) {
      case '#signup':
        return <Signup onNavigate={handleNavigate} />;
      case '#forgot-password':
        return <ForgotPassword onNavigate={handleNavigate} />;
      case '#reset-password':
        return <ResetPassword onNavigate={handleNavigate} />;
      case '#login':
      default:
        return <Login onNavigate={handleNavigate} />;
    }
  }

  // --- AUTHENTICATED ROUTING ---
  const renderPage = () => {
    switch (hash) {
      case '#workspace':
        return <SessionWorkspace />;
      case '#plan-session':
        return <PlanSession />;
      case '#coaching':
        return <PracticeSession />;
      case '#upcoming':
        return <UpcomingSessions />;
      case '#analytics':
        return <Analytics />;
      case '#profile':
        return <Profile />;
      case '#dashboard':
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row transition-colors duration-300">
      {/* Sidebar Navigation */}
      <Navigation currentHash={hash} onNavigate={handleNavigate} />

      {/* Main Content Stage */}
      <main className="flex-1 lg:pl-64 min-h-screen overflow-x-hidden">
        <div className="animate-fade-in py-4 lg:py-6">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
