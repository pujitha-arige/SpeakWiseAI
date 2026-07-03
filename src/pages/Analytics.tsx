/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  BarChart2, 
  Award, 
  Mic, 
  Clock, 
  TrendingUp, 
  Sliders, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { IPracticeEvaluation } from '../types.js';

export const Analytics: React.FC = () => {
  const { token } = useAuth();
  
  const [evaluations, setEvaluations] = useState<IPracticeEvaluation[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    upcomingSessions: 0,
    completedSessions: 0,
    aiEvaluationsCount: 0,
    averages: {
      overall: 0,
      confidence: 0,
      communication: 0,
      engagement: 0,
      fillerCount: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadAnalyticsData();
    }
  }, [token]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch analytics overview
      const overviewRes = await fetch('/api/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (overviewRes.ok) {
        const ovData = await overviewRes.json();
        setStats(ovData.statistics);
      }

      // Fetch practice logs list
      const evalRes = await fetch('/api/evaluations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (evalRes.ok) {
        const eList = await evalRes.json();
        setEvaluations(eList);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl mt-4" />
      </div>
    );
  }

  // Format data for charts
  // Reverse evaluations to show chronological progression
  const chartData = evaluations.slice().reverse().map((ev, index) => ({
    name: ev.sessionTitle.length > 15 ? `${ev.sessionTitle.substring(0, 15)}...` : ev.sessionTitle,
    Overall: ev.overallScore,
    Confidence: ev.confidenceScore,
    Clarity: ev.communicationScore,
    Engagement: ev.engagementScore,
    Fillers: ev.speechQuality.fillerCount,
    Date: new Date(ev.evaluatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }));

  // Fallback seed data if they haven't practiced yet
  const demoChartData = [
    { name: 'Practice Pitch 1', Overall: 75, Confidence: 70, Clarity: 80, Engagement: 72, Fillers: 6, Date: 'June 18' },
    { name: 'Vocal Projection Practice', Overall: 82, Confidence: 84, Clarity: 78, Engagement: 80, Fillers: 4, Date: 'June 20' },
    { name: 'Financial Keynote Pitch', Overall: 88, Confidence: 86, Clarity: 90, Engagement: 85, Fillers: 2, Date: 'June 22' },
  ];

  const activeData = chartData.length > 0 ? chartData : demoChartData;

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6 text-left">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <h1 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white tracking-tight">AI Analytics Dashboard</h1>
        <p className="text-xs text-slate-400 font-medium">Observe overall voice pacing metrics and chart skill progression scores</p>
      </div>

      {/* Aggregate Statistics Bento row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total practice runs */}
        <div className="pinterest-card p-5 flex items-center gap-4">
          <div className="p-3 bg-pastel-lavender dark:bg-indigo-950 rounded-2xl">
            <Mic className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Practice Pitches</span>
            <h3 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white mt-0.5">
              {stats.aiEvaluationsCount} Runs
            </h3>
          </div>
        </div>

        {/* Avg Overall confidence */}
        <div className="pinterest-card p-5 flex items-center gap-4">
          <div className="p-3 bg-pastel-pink dark:bg-pink-950 rounded-2xl">
            <Award className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Avg Overall Competency</span>
            <h3 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white mt-0.5">
              {stats.averages.overall}%
            </h3>
          </div>
        </div>

        {/* Avg Fillers */}
        <div className="pinterest-card p-5 flex items-center gap-4">
          <div className="p-3 bg-pastel-peach dark:bg-orange-950/40 rounded-2xl">
            <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Avg Filler Words / Run</span>
            <h3 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white mt-0.5">
              {stats.averages.fillerCount || 3}
            </h3>
          </div>
        </div>

        {/* Lesson Plans Drafted */}
        <div className="pinterest-card p-5 flex items-center gap-4">
          <div className="p-3 bg-pastel-purple dark:bg-purple-950 rounded-2xl">
            <Sliders className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Structured Timelines</span>
            <h3 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white mt-0.5">
              {stats.totalSessions} Cards
            </h3>
          </div>
        </div>

      </div>

      {/* Main Charts Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Competency & Skill Progression over time */}
        <div className="pinterest-card">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white">Competency Score Metrics</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Chronological feedback tracking Overall vs. Confidence rating</p>
            </div>
            <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Progress
            </span>
          </div>

          <div className="h-64 text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="Date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[40, 100]} />
                <Tooltip contentStyle={{ borderRadius: '16px', background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0', color: '#1e293b' }} />
                <Legend />
                <Area type="monotone" dataKey="Overall" name="Overall score" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorOverall)" />
                <Area type="monotone" dataKey="Confidence" name="Confidence cue" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorConfidence)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Dimension Dials breakdown */}
        <div className="pinterest-card">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white">Speaker Dimension Breakdown</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Clarity and Engagement metrics across recent session rehearsals</p>
            </div>
            <span className="text-[10px] text-pink-500 font-bold bg-pink-50 dark:bg-pink-950/40 px-2 py-0.5 rounded-md">
              Dimensions
            </span>
          </div>

          <div className="h-64 text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="Date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[40, 100]} />
                <Tooltip contentStyle={{ borderRadius: '16px', background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0', color: '#1e293b' }} />
                <Legend />
                <Line type="monotone" dataKey="Clarity" name="Clarity rating" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Engagement" name="Engagement rating" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Filler words reduction progress (Bar Chart) */}
        <div className="pinterest-card lg:col-span-2">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white">Filler Word Reduction Trend</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Targeting optimal pause patterns and weeding out "um", "like", and "so"</p>
            </div>
            <span className="text-[10px] text-orange-500 font-bold bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md">
              Filler words
            </span>
          </div>

          <div className="h-64 text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="Date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '16px', background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0', color: '#1e293b' }} />
                <Bar dataKey="Fillers" name="Filler count per session" fill="#ec4899" radius={[12, 12, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
