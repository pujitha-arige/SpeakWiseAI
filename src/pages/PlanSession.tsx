/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Download, 
  Search, 
  Filter, 
  BookOpen, 
  Calendar, 
  Users, 
  Sliders, 
  Clock, 
  HelpCircle, 
  Trash2,
  ChevronRight,
  Printer
} from 'lucide-react';
import { ISession, IAISessionPlan } from '../types.js';

export const PlanSession: React.FC = () => {
  const { token, fetchNotifications } = useAuth();
  
  // State for all planned sessions
  const [sessions, setSessions] = useState<ISession[]>([]);
  const [activeSession, setActiveSession] = useState<ISession | null>(null);
  
  // List Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  
  // Form State
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [sessionName, setSessionName] = useState('');
  const [topicName, setTopicName] = useState('');
  const [sessionType, setSessionType] = useState<'Tutorial' | 'Class' | 'Workshop' | 'Meeting' | 'Seminar' | 'Training'>('Workshop');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('45');
  const [audienceAgeGroup, setAudienceAgeGroup] = useState('');
  const [isBeginner, setIsBeginner] = useState(false);
  const [isIntermediate, setIsIntermediate] = useState(true);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [attendeesCount, setAttendeesCount] = useState('20');
  const [description, setDescription] = useState('');
  const [learningObjectives, setLearningObjectives] = useState('');
  const [keyConcepts, setKeyConcepts] = useState('');
  const [topicsToCover, setTopicsToCover] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [teachingStyle, setTeachingStyle] = useState<'Formal' | 'Friendly' | 'Interactive' | 'Story Based' | 'Practical'>('Interactive');
  const [difficultyLevel, setDifficultyLevel] = useState<'Easy' | 'Medium' | 'Advanced'>('Medium');
  const [additionalNotes, setAdditionalNotes] = useState('');

  useEffect(() => {
    if (token) {
      loadSessions();
    }
  }, [token]);

  useEffect(() => {
    // Check if Dashboard clicked a specific session card
    const cachedId = localStorage.getItem('speakwise_active_session_id');
    if (cachedId && sessions.length > 0) {
      const found = sessions.find(s => s._id === cachedId);
      if (found) {
        setActiveSession(found);
        setIsCreating(false);
      }
      localStorage.removeItem('speakwise_active_session_id');
    }
  }, [sessions]);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        setSessions(list);
        if (list.length > 0 && !activeSession) {
          setActiveSession(list[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching sessions:', e);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!sessionName || !topicName || !audienceAgeGroup || !description) {
      setError('Please provide essential basic session parameters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionName,
          topicName,
          sessionType,
          date: date || new Date().toISOString().split('T')[0],
          time: time || '12:00',
          duration: Number(duration),
          audienceAgeGroup,
          isBeginner,
          isIntermediate,
          isAdvanced,
          attendeesCount: Number(attendeesCount),
          description,
          learningObjectives,
          keyConcepts,
          topicsToCover,
          expectedOutcome,
          teachingStyle,
          difficultyLevel,
          additionalNotes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error generating timeline plan.');
      }

      setSessions(prev => [data.session, ...prev]);
      setActiveSession(data.session);
      setIsCreating(false);
      fetchNotifications(); // update notifications in sidebar
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Error planning new session.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this session planner card?')) return;
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s._id !== id));
        if (activeSession?._id === id) {
          setActiveSession(null);
        }
      }
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const triggerExplicitGeneration = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${id}/generate-plan`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(prev => prev.map(s => s._id === id ? data.session : s));
        setActiveSession(data.session);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSessionName('');
    setTopicName('');
    setSessionType('Workshop');
    setDate('');
    setTime('');
    setDuration('45');
    setAudienceAgeGroup('');
    setIsBeginner(false);
    setIsIntermediate(true);
    setIsAdvanced(false);
    setAttendeesCount('20');
    setDescription('');
    setLearningObjectives('');
    setKeyConcepts('');
    setTopicsToCover('');
    setExpectedOutcome('');
    setTeachingStyle('Interactive');
    setDifficultyLevel('Medium');
    setAdditionalNotes('');
  };

  // Filtered list
  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.sessionName.toLowerCase().includes(search.toLowerCase()) || 
                          s.topicName.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'All' || s.sessionType === filterType;
    const matchesDiff = filterDifficulty === 'All' || s.difficultyLevel === filterDifficulty;
    return matchesSearch && matchesType && matchesDiff;
  });

  // Export as raw word-compatible file (.doc / text)
  const downloadSessionDoc = (session: ISession, format: 'doc' | 'txt') => {
    if (!session || !session.aiPlan) return;
    const plan = session.aiPlan;

    let content = `SPEAKWISE AI - SESSION PLANNER DOCUMENTATION\n`;
    content += `==============================================\n\n`;
    content += `SESSION NAME: ${session.sessionName}\n`;
    content += `TOPIC: ${session.topicName}\n`;
    content += `TYPE: ${session.sessionType}\n`;
    content += `DATE: ${session.date} AT ${session.time}\n`;
    content += `DURATION: ${session.duration} Minutes\n`;
    content += `TEACHING STYLE: ${session.teachingStyle}\n`;
    content += `DIFFICULTY: ${session.difficultyLevel}\n\n`;
    content += `DESCRIPTION:\n${session.description}\n\n`;
    content += `LEARNING OBJECTIVES:\n${session.learningObjectives}\n\n`;
    content += `KEY CONCEPTS:\n${session.keyConcepts}\n\n`;

    content += `TIMED TIMELINE PLAN\n`;
    content += `-------------------\n`;
    plan.timeline.forEach((item, index) => {
      content += `${index + 1}. [${item.duration} Min] ${item.title}\n`;
      content += `   Guide: ${item.description}\n\n`;
    });

    content += `EXECUTIVE SPEAKER NOTES\n`;
    content += `------------------------\n`;
    plan.speakerNotes.forEach((note) => {
      content += `SECTION: ${note.section}\n`;
      content += `* What to speak: "${note.whatToSpeak}"\n`;
      content += `* Vocal Guidance: ${note.howToExplain}\n`;
      content += `* Illustrative Examples: ${note.examples.join('; ')}\n`;
      content += `* Engagement Questions: ${note.questionsToAsk.join('; ')}\n\n`;
    });

    content += `INSTRUCTIONAL STRATEGIES\n`;
    content += `------------------------\n`;
    content += `* ICE BREAKERS:\n${plan.teachingStrategy.iceBreakers.map(i => `  - ${i}`).join('\n')}\n\n`;
    content += `* BREAKOUT ACTIVITIES:\n${plan.teachingStrategy.activities.map(a => `  - ${a}`).join('\n')}\n\n`;
    content += `* AUDIENCE ENGAGEMENT IDEAS:\n${plan.teachingStrategy.engagementIdeas.map(e => `  - ${e}`).join('\n')}\n`;

    const blob = new Blob([content], { type: format === 'doc' ? 'application/msword' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.sessionName.replace(/\s+/g, '_')}_SessionPlan.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Dynamic Top Breadcrumb */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white tracking-tight">AI Session Planner</h1>
          <p className="text-xs text-slate-400 font-medium">Design and script elite lessons with structured outlines</p>
        </div>
        <button
          onClick={() => { setIsCreating(!isCreating); setActiveSession(null); }}
          className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold rounded-xl border border-indigo-100/50 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 transition-all flex items-center gap-1.5"
        >
          {isCreating ? 'View Past Planning' : 'Plan New Session'}
          <Sparkles className="w-4 h-4 text-pink-400" />
        </button>
      </div>

      {isCreating ? (
        /* ==================== CREATE NEW SESSION FORM ==================== */
        <div className="pinterest-card max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-wider mb-4">
            <Sparkles className="w-4 h-4 text-pink-400" />
            AI Lesson Orchestration
          </div>
          <h2 className="font-display font-bold text-lg text-slate-800 dark:text-white mb-6">Plan a New Presenter Session</h2>

          {error && (
            <div className="p-3 mb-4 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 dark:text-slate-300">
            {/* COLUMN 1: Basic details */}
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-slate-800 dark:text-white border-b pb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" /> Basic Details
              </h3>
              
              <div className="flex flex-col gap-1">
                <label className="font-semibold">Session Name *</label>
                <input required type="text" value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="e.g., Financial Modeling Masterclass" className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Topic Name *</label>
                <input required type="text" value={topicName} onChange={e => setTopicName(e.target.value)} placeholder="e.g., Corporate Finance & Forecasting" className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Session Type</label>
                <select value={sessionType} onChange={e => setSessionType(e.target.value as any)} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all">
                  <option value="Tutorial">Tutorial</option>
                  <option value="Class">Class</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Training">Training</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">Time</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Duration (Minutes)</label>
                <input type="number" min="15" max="180" value={duration} onChange={e => setDuration(e.target.value)} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>
            </div>

            {/* COLUMN 2: Audience & Preferences */}
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-slate-800 dark:text-white border-b pb-1.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-pink-500" /> Audience details
              </h3>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Target Age Group *</label>
                <input required type="text" value={audienceAgeGroup} onChange={e => setAudienceAgeGroup(e.target.value)} placeholder="e.g., College Students (18-22)" className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold">Target Experience Level (Select all applicable)</label>
                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isBeginner} onChange={e => setIsBeginner(e.target.checked)} className="rounded" /> Beginner level
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isIntermediate} onChange={e => setIsIntermediate(e.target.checked)} className="rounded" /> Intermediate level
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isAdvanced} onChange={e => setIsAdvanced(e.target.checked)} className="rounded" /> Advanced level
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Number Of Attendees</label>
                <input type="number" value={attendeesCount} onChange={e => setAttendeesCount(e.target.value)} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Teaching Style</label>
                <select value={teachingStyle} onChange={e => setTeachingStyle(e.target.value as any)} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all">
                  <option value="Formal">Formal</option>
                  <option value="Friendly">Friendly</option>
                  <option value="Interactive">Interactive</option>
                  <option value="Story Based">Story Based</option>
                  <option value="Practical">Practical</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Difficulty Level</label>
                <select value={difficultyLevel} onChange={e => setDifficultyLevel(e.target.value as any)} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all">
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* COLUMN 3: Outlines & Objectives */}
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-slate-800 dark:text-white border-b pb-1.5 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-orange-500" /> Session Details
              </h3>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Short Description *</label>
                <textarea required rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this session about?" className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Learning Objectives (One per line)</label>
                <textarea rows={2} value={learningObjectives} onChange={e => setLearningObjectives(e.target.value)} placeholder="1. Understand financial formulas&#10;2. Plot forecasts" className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Key Concepts (Comma separated)</label>
                <input type="text" value={keyConcepts} onChange={e => setKeyConcepts(e.target.value)} placeholder="Cash Flow, Excel formulas, DCF modeling" className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Topics To Cover</label>
                <input type="text" value={topicsToCover} onChange={e => setTopicsToCover(e.target.value)} placeholder="Excel formulas, DCF forecasting curves" className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Expected Outcome</label>
                <input type="text" value={expectedOutcome} onChange={e => setExpectedOutcome(e.target.value)} placeholder="Attendees will outline their own financial DCF sheets" className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>
            </div>

            {/* Additional notes & Submit row */}
            <div className="md:col-span-3 flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1">
                <label className="font-semibold">Additional Notes (Optional)</label>
                <textarea rows={2} value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} placeholder="Special requests, audio setup notes, handouts..." className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold rounded-2xl text-xs shadow hover:opacity-95 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {loading ? 'Consulting SpeakWise AI Coach & Scripting...' : 'Submit & Orchestrate AI Session Plan'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ==================== EXPLORE PLANNING CARDS VIEW ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left panel: List past cards with filters */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            
            {/* Filter Search block */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search session names..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-400 uppercase">Type</label>
                  <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:outline-none transition-all"
                  >
                    <option value="All">All Types</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Class">Class</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Training">Training</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-400 uppercase">Level</label>
                  <select
                    value={filterDifficulty}
                    onChange={e => setFilterDifficulty(e.target.value)}
                    className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:outline-none transition-all"
                  >
                    <option value="All">All Levels</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>
            </div>

            {/* List cards */}
            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto no-scrollbar">
              {filteredSessions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                  No planned sessions found matching filters.
                </div>
              ) : (
                filteredSessions.map((s) => (
                  <div
                    key={s._id}
                    onClick={() => setActiveSession(s)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 text-left ${
                      activeSession?._id === s._id
                        ? 'bg-gradient-to-tr from-[#E8E5F8]/40 to-[#FFF0E6]/30 border-indigo-200 dark:border-indigo-900 shadow-md ring-2 ring-indigo-100 dark:ring-indigo-950/40'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:shadow'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-500 dark:text-pink-400">
                        {s.sessionType}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">{s.date}</span>
                    </div>
                    <h3 className="font-bold text-xs text-slate-700 dark:text-slate-100 mt-2 truncate">{s.sessionName}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{s.topicName}</p>
                    
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-50 dark:border-slate-800 text-[10px] text-slate-400">
                      <span className="font-medium">Style: {s.teachingStyle}</span>
                      <span className="font-bold text-indigo-500">{s.duration} mins</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel: Active selected planning details */}
          <div className="lg:col-span-2">
            {!activeSession ? (
              <div className="pinterest-card py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-4">
                <Sliders className="w-12 h-12 text-indigo-400 dark:text-pink-400" />
                <div>
                  <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">No session selected</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Choose a planned session from the left sidebar or create a new timeline plan.</p>
                </div>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-white rounded-xl text-xs font-bold"
                >
                  Create New Plan
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6" id="printable-area">
                
                {/* Session Header Card */}
                <div className="pinterest-card relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 flex gap-2">
                    <button
                      onClick={handlePrint}
                      title="Print / PDF Handout"
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {activeSession.aiPlan && (
                      <>
                        <button
                          onClick={() => downloadSessionDoc(activeSession, 'doc')}
                          title="Download Word DOCX"
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadSessionDoc(activeSession, 'txt')}
                          title="Download Text File"
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 transition-colors"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(activeSession._id)}
                      className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-pink-400 rounded">
                      {activeSession.sessionType}
                    </span>
                    <h2 className="font-display font-extrabold text-xl text-slate-800 dark:text-white mt-3 pr-16 leading-tight">
                      {activeSession.sessionName}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Topic: <span className="font-bold">{activeSession.topicName}</span></p>

                    {/* Meta bento grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-300">{activeSession.date}</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase">Schedule</p>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-indigo-400" />
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-300">{activeSession.time || '12:00'}</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase">{activeSession.duration} Minutes</p>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-300">~{activeSession.attendeesCount} guests</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase">{activeSession.audienceAgeGroup}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center gap-2.5">
                        <Sliders className="w-4 h-4 text-indigo-400" />
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-300">{activeSession.teachingStyle}</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase">Difficulty: {activeSession.difficultyLevel}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Plan Generation Results */}
                {!activeSession.aiPlan ? (
                  <div className="pinterest-card p-10 text-center bg-gradient-to-tr from-[#FFF0E6]/30 via-white to-pink-50/20 dark:from-slate-900 border border-orange-100/50 flex flex-col items-center gap-4">
                    <Sparkles className="w-10 h-10 text-orange-400 animate-spin" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">AI Timeline Not Generated Yet</h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">We can consult Gemini to draft your timing grids, ice breakers, activities, and exact speaker talking-point scripts instantly.</p>
                    </div>
                    <button
                      onClick={() => triggerExplicitGeneration(activeSession._id)}
                      disabled={loading}
                      className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-xs font-bold rounded-2xl flex items-center gap-1.5 shadow"
                    >
                      {loading ? 'Consulting Coach...' : 'Generate AI Lesson Script'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    
                    {/* Stepper Timed Timeline */}
                    <div className="pinterest-card">
                      <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 mb-6">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        Complete Session Plan & Timeline Outlines
                      </h3>

                      <div className="flex flex-col gap-6 pl-4 border-l-2 border-indigo-100 dark:border-indigo-950">
                        {activeSession.aiPlan.timeline.map((item, idx) => (
                          <div key={idx} className="relative text-left text-xs">
                            {/* Visual bullet */}
                            <div className="absolute -left-[25px] top-0 w-4 h-4 rounded-full bg-indigo-50 dark:bg-indigo-950 border-2 border-indigo-400 flex items-center justify-center text-[8px] font-bold text-indigo-600 dark:text-pink-400">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-xs">{item.title}</h4>
                                <span className="font-bold text-[10px] text-indigo-600 dark:text-pink-400 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950">
                                  {item.duration} Min
                                </span>
                              </div>
                              <p className="text-slate-400 dark:text-slate-400 leading-relaxed font-medium mt-1.5">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Expandable Speaker Coaching Scripts */}
                    <div className="pinterest-card">
                      <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 mb-5">
                        <Sliders className="w-4 h-4 text-indigo-500" />
                        Speaker Scripts & Vocal Coaching Notes
                      </h3>

                      <div className="flex flex-col gap-4 text-xs">
                        {activeSession.aiPlan.speakerNotes.map((note, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800/10 flex flex-col gap-3">
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1">
                              <ChevronRight className="w-4 h-4 text-pink-500" />
                              {note.section}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed">
                              {/* Left: What to speak */}
                              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100/50">
                                <p className="font-extrabold text-[9px] text-slate-400 uppercase tracking-wide">Actual Message To Say</p>
                                <p className="text-slate-600 dark:text-slate-300 italic mt-1 font-medium">"{note.whatToSpeak}"</p>
                              </div>
                              {/* Right: How to say */}
                              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100/50">
                                <p className="font-extrabold text-[9px] text-slate-400 uppercase tracking-wide">Vocal Pacing & Body Language Guidance</p>
                                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{note.howToExplain}</p>
                              </div>
                            </div>
                            
                            {/* Examples and Questions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                              {note.examples.length > 0 && (
                                <div>
                                  <span className="font-bold text-[10px] text-slate-400 uppercase">Analogies & Examples</span>
                                  <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-500 dark:text-slate-400 font-medium">
                                    {note.examples.map((ex, i) => <li key={i}>{ex}</li>)}
                                  </ul>
                                </div>
                              )}
                              {note.questionsToAsk.length > 0 && (
                                <div>
                                  <span className="font-bold text-[10px] text-slate-400 uppercase">Compelling Questions to Ask</span>
                                  <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-500 dark:text-slate-400 font-medium">
                                    {note.questionsToAsk.map((q, i) => <li key={i}>{q}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Classroom activities & Ice breakers */}
                    <div className="pinterest-card p-6 bg-gradient-to-r from-indigo-50/50 via-white to-pink-50/30 dark:from-indigo-950/10 dark:via-slate-900 border border-slate-100 dark:border-slate-800">
                      <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 mb-5">
                        <Sparkles className="w-4 h-4 text-orange-400" />
                        Engagement Activities & Ice Breakers
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="p-4 bg-white/60 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/30">
                          <p className="font-bold text-indigo-500 uppercase text-[10px]">🧊 Ice Breakers</p>
                          <ul className="list-disc pl-4 mt-2 space-y-2 text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            {activeSession.aiPlan.teachingStrategy.iceBreakers.map((ice, i) => <li key={i}>{ice}</li>)}
                          </ul>
                        </div>

                        <div className="p-4 bg-white/60 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/30">
                          <p className="font-bold text-pink-500 uppercase text-[10px]">✏️ Classroom Activities</p>
                          <ul className="list-disc pl-4 mt-2 space-y-2 text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            {activeSession.aiPlan.teachingStrategy.activities.map((act, i) => <li key={i}>{act}</li>)}
                          </ul>
                        </div>

                        <div className="p-4 bg-white/60 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/30">
                          <p className="font-bold text-orange-500 uppercase text-[10px]">⚡ Hook Audience Engagement</p>
                          <ul className="list-disc pl-4 mt-2 space-y-2 text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            {activeSession.aiPlan.teachingStrategy.engagementIdeas.map((eng, i) => <li key={i}>{eng}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
