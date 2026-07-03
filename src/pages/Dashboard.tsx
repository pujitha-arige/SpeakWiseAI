/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { 
  Sparkles, 
  Video, 
  Calendar, 
  CheckCircle, 
  Award, 
  Mic, 
  ArrowRight, 
  Plus, 
  TrendingUp, 
  Zap, 
  Info,
  Clock
} from 'lucide-react';
import { ISession, IUpcomingSession, IPracticeEvaluation } from '../types.js';

interface DashboardProps {
  onNavigate: (hash: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    totalSessions: 0,
    upcomingSessions: 0,
    completedSessions: 0,
    aiEvaluationsCount: 0,
    averages: { overall: 0 }
  });
  const [recentSessions, setRecentSessions] = useState<ISession[]>([]);
  const [upcomingPreviews, setUpcomingPreviews] = useState<IUpcomingSession[]>([]);
  const [recentEvaluations, setRecentEvaluations] = useState<IPracticeEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch analytics
      const analyticsRes = await fetch('/api/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setStats(analyticsData.statistics);
      }

      // Fetch planned sessions
      const sessionsRes = await fetch('/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (sessionsRes.ok) {
        const sList = await sessionsRes.json();
        setRecentSessions(sList.slice(0, 3));
      }

      // Fetch upcoming sessions preview
      const upcomingRes = await fetch('/api/upcoming-sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (upcomingRes.ok) {
        const uList = await upcomingRes.json();
        setUpcomingPreviews(uList.slice(0, 3));
      }

      // Fetch practice evaluations
      const evalRes = await fetch('/api/evaluations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (evalRes.ok) {
        const eList = await evalRes.json();
        setRecentEvaluations(eList.slice(0, 2));
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col gap-6 animate-pulse">
        {/* Skeleton Welcome */}
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-2/3" />
        
        {/* Skeleton Stats Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-[2rem]" />
          ))}
        </div>

        {/* Skeleton columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 h-80 bg-slate-200 dark:bg-slate-800 rounded-[2.5rem]" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  // Generate dynamic coaching suggestions based on scores or profiles
  const getDynamicSuggestions = () => {
    if (stats.averages.overall >= 88) {
      return [
        { title: 'Incorporate Dramatic Silence', desc: 'Your delivery is highly polished. Try holding a complete 2-3 second pause after sharing pivotal statistics to amplify importance.' },
        { title: 'Explore Lateral Stage Movement', desc: 'If practicing on a physical stage, try dividing the room into three zones and change zones as you transition acts.' }
      ];
    } else if (recentEvaluations.length > 0 && recentEvaluations[0].speechQuality.fillerCount > 3) {
      return [
        { title: 'The Breath Anchor Method', desc: 'We noticed some filler vocalizations. Every time you are tempted to say "um", take a quick, silent inhalation instead.' },
        { title: 'Sign-off Script Preparation', desc: 'Focus on writing your absolute final closing sentence word-for-word, ensuring you wrap up with direct vocal authority.' }
      ];
    } else {
      return [
        { title: 'Hook the Audience Early', desc: 'Always launch your session with a story, a dramatic statistic, or a direct hand poll. Avoid starting with generic welcome boilerplate.' },
        { title: 'Warm Up Your Voice', desc: 'Perform simple tongue-twisters or hum dynamic pitch ranges for 3 minutes before taking the microphone to maximize projection.' }
      ];
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-8 bg-gradient-to-r from-purple-100/50 via-pink-100/30 to-peach-100/10 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-transparent rounded-[2.5rem] border border-slate-100/80 dark:border-slate-800/20 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-pink-400 animate-spin" />
            Coaching Dashboard
          </div>
          <h1 className="font-display font-extrabold text-3xl text-slate-800 dark:text-white mt-1.5 tracking-tight">
            Greetings, {user?.name}!
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            You have conducted <span className="font-bold text-indigo-600 dark:text-pink-400">{stats.totalSessions} sessions</span> with an average AI coach confidence score of <span className="font-bold text-indigo-600 dark:text-pink-400">{stats.averages.overall}%</span>. Let's design some impact!
          </p>
        </div>
        <button
          onClick={() => onNavigate('#plan-session')}
          className="px-5 py-3.5 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:opacity-95 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Plan New Session
        </button>
      </div>

      {/* Quick Statistics Bento Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sessions */}
        <div className="pinterest-card flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-pastel-lavender dark:bg-slate-800 rounded-xl">
            <Video className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Planned</p>
            <h3 className="font-display font-extrabold text-3xl text-slate-800 dark:text-white mt-1">{stats.totalSessions}</h3>
          </div>
          <button onClick={() => onNavigate('#plan-session')} className="text-xs font-semibold text-indigo-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            View cards <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Upcoming Sessions */}
        <div className="pinterest-card flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-pastel-pink dark:bg-slate-800 rounded-xl">
            <Calendar className="w-4 h-4 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Upcoming Events</p>
            <h3 className="font-display font-extrabold text-3xl text-slate-800 dark:text-white mt-1">{stats.upcomingSessions}</h3>
          </div>
          <button onClick={() => onNavigate('#upcoming')} className="text-xs font-semibold text-pink-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Open calendar <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Completed Sessions */}
        <div className="pinterest-card flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-pastel-peach dark:bg-slate-800 rounded-xl">
            <CheckCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Completed Sessions</p>
            <h3 className="font-display font-extrabold text-3xl text-slate-800 dark:text-white mt-1">{stats.completedSessions}</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Checked from dates
          </span>
        </div>

        {/* AI Evaluations */}
        <div className="pinterest-card flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-pastel-purple dark:bg-slate-800 rounded-xl">
            <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">AI Coach Score</p>
            <h3 className="font-display font-extrabold text-3xl text-slate-800 dark:text-white mt-1">
              {stats.averages.overall}/100
            </h3>
          </div>
          <button onClick={() => onNavigate('#coaching')} className="text-xs font-semibold text-purple-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Practice now <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Grid: Content blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 cols wide): Recent Activity & Suggestions */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* AI Suggestions Widget */}
          <div className="pinterest-card p-6 bg-gradient-to-r from-[#FFF0E6]/60 to-[#FDFBF7]/40 dark:from-slate-900/40 dark:to-slate-900/20 border border-orange-100/50 dark:border-slate-800">
            <h2 className="font-display font-bold text-base text-slate-800 dark:text-white flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-orange-500 animate-pulse" />
              Coaching Recommendations for {user?.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getDynamicSuggestions().map((sug, idx) => (
                <div key={idx} className="p-4 bg-white/60 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/40 text-xs">
                  <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    {sug.title}
                  </h3>
                  <p className="text-slate-400 dark:text-slate-400 leading-relaxed font-medium">{sug.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Planned Sessions List Preview */}
          <div className="pinterest-card">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display font-bold text-base text-slate-800 dark:text-white">Recent Planning Cards</h2>
              <button onClick={() => onNavigate('#plan-session')} className="text-xs font-bold text-indigo-500 hover:underline">
                View All Planning
              </button>
            </div>

            {recentSessions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
                <Video className="w-10 h-10 text-indigo-400 dark:text-pink-400" />
                <p className="text-xs">No planned sessions yet. Let's create your first timeline script!</p>
                <button
                  onClick={() => onNavigate('#plan-session')}
                  className="px-4 py-2 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-white rounded-xl text-xs font-bold"
                >
                  Create Session
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {recentSessions.map((s) => (
                  <div key={s._id} className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-pink-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md uppercase">
                        {s.sessionType}
                      </span>
                      <h3 className="font-bold text-xs text-slate-700 dark:text-slate-200 mt-1.5">{s.sessionName}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Topic: {s.topicName} • {s.duration} mins</p>
                    </div>
                    <button
                      onClick={() => {
                        localStorage.setItem('speakwise_active_session_id', s._id);
                        onNavigate('#plan-session');
                      }}
                      className="px-3.5 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold shadow-sm border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all flex items-center gap-1 ml-auto md:ml-0"
                    >
                      Open Lesson Plan <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column (1 col wide): Upcoming Calendar Preview & Practice Log summaries */}
        <div className="flex flex-col gap-6">
          
          {/* Upcoming Previews preview */}
          <div className="pinterest-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-pink-400" />
                Calendar Previews
              </h2>
              <button onClick={() => onNavigate('#upcoming')} className="text-xs font-bold text-pink-500 hover:underline">
                View Grid
              </button>
            </div>

            {upcomingPreviews.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No upcoming events listed in the calendar.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {upcomingPreviews.map((up) => (
                  <div key={up._id} className="p-3.5 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/10 flex gap-3">
                    <div className="p-2.5 bg-pink-100 dark:bg-pink-950/30 rounded-xl h-fit flex flex-col items-center justify-center min-w-[44px]">
                      <span className="text-[9px] font-bold uppercase text-pink-600 dark:text-pink-400">
                        {new Date(up.date).toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="text-base font-extrabold text-pink-700 dark:text-pink-300">
                        {new Date(up.date).getUTCDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-slate-700 dark:text-slate-200 truncate">{up.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{up.topic}</p>
                      <p className="text-[10px] text-indigo-500 font-bold mt-1">{up.time} ({up.duration}m)</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick coaching record widget */}
          <div className="pinterest-card p-6 bg-gradient-to-br from-indigo-50 to-pink-50 dark:from-indigo-950/30 dark:to-pink-950/10 border border-indigo-100/30 dark:border-slate-800">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 mb-2">
              <Mic className="w-4 h-4 text-indigo-500" />
              Practice Pitch Delivery
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed font-medium mb-4">
              Speak into your microphone. Our AI coach analyzes fillers, clarity, stutters, confidence, and speed instantly.
            </p>
            <button
              onClick={() => onNavigate('#coaching')}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow"
            >
              Start Demo Practice
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Recent Evaluations Preview */}
          <div className="pinterest-card">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-4">Practice Score History</h3>
            {recentEvaluations.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No practice logs found. Start speaking to record reports!
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentEvaluations.map((ev) => (
                  <div key={ev._id} className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl flex justify-between items-center text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{ev.sessionTitle}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Score: <span className="font-bold text-indigo-500">{ev.overallScore}</span> • {ev.speechQuality.tone}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-pink-400 border border-indigo-100/30">
                      {ev.overallScore}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
