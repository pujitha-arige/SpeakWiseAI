/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';

interface ForgotPasswordProps {
  onNavigate: (hash: string) => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [simulatedToken, setSimulatedToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      setMessage(data.message);
      if (data.resetToken) {
        setSimulatedToken(data.resetToken);
      } else if (data.simulatedToken) {
        setSimulatedToken(data.simulatedToken);
      }
    } catch (err) {
      setMessage('Error processing password reset simulation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#E8E5F8] via-[#F3EDF7] to-[#FFF0E6] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
        <button
          onClick={() => onNavigate('#login')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </button>

        <h2 className="font-display font-bold text-2xl text-slate-800 dark:text-white mb-2">
          Forgot Password
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Enter your email and we'll simulate a secure JWT password reset token.
        </p>

        {message ? (
          <div className="flex flex-col gap-4">
            <div className="p-4 text-xs leading-relaxed text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100/50">
              {message}
            </div>

            {simulatedToken && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Simulated Token</p>
                <p className="text-[10px] font-mono break-all text-slate-600 dark:text-slate-300 mt-1 select-all cursor-pointer p-2 bg-white dark:bg-slate-900 rounded-lg">
                  {simulatedToken}
                </p>
                <button
                  onClick={() => {
                    localStorage.setItem('speakwise_reset_token', simulatedToken);
                    onNavigate('#reset-password');
                  }}
                  className="mt-4 w-full py-2.5 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  Apply Token & Reset Password
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold rounded-2xl text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 mt-2"
            >
              {loading ? 'Simulating...' : 'Send Recovery Token'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
