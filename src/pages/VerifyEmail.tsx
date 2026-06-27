/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Key, Mail, ArrowRight, ArrowLeft, CheckCircle, MailOpen, RefreshCw, X, ShieldAlert, Inbox, ExternalLink } from 'lucide-react';
import { ISimulatedEmail } from '../types.js';

interface VerifyEmailProps {
  onNavigate: (hash: string) => void;
}

export const VerifyEmail: React.FC<VerifyEmailProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Simulated Webmail Client states
  const [showInbox, setShowInbox] = useState(false);
  const [emails, setEmails] = useState<ISimulatedEmail[]>([]);
  const [activeEmail, setActiveEmail] = useState<ISimulatedEmail | null>(null);
  const [inboxLoading, setInboxLoading] = useState(false);

  useEffect(() => {
    // Check if registration or login cached credentials
    const cachedEmail = localStorage.getItem('speakwise_verify_email');
    if (cachedEmail) {
      setEmail(cachedEmail);
    }
  }, []);

  const fetchSimulatedEmails = async () => {
    if (!email) return;
    setInboxLoading(true);
    try {
      const res = await fetch(`/api/auth/simulated-emails?to=${encodeURIComponent(email.trim())}`);
      if (res.ok) {
        const list = await res.json();
        setEmails(list);
        if (list.length > 0) {
          // Default to the newest email
          setActiveEmail(list[0]);
        } else {
          setActiveEmail(null);
        }
      }
    } catch (e) {
      console.warn('Error fetching simulated emails:', e);
    } finally {
      setInboxLoading(false);
    }
  };

  const handleOpenInbox = () => {
    setShowInbox(true);
    fetchSimulatedEmails();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !code) {
      setError('Please provide your email address and 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim(), code: code.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify email.');
      }

      setSuccess('Email address verified successfully! Logging you in...');
      setTimeout(() => {
        login(data.token, data.user);
        // Clear cached email
        localStorage.removeItem('speakwise_verify_email');
        onNavigate('#dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error verifying email.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract code from body for autofill
  const handleAutoFillFromEmail = (bodyText: string) => {
    // Look for 6 consecutive digits in the email text
    const match = bodyText.match(/\b\d{6}\b/);
    if (match) {
      setCode(match[0]);
      setShowInbox(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#E8E5F8] via-[#F3EDF7] to-[#FFF0E6] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-center items-center p-6 relative overflow-x-hidden">
      
      {/* Verify form panel card */}
      <div className="w-full max-w-md bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative z-10">
        <button
          onClick={() => onNavigate('#login')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </button>

        <h2 className="font-display font-bold text-2xl text-slate-800 dark:text-white mb-2">
          Verify Your Email
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          To finalize your account setup, please look at the confirmation email sent to your address and enter the 6-digit verification code below.
        </p>

        {error && (
          <div className="p-3.5 mb-4 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-950/40 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 text-xs leading-relaxed text-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-950/40 flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email Address */}
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

              {/* 6-Digit Code */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">6-Digit Code</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit PIN"
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl text-xs font-mono tracking-[0.3em] font-extrabold focus:ring-2 focus:ring-indigo-400 focus:outline-none text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold rounded-2xl text-xs shadow hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 mt-2"
              >
                {loading ? 'Verifying...' : 'Verify & Log In'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink mx-4 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Simulated Delivery</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            {/* Email Inbox simulator launch button */}
            <button
              type="button"
              onClick={handleOpenInbox}
              disabled={!email}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              <Inbox className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
              Open Simulated Email Inbox
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>
          </div>
        )}
      </div>

      {/* Simulated Webmail Inbox Client Drawer Modal Overlay */}
      {showInbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-4xl h-[80vh] min-h-[500px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-scale-up">
            
            {/* Inbox header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow">
                  M
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white">Simulated Webmail Client</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Inbox for: <span className="font-mono text-indigo-500 select-all">{email}</span></p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchSimulatedEmails}
                  disabled={inboxLoading}
                  className="p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 rounded-xl text-slate-500 dark:text-slate-400 transition-colors flex items-center justify-center"
                  title="Refresh inbox"
                >
                  <RefreshCw className={`w-4 h-4 ${inboxLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowInbox(false)}
                  className="p-2 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inbox workspace layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left pane: Email list */}
              <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/30 dark:bg-slate-900/10 overflow-y-auto">
                {inboxLoading && emails.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6">
                    <div className="w-6 h-6 rounded-full border-2 border-indigo-100 border-t-indigo-500 animate-spin" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Refreshing Inbox...</span>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2.5 p-8 text-center">
                    <MailOpen className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                    <div>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No emails found</p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Verification emails appear here. Try triggering signup or logging in to create one.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-900">
                    {emails.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => setActiveEmail(item)}
                        className={`w-full p-4 text-left transition-all flex flex-col gap-1 ${
                          activeEmail?._id === item._id 
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-l-4 border-indigo-500' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/40 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">SpeakWise Security</span>
                          <span className="text-[9px] text-slate-400">{formatDate(item.sentAt)}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {item.subject}
                        </span>
                        <span className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                          {item.body.replace(/<[^>]*>/g, '').trim().substring(0, 70)}...
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right pane: Reading pane */}
              <div className="flex-grow flex flex-col bg-white dark:bg-slate-950 overflow-y-auto p-6">
                {activeEmail ? (
                  <div className="flex flex-col h-full">
                    {/* Header of the email reading view */}
                    <div className="pb-4 border-b border-slate-100 dark:border-slate-900 mb-6 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <h2 className="font-display font-extrabold text-base text-slate-800 dark:text-white leading-tight">
                          {activeEmail.subject}
                        </h2>
                        
                        {/* Auto fill quick button inside the reading pane */}
                        <button
                          type="button"
                          onClick={() => handleAutoFillFromEmail(activeEmail.body)}
                          className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-95 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all"
                        >
                          Auto Fill Code
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 text-xs">
                          S
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            SpeakWise Security &lt;<span className="text-indigo-500 font-medium">security@speakwise.ai</span>&gt;
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            To: {activeEmail.to} • {formatDate(activeEmail.sentAt)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Email HTML Body content */}
                    <div className="flex-grow overflow-x-hidden flex justify-center bg-slate-50/50 dark:bg-slate-900/10 p-6 rounded-2xl border border-slate-100 dark:border-slate-900">
                      <div 
                        className="w-full text-slate-700 dark:text-slate-300 font-sans"
                        dangerouslySetInnerHTML={{ __html: activeEmail.body }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-800" />
                    <p className="text-xs font-bold">Select an email message to view details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
