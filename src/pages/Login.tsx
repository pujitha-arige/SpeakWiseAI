/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Lock, Mail, ArrowRight, Sparkles, Check } from 'lucide-react';

interface LoginProps {
  onNavigate: (hash: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, rememberMe })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requiresVerification) {
          localStorage.setItem('speakwise_verify_email', email);
          if (data.simulatedCode) {
            localStorage.setItem('speakwise_simulated_code', data.simulatedCode);
          }
          setError('Email verification required. Redirecting...');
          setTimeout(() => {
            onNavigate('#verify-email');
          }, 1500);
          return;
        }
        throw new Error(data.error || 'Invalid login details.');
      }

      login(data.token, data.user);
      onNavigate('#dashboard');
    } catch (err: any) {
      setError(err.message || 'Error logging in.');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoCredentials = () => {
    setEmail('demo@speakwise.ai');
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#E8E5F8] via-[#F3EDF7] to-[#FFF0E6] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-center items-center p-6">
      {/* Title block */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-indigo-400 via-purple-400 to-pink-400 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg mx-auto mb-4 animate-bounce">
          S
        </div>
        <h1 className="font-display font-extrabold text-3xl text-slate-800 dark:text-white tracking-tight">
          SpeakWise AI
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Session Planning & Speaker Coaching Platform
        </p>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
        <h2 className="font-display font-bold text-xl text-slate-800 dark:text-white mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Welcome back
        </h2>

        {error && (
          <div className="p-3 mb-4 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-950">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-400 dark:focus:ring-pink-500 focus:outline-none text-slate-700 dark:text-slate-200 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Password</label>
              <button
                type="button"
                onClick={() => onNavigate('#forgot-password')}
                className="text-[11px] font-bold text-indigo-500 dark:text-pink-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-400 dark:focus:ring-pink-500 focus:outline-none text-slate-700 dark:text-slate-200 transition-all"
              />
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between mt-1 ml-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded-md border-slate-200 dark:border-slate-700 text-indigo-500 focus:ring-indigo-400 w-4 h-4"
              />
              Remember Me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold rounded-2xl text-sm shadow-md hover:shadow-lg hover:opacity-95 transition-all duration-300 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'Entering Platform...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Access Trigger */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400 font-medium">Want to test SpeakWise instantly?</p>
          <button
            onClick={loadDemoCredentials}
            className="mt-2.5 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold border border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all flex items-center gap-1.5 mx-auto"
          >
            <Check className="w-3.5 h-3.5" />
            Load Pre-seeded Demo Account
          </button>
        </div>

        {/* Register footer link */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          Don't have an account?{' '}
          <button
            onClick={() => onNavigate('#signup')}
            className="font-bold text-indigo-500 dark:text-pink-400 hover:underline"
          >
            Create Free Account
          </button>
        </p>
      </div>
    </div>
  );
};
