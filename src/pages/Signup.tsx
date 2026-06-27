/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';

interface SignupProps {
  onNavigate: (hash: string) => void;
}

export const Signup: React.FC<SignupProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [occupation, setOccupation] = useState('');
  const [experience, setExperience] = useState('0-2 Years');
  const [skills, setSkills] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword || !name) {
      setError('Full Name, Email, Password, and Confirm Password are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          name,
          bio,
          occupation,
          experience,
          skills
        })
      });

      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Received non-JSON response from server:', text);
        throw new Error(`Server returned an invalid response. Raw output: ${text.substring(0, 100)}...`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign up.');
      }

      // Cache email and simulated verification code for Verify Email screen
      localStorage.setItem('speakwise_verify_email', email);
      if (data.simulatedCode) {
        localStorage.setItem('speakwise_simulated_code', data.simulatedCode);
      }
      onNavigate('#verify-email');
    } catch (err: any) {
      setError(err.message || 'Error registering account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#E8E5F8] via-[#F3EDF7] to-[#FFF0E6] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-center items-center p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="font-display font-extrabold text-3xl text-slate-800 dark:text-white tracking-tight">
          Create Account
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Join SpeakWise AI and unlock professional speaker coaching
        </p>
      </div>

      {/* Main Form Box */}
      <div className="w-full max-w-md bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
        {error && (
          <div className="p-3 mb-4 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-950">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Full Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Elena Rostova"
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Confirm Password *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold rounded-2xl text-xs shadow-md hover:shadow-lg hover:opacity-95 transition-all duration-300 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'Creating Account...' : 'Sign Up & Launch'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          Already have an account?{' '}
          <button
            onClick={() => onNavigate('#login')}
            className="font-bold text-indigo-500 dark:text-pink-400 hover:underline"
          >
            Sign In Instead
          </button>
        </p>
      </div>
    </div>
  );
};
