/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, ArrowLeft } from 'lucide-react';

interface ResetPasswordProps {
  onNavigate: (hash: string) => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigate }) => {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if forgot password cached a simulated token
    const cached = localStorage.getItem('speakwise_reset_token');
    if (cached) {
      setToken(cached);
      localStorage.removeItem('speakwise_reset_token');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token || !newPassword) {
      setError('Please provide the reset token and your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setSuccess('Your password has been updated successfully! Redirecting to login...');
      setTimeout(() => {
        onNavigate('#login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error updating password.');
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
          Reset Password
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Paste your recovery token and enter your new password to update your account.
        </p>

        {error && (
          <div className="p-3 mb-4 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-950">
            {error}
          </div>
        )}

        {success ? (
          <div className="p-4 text-xs leading-relaxed text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-950">
            {success}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Reset JWT Token</label>
              <textarea
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the JWT token simulated on the forgot password page..."
                rows={3}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl text-[11px] font-mono focus:ring-2 focus:ring-indigo-400 focus:outline-none text-slate-700 dark:text-slate-200"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold rounded-2xl text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 mt-2"
            >
              {loading ? 'Updating Password...' : 'Save & Log In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
