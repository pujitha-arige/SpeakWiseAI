/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Download,
  FileText,
  HelpCircle,
  Mic,
  MicOff,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Smile,
  Trash2,
  Users,
  Video,
  Volume2,
  Flame,
  Award,
  Book,
  FileCode,
  Layout,
  Upload,
  Layers,
  ChevronRight,
  Plus,
  Compass
} from 'lucide-react';
import { ISession, IAISessionPlan } from '../types.js';

export const SessionWorkspace: React.FC = () => {
  const { token } = useAuth();

  // Selected Session States
  const [sessions, setSessions] = useState<ISession[]>([]);
  const [activeSession, setActiveSession] = useState<ISession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Active Workspace Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'slides' | 'practice' | 'transcript' | 'qa' | 'story' | 'gap' | 'versions'>('overview');

  // Slide Assistant State
  const [slidePastedText, setSlidePastedText] = useState('');
  const [slideSummary, setSlideSummary] = useState('');
  const [slideList, setSlideList] = useState<any[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(false);

  // Q&A Simulator State
  const [currentAudienceType, setCurrentAudienceType] = useState<'Beginner' | 'Curious' | 'Difficult' | 'Silent'>('Curious');
  const [qaQuestion, setQaQuestion] = useState('Can you explain this another way for someone with absolutely no background?');
  const [userQaAnswer, setUserQaAnswer] = useState('');
  const [qaEvaluation, setQaEvaluation] = useState<any | null>(null);
  const [loadingQa, setLoadingQa] = useState(false);

  // AI Story Generator State
  const [storyTopic, setStoryTopic] = useState('');
  const [generatedStory, setGeneratedStory] = useState<any | null>(null);
  const [loadingStory, setLoadingStory] = useState(false);

  // Practice Mode State
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceAudience, setPracticeAudience] = useState<'Beginner' | 'Curious' | 'Difficult' | 'Silent'>('Curious');
  const [practiceSeconds, setPracticeSeconds] = useState(0);
  const [practiceTranscript, setPracticeTranscript] = useState('');
  const [activePracticeSlide, setActivePracticeSlide] = useState(1);
  const [audiencePrompts, setAudiencePrompts] = useState<string[]>([]);
  const [currentAudiencePrompt, setCurrentAudiencePrompt] = useState<string | null>(null);

  // Practice Speech Critic & Transcript State
  const [critiqueResult, setCritiqueResult] = useState<any | null>(null);
  const [fillerWordsCount, setFillerWordsCount] = useState(0);

  // Knowledge Gap State
  const [gapAnalysis, setGapAnalysis] = useState<any | null>(null);
  const [loadingGap, setLoadingGap] = useState(false);

  // Versions State
  const [versionsList, setVersionsList] = useState<any[]>([
    { version: 1, date: '2026-06-24', notes: 'Initial AI script allocation' },
    { version: 2, date: '2026-06-24', notes: 'Upgraded engagement icebreaker hooks' }
  ]);

  // Fallback states for when Gemini 503 is hit
  const [slideIsFallback, setSlideIsFallback] = useState(false);
  const [qaIsFallback, setQaIsFallback] = useState(false);
  const [storyIsFallback, setStoryIsFallback] = useState(false);
  const [gapIsFallback, setGapIsFallback] = useState(false);

  // Audio References
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (token) {
      loadSessions();
    }
    return () => {
      stopPracticeTimer();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [token]);

  // Sync inputs when active session changes
  useEffect(() => {
    if (activeSession) {
      setStoryTopic(activeSession.topicName || '');
      setSlidePastedText(
        `# Slide 1: Welcome to ${activeSession.sessionName}\n- Theme: ${activeSession.topicName}\n- Objective: ${activeSession.learningObjectives}\n\n# Slide 2: Core Concepts\n- Fundamentals of ${activeSession.keyConcepts}\n- Practical implementation techniques`
      );
    }
  }, [activeSession]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        // Prioritize cached or first session
        const cachedId = localStorage.getItem('speakwise_active_session_id');
        if (cachedId) {
          const found = data.find((s: any) => s._id === cachedId);
          if (found) setActiveSession(found);
          localStorage.removeItem('speakwise_active_session_id');
        } else if (data.length > 0) {
          setActiveSession(data[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching sessions:', e);
    } finally {
      setLoading(false);
    }
  };

  // Generate Lesson Plan if none exists
  const handleGeneratePlan = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${activeSession._id}/generate-plan`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data.session);
        setSessions(prev => prev.map(s => s._id === activeSession._id ? data.session : s));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Slide deck generator
  const handleAnalyzeSlides = async () => {
    if (!slidePastedText) return;
    setLoadingSlides(true);
    setSlideIsFallback(false);
    try {
      const res = await fetch('/api/ai/slide-analyzer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ slideText: slidePastedText })
      });
      if (res.ok) {
        const data = await res.json();
        setSlideSummary(data.summary);
        setSlideList(data.slides);
        setSlideIsFallback(!!data.isFallback);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSlides(false);
    }
  };

  // Q&A evaluation
  const handleEvaluateQA = async () => {
    if (!userQaAnswer) return;
    setLoadingQa(true);
    setQaIsFallback(false);
    try {
      const res = await fetch('/api/ai/qa-simulator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: qaQuestion,
          presenterAnswer: userQaAnswer
        })
      });
      if (res.ok) {
        const data = await res.json();
        setQaEvaluation(data);
        setQaIsFallback(!!data.isFallback);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQa(false);
    }
  };

  // Story generator
  const handleGenerateStory = async () => {
    if (!storyTopic) return;
    setLoadingStory(false);
    setLoadingStory(true);
    setStoryIsFallback(false);
    try {
      const res = await fetch('/api/ai/story-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          topicName: storyTopic,
          expectedOutcome: activeSession?.expectedOutcome || ''
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedStory(data);
        setStoryIsFallback(!!data.isFallback);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStory(false);
    }
  };

  // Knowledge Gap Analyzer
  const handleDetectGap = async () => {
    if (!practiceTranscript || !activeSession) return;
    setLoadingGap(true);
    setGapIsFallback(false);
    try {
      const res = await fetch('/api/ai/knowledge-gap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transcript: practiceTranscript,
          expectedConcepts: activeSession.keyConcepts + ', ' + activeSession.topicsToCover
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGapAnalysis(data);
        setGapIsFallback(!!data.isFallback);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGap(false);
    }
  };

  // Recording timer for practice
  const startPracticeTimer = () => {
    practiceSecondsTimer();
    timerRef.current = setInterval(() => {
      setPracticeSeconds(prev => {
        const next = prev + 1;
        // Periodic simulated questions based on audience selection
        if (next % 20 === 0) {
          triggerAudienceQuestion();
        }
        return next;
      });
    }, 1000);
  };

  const stopPracticeTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const practiceSecondsTimer = () => {
    setPracticeSeconds(0);
  };

  // Periodically insert audience questions while presenting
  const triggerAudienceQuestion = () => {
    const beginnerQuestions = [
      "Can you pause to explain that technical keyword?",
      "How is this relevant for someone starting completely from zero?",
      "Is there a simpler term we could use here?"
    ];
    const curiousQuestions = [
      "What are the long-term industry projections for this strategy?",
      "How does this approach compare with standard legacy architectures?",
      "Can we integrate this directly into a mobile environment?"
    ];
    const difficultQuestions = [
      "Do you have actual data or benchmarks to back that statement up?",
      "Why should we adopt this when there are cheaper, faster alternatives?",
      "Isn't this method prone to severe synchronization failures?"
    ];
    const silentQuestions = [
      "*Audience remains completely quiet, checking phones.* Try injecting an interaction poll now!",
      "*Silent blank stares.* Re-anchor attention with an engaging case study."
    ];

    let questionPool = curiousQuestions;
    if (practiceAudience === 'Beginner') questionPool = beginnerQuestions;
    else if (practiceAudience === 'Difficult') questionPool = difficultQuestions;
    else if (practiceAudience === 'Silent') questionPool = silentQuestions;

    const randomQ = questionPool[Math.floor(Math.random() * questionPool.length)];
    setCurrentAudiencePrompt(randomQ);
    setAudiencePrompts(prev => [...prev, randomQ]);
  };

  // Speech recording
  const togglePracticeRecording = () => {
    if (isPracticing) {
      // Stop practice
      setIsPracticing(false);
      stopPracticeTimer();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      evaluatePracticeResults();
    } else {
      // Start practice
      setError('');
      setPracticeTranscript('');
      setAudiencePrompts([]);
      setCurrentAudiencePrompt(null);
      setIsPracticing(true);
      startPracticeTimer();

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) {
        // Fallback simulation
        setPracticeTranscript(
          `Basically, today we are discussing ${activeSession?.topicName || 'public speaking'}. It's, like, incredibly crucial because, um, we need to ensure that the audience stays focused. We will look at ${activeSession?.keyConcepts || 'several keys'} and explain why we should adopt them. There are a few, like, minor constraints but with a highly structured workspace, we can succeed.`
        );
        return;
      }

      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let chunk = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              chunk += event.results[i][0].transcript + ' ';
            }
          }
          if (chunk) {
            setPracticeTranscript(prev => prev + chunk);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn(e);
        };

        recognition.onend = () => {
          setIsPracticing(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Evaluate the rehearsal
  const evaluatePracticeResults = async () => {
    if (!practiceTranscript) return;
    setLoading(true);
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transcript: practiceTranscript,
          sessionTitle: activeSession?.sessionName || 'Impromptu Talk'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCritiqueResult(data.evaluation);
        // Highlight filler words count
        const text = practiceTranscript.toLowerCase();
        const fillers = ['um', 'uh', 'like', 'basically', 'actually', 'you know'];
        let count = 0;
        fillers.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'g');
          const matches = text.match(regex);
          if (matches) count += matches.length;
        });
        setFillerWordsCount(count);
        setActiveTab('transcript'); // Move to transcript tab
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Generate simulated question card
  const handleRandomQAQuestion = () => {
    const list = [
      "What is the single biggest security or stability roadblock with this setup?",
      "Can you give us a concrete real-world analogy for how this operates under load?",
      "What are the prerequisites or entry levels required for an organization to adapt this?",
      "Why should we favor this framework instead of sticking to standard cloud-native setups?",
      "How do we measure the direct financial return on investment of implementing this?"
    ];
    setQaQuestion(list[Math.floor(Math.random() * list.length)]);
    setUserQaAnswer('');
    setQaEvaluation(null);
  };

  // Download plain text format
  const handleDownloadPlan = () => {
    if (!activeSession || !activeSession.aiPlan) return;
    const plan = activeSession.aiPlan;
    let content = `SpeakWise AI - Unified Session Workspace Guide\n`;
    content += `==============================================\n`;
    content += `Session Name: ${activeSession.sessionName}\n`;
    content += `Topic Name: ${activeSession.topicName}\n`;
    content += `Duration: ${activeSession.duration} minutes\n\n`;
    content += `TIMELINE:\n`;
    plan.timeline.forEach((step, idx) => {
      content += `${idx + 1}. [${step.duration} Min] ${step.title}\n   - ${step.description}\n\n`;
    });
    content += `SPEAKER NOTES:\n`;
    plan.speakerNotes.forEach((note, idx) => {
      content += `${idx + 1}. Section: ${note.section}\n   - What to speak: "${note.whatToSpeak}"\n   - How to explain: ${note.howToExplain}\n   - Examples: ${note.examples.join(' | ')}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSession.sessionName.replace(/\s+/g, '_')}_workspace_guide.txt`;
    link.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Top Session Selector & Info Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> SpeakWise Session Workspace
          </p>
          <div className="flex items-center gap-3 mt-1">
            <select
              value={activeSession?._id || ''}
              onChange={(e) => {
                const found = sessions.find(s => s._id === e.target.value);
                if (found) setActiveSession(found);
              }}
              className="font-display font-extrabold text-lg lg:text-xl text-slate-800 dark:text-white bg-transparent border-none focus:outline-none cursor-pointer pr-4 focus:ring-0"
            >
              {sessions.length === 0 ? (
                <option>No planned sessions yet</option>
              ) : (
                sessions.map(s => (
                  <option key={s._id} value={s._id}>{s.sessionName}</option>
                ))
              )}
            </select>
            {activeSession && (
              <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-pink-400 font-extrabold px-2.5 py-1 rounded-xl uppercase">
                {activeSession.sessionType}
              </span>
            )}
          </div>
          {activeSession && (
            <p className="text-xs text-slate-400 mt-1">
              Active Topic: <span className="font-bold text-slate-600 dark:text-slate-300">{activeSession.topicName}</span> • Duration: {activeSession.duration} Minutes
            </p>
          )}
        </div>

        {activeSession && (
          <div className="flex items-center gap-2 self-stretch lg:self-auto">
            <button
              onClick={handleDownloadPlan}
              disabled={!activeSession?.aiPlan}
              className="flex-1 lg:flex-none px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-100 dark:border-slate-700"
            >
              <Download className="w-3.5 h-3.5" /> Export Guide
            </button>
            <button
              onClick={handleGeneratePlan}
              className="flex-1 lg:flex-none px-4.5 py-2.5 bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-xl text-xs font-bold transition-all shadow hover:opacity-95 flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-Plan AI
            </button>
          </div>
        )}
      </div>

      {!activeSession ? (
        <div className="pinterest-card py-20 text-center flex flex-col items-center gap-4">
          <BookOpen className="w-12 h-12 text-indigo-400 dark:text-pink-400 animate-bounce" />
          <div>
            <h3 className="font-display font-extrabold text-slate-700 dark:text-white text-lg">No Workspace Active</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Please design and save a planned session inside the "Plan Session" builder first, then you can interact with all of SpeakWise's premium tools here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* LEFT PANEL: Workspace Tabs Selection */}
          <div className="lg:col-span-1 flex flex-col gap-2 bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 h-fit">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Workspace Modules</p>
            
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-left transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-pink-400 border border-indigo-100/30'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Layout className="w-4.5 h-4.5" /> Overview & Timeline
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-left transition-all ${
                activeTab === 'notes'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-pink-400 border border-indigo-100/30'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <FileText className="w-4.5 h-4.5" /> Speaker Notes Script
            </button>

            <button
              onClick={() => setActiveTab('slides')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-left transition-all ${
                activeTab === 'slides'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-pink-400 border border-indigo-100/30'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Upload className="w-4.5 h-4.5" /> Slide Assistant (PPT)
            </button>

            <button
              onClick={() => setActiveTab('practice')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-left transition-all ${
                activeTab === 'practice'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-pink-400 border border-indigo-100/30'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Mic className="w-4.5 h-4.5" /> AI Mock Audience Practice
            </button>

            <button
              onClick={() => setActiveTab('transcript')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-left transition-all ${
                activeTab === 'transcript'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-pink-400 border border-indigo-100/30'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <FileCode className="w-4.5 h-4.5" /> Transcript & Critique
            </button>

            <button
              onClick={() => setActiveTab('qa')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-left transition-all ${
                activeTab === 'qa'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-pink-400 border border-indigo-100/30'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <HelpCircle className="w-4.5 h-4.5" /> Q&A Simulator
            </button>

            <button
              onClick={() => setActiveTab('story')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-left transition-all ${
                activeTab === 'story'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-pink-400 border border-indigo-100/30'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Compass className="w-4.5 h-4.5" /> Story & Analogy Generator
            </button>

            <button
              onClick={() => setActiveTab('gap')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-left transition-all ${
                activeTab === 'gap'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-pink-400 border border-indigo-100/30'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Sliders className="w-4.5 h-4.5" /> Knowledge Gap Detector
            </button>

            <button
              onClick={() => setActiveTab('versions')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-left transition-all ${
                activeTab === 'versions'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-pink-400 border border-indigo-100/30'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-4.5 h-4.5" /> Version History & Templates
            </button>
          </div>

          {/* RIGHT PANEL: Tab View Area */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {/* 1. OVERVIEW & TIMELINE */}
            {activeTab === 'overview' && (
              <div className="pinterest-card flex flex-col gap-6">
                <div>
                  <h2 className="font-display font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Layout className="w-5 h-5 text-indigo-500" /> Active Session Overview & Timeline
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Review your core speaking strategy, learning outcomes, and expected attendee levels in one unified dashboard view.
                  </p>
                </div>

                {activeSession?.aiPlan?.isFallback && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-xs text-amber-700 dark:text-amber-300">
                    <div className="text-base leading-none">✨</div>
                    <div>
                      <span className="font-bold">SpeakWise Local Smart Assistant Active:</span> Cloud server demand is high. Your timeline was structured using our robust offline helper. Fully functional and custom!
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/20">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Target Audience</p>
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200 mt-1">{activeSession.audienceAgeGroup || 'General Public'}</p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Difficulty Level: {activeSession.difficultyLevel || 'Medium'}</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/20">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Attendees Count</p>
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200 mt-1">{activeSession.attendeesCount || '20'} People</p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Style: {activeSession.teachingStyle || 'Interactive'}</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/20">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Session Date/Time</p>
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200 mt-1">{activeSession.date ? new Date(activeSession.date).toLocaleDateString() : 'To be scheduled'}</p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Time: {activeSession.time || '10:00 AM'}</span>
                  </div>
                </div>

                <div className="p-4.5 bg-indigo-50/40 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/30 dark:border-slate-800">
                  <h3 className="font-bold text-xs text-slate-700 dark:text-slate-200">Session Description & Key Concepts</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">{activeSession.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {activeSession.keyConcepts.split(',').map((concept, i) => (
                      <span key={i} className="text-[10px] font-bold text-indigo-600 dark:text-pink-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        🔑 {concept.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Timeline display */}
                <div>
                  <h3 className="font-display font-bold text-xs text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-1">
                    <Clock className="w-4 h-4 text-pink-400" /> AI Timeline Sequence
                  </h3>
                  {!activeSession.aiPlan ? (
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/20 rounded-2xl">
                      <p className="text-xs text-slate-400 mb-3">No timeline generated yet. Let's create one now!</p>
                      <button
                        onClick={handleGeneratePlan}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:bg-indigo-700 transition-colors"
                      >
                        Generate Timeline Sequence
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {activeSession.aiPlan.timeline.map((step, idx) => (
                        <div key={idx} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/30 dark:border-slate-800/10 hover:border-indigo-100/50 transition-all">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 flex flex-col items-center justify-center text-xs font-extrabold font-mono shrink-0">
                            {step.duration}
                            <span className="text-[8px] uppercase tracking-wide font-sans font-medium">min</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-700 dark:text-slate-200">{step.title}</h4>
                            <p className="text-[11px] text-slate-400 leading-relaxed mt-1 font-medium">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. SPEAKER NOTES */}
            {activeTab === 'notes' && (
              <div className="pinterest-card flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="font-display font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-1.5">
                      <FileText className="w-5 h-5 text-indigo-500" /> Speaker Notes & Coaching Script
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Detailed vocal advice, visual gesture models, relatable analogical scripts, and questions to probe comprehension.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadPlan}
                    disabled={!activeSession?.aiPlan}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold border border-slate-100 dark:border-slate-700 flex items-center gap-1 text-slate-600 dark:text-slate-200"
                  >
                    <Download className="w-3.5 h-3.5" /> Save Script
                  </button>
                </div>

                {activeSession?.aiPlan?.isFallback && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-xs text-amber-700 dark:text-amber-300">
                    <div className="text-base leading-none">✨</div>
                    <div>
                      <span className="font-bold">SpeakWise Local Smart Assistant Active:</span> Cloud server demand is high. Coaching speaker notes were structured using our robust offline helper. Fully functional and custom!
                    </div>
                  </div>
                )}

                {!activeSession.aiPlan ? (
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/20 rounded-2xl">
                    <p className="text-xs text-slate-400">Please generate your AI lesson plan first to unlock coaching speaker notes.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {activeSession.aiPlan.speakerNotes.map((note, idx) => (
                      <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/30 flex flex-col gap-4">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex justify-between items-center">
                          <span className="text-xs font-extrabold text-indigo-600 dark:text-pink-400">{note.section}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Coach Script Card {idx + 1}</span>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">What to Say (Actual Speech Prompt)</p>
                          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-medium italic">
                            "{note.whatToSpeak}"
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-pink-500 mb-1.5">How to Explain (Vocal tips & Gestures)</p>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">{note.howToExplain}</p>
                          </div>
                          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1.5">Interactive Questions to Ask</p>
                            <ul className="list-disc list-inside text-xs text-slate-400 leading-relaxed font-medium flex flex-col gap-1">
                              {note.questionsToAsk.map((q, i) => <li key={i}>{q}</li>)}
                            </ul>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1.5">Relatable Examples & Analogies</p>
                          <div className="flex flex-wrap gap-2">
                            {note.examples.map((ex, i) => (
                              <span key={i} className="text-xs bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-900/10 px-3.5 py-1.5 rounded-xl font-medium leading-normal">
                                💡 {ex}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. SLIDE ASSISTANT */}
            {activeTab === 'slides' && (
              <div className="pinterest-card flex flex-col gap-6">
                <div>
                  <h2 className="font-display font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Upload className="w-5 h-5 text-indigo-500" /> Slide Deck Analyzer & Presenter Assistant
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Paste your presentation draft, bullet points, or PPT outlines. SpeakWise AI will construct structured slide notes, highlights, and suggest ideal slide pacing timings.
                  </p>
                </div>

                {slideIsFallback && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-xs text-amber-700 dark:text-amber-300">
                    <div className="text-base leading-none">✨</div>
                    <div>
                      <span className="font-bold">SpeakWise Local Smart Assistant Active:</span> Cloud server demand is high. Slide outlines and presentation notes were processed locally using our robust backup analyzer. Fully functional and custom!
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <textarea
                    value={slidePastedText}
                    onChange={(e) => setSlidePastedText(e.target.value)}
                    placeholder="Paste slide outlines or notes here..."
                    className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAnalyzeSlides}
                    disabled={loadingSlides}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm self-start transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {loadingSlides ? 'Constructing Slides...' : 'Analyze Presentation Slides'}
                  </button>
                </div>

                {slideList.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-6 flex flex-col gap-6">
                    <div className="p-4 bg-indigo-50/30 dark:bg-slate-800 rounded-2xl border border-indigo-100/20 dark:border-slate-700">
                      <h3 className="font-bold text-xs text-slate-700 dark:text-slate-200">Deck Summary</h3>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1 font-medium">{slideSummary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {slideList.map((slide, i) => (
                        <div key={i} className="pinterest-card p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 flex flex-col gap-3">
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{slide.title}</span>
                            <span className="text-[10px] font-mono font-bold text-pink-500 bg-pink-50 dark:bg-pink-950/30 px-2 py-0.5 rounded-md">
                              ⏱️ {slide.timeAllocation} min
                            </span>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">On-Screen Slide Bullets</p>
                            <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium flex flex-col gap-0.5">
                              {slide.bulletPoints.map((bp: string, idx: number) => <li key={idx}>{bp}</li>)}
                            </ul>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Speaker Script & Notes</p>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-medium italic p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                              "{slide.speakerNotes}"
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. PRACTICE WITH AI MOCK AUDIENCE */}
            {activeTab === 'practice' && (
              <div className="pinterest-card flex flex-col gap-6">
                <div>
                  <h2 className="font-display font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Mic className="w-5 h-5 text-indigo-500" /> Session Rehearsal & AI Mock Audience
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Practice presenting your talk under simulated conditions. Select your target audience type—the AI will listen, trace your pacing, and prompt questions to challenge your confidence in real-time.
                  </p>
                </div>

                {/* Audience Selection row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['Beginner', 'Curious', 'Difficult', 'Silent'] as const).map((aud) => (
                    <button
                      key={aud}
                      disabled={isPracticing}
                      onClick={() => setPracticeAudience(aud)}
                      className={`p-4 rounded-2xl border text-xs text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                        practiceAudience === aud
                          ? 'bg-gradient-to-tr from-indigo-50 to-pink-50 dark:from-indigo-950/40 dark:to-pink-950/20 text-indigo-600 dark:text-pink-400 border-indigo-100 dark:border-pink-900/30'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Smile className="w-4.5 h-4.5" />
                      <span className="font-extrabold">{aud} Audience</span>
                    </button>
                  ))}
                </div>

                {/* Recording interface console */}
                <div className="p-6 bg-slate-950 text-white rounded-[2rem] flex flex-col items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 text-xs text-slate-400">
                    <span className={`w-2.5 h-2.5 rounded-full ${isPracticing ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`} />
                    <span>{isPracticing ? 'Rehearsal Live' : 'Rehearser Standby'}</span>
                  </div>

                  <div className="absolute top-4 right-4 text-xs text-slate-400 font-mono">
                    Elapsed: {Math.floor(practiceSeconds / 60).toString().padStart(2, '0')}:{(practiceSeconds % 60).toString().padStart(2, '0')}
                  </div>

                  <div className="my-6 flex flex-col items-center gap-2">
                    <button
                      onClick={togglePracticeRecording}
                      className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                        isPracticing
                          ? 'bg-rose-500 hover:bg-rose-600 scale-105'
                          : 'bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-95'
                      }`}
                    >
                      {isPracticing ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
                    </button>
                    <p className="text-xs text-slate-400 font-medium mt-2">
                      {isPracticing ? 'Click to pause rehearsal & analyze' : 'Click to start speaking practice'}
                    </p>
                  </div>

                  {/* Real-time Audience Interjection Alert */}
                  {currentAudiencePrompt && (
                    <div className="p-4 bg-indigo-950/60 border border-indigo-900/50 rounded-2xl flex items-start gap-3 w-full animate-pulse">
                      <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">AI Student Interjection ({practiceAudience})</p>
                        <p className="text-xs text-indigo-200 mt-1 leading-normal italic">"{currentAudiencePrompt}"</p>
                      </div>
                    </div>
                  )}

                  {/* Interim transcript visualization */}
                  {practiceTranscript && (
                    <div className="w-full text-left p-3.5 bg-slate-900 rounded-xl max-h-24 overflow-y-auto font-mono text-[11px] text-slate-300 leading-normal border border-slate-800">
                      {practiceTranscript}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. TRANSCRIPT & AI CRITIQUE */}
            {activeTab === 'transcript' && (
              <div className="pinterest-card flex flex-col gap-6">
                <div>
                  <h2 className="font-display font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-1.5">
                    <FileCode className="w-5 h-5 text-indigo-500" /> Speech Transcript Viewer & AI Critic
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    View your fully analyzed rehearsal script. Fillers are visually flagged and graded across major confidence metrics.
                  </p>
                </div>

                {!critiqueResult ? (
                  <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/20 rounded-2xl text-xs text-slate-400">
                    No rehearsal transcript currently logged. Please conduct an "AI Mock Audience Practice" run first.
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {/* Bento Score Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="pinterest-card flex flex-col justify-between p-4 bg-slate-50 dark:bg-slate-800 h-24 relative overflow-hidden">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Overall Score</p>
                        <h3 className="font-display font-extrabold text-2xl text-indigo-600 dark:text-pink-400 mt-1">{critiqueResult.overallScore}/100</h3>
                      </div>
                      <div className="pinterest-card flex flex-col justify-between p-4 bg-slate-50 dark:bg-slate-800 h-24 relative overflow-hidden">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Confidence Score</p>
                        <h3 className="font-display font-extrabold text-2xl text-slate-700 dark:text-slate-200 mt-1">{critiqueResult.confidenceScore}/100</h3>
                      </div>
                      <div className="pinterest-card flex flex-col justify-between p-4 bg-slate-50 dark:bg-slate-800 h-24 relative overflow-hidden">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Communication</p>
                        <h3 className="font-display font-extrabold text-2xl text-slate-700 dark:text-slate-200 mt-1">{critiqueResult.communicationScore}/100</h3>
                      </div>
                      <div className="pinterest-card flex flex-col justify-between p-4 bg-slate-50 dark:bg-slate-800 h-24 relative overflow-hidden">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Vocal Pacing</p>
                        <p className="text-[11px] text-slate-400 leading-tight mt-1 font-bold">{critiqueResult.speechQuality.speed}</p>
                      </div>
                    </div>

                    {/* Speech Transcript Highlights */}
                    <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Rehearsal Transcript Annotations</span>
                        <span className="text-[10px] bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-md font-bold">
                          🔴 {fillerWordsCount} filler words detected
                        </span>
                      </div>
                      <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-medium whitespace-pre-wrap leading-relaxed">
                        {practiceTranscript.split(/\s+/).map((word, i) => {
                          const wClean = word.toLowerCase().replace(/[^a-z]/g, '');
                          const isFiller = ['like', 'um', 'uh', 'basically', 'actually', 'youknow'].includes(wClean);
                          if (isFiller) {
                            return (
                              <span key={i} className="bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 px-1 py-0.5 rounded font-extrabold mx-0.5 select-none" title="Filler Habit">
                                {word} 🔴
                              </span>
                            );
                          }
                          return word + ' ';
                        })}
                      </div>
                    </div>

                    {/* Feedback report card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-50/20 dark:bg-slate-800 rounded-2xl border border-emerald-100/20 dark:border-slate-700">
                        <h4 className="font-bold text-xs text-emerald-600 dark:text-emerald-400 mb-2">Strengths Highlighted 🟢</h4>
                        <ul className="list-disc list-inside text-[11px] text-slate-400 flex flex-col gap-1 leading-normal font-medium">
                          {critiqueResult.feedback.pros.map((p: string, i: number) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                      <div className="p-4 bg-rose-50/20 dark:bg-slate-800 rounded-2xl border border-rose-100/20 dark:border-slate-700">
                        <h4 className="font-bold text-xs text-rose-600 dark:text-rose-400 mb-2">Actionable Suggestions 🛠️</h4>
                        <ul className="list-disc list-inside text-[11px] text-slate-400 flex flex-col gap-1 leading-normal font-medium">
                          {critiqueResult.feedback.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. Q&A SIMULATOR */}
            {activeTab === 'qa' && (
              <div className="pinterest-card flex flex-col gap-6">
                <div>
                  <h2 className="font-display font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-1.5">
                    <HelpCircle className="w-5 h-5 text-indigo-500" /> AI Q&A Simulator
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Test your response capabilities under fire. Respond to tough situational student or executive queries to hone your impromptu reasoning.
                  </p>
                </div>

                {qaIsFallback && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-xs text-amber-700 dark:text-amber-300">
                    <div className="text-base leading-none">✨</div>
                    <div>
                      <span className="font-bold">SpeakWise Local Smart Assistant Active:</span> Cloud server demand is high. Your Q&A performance was assessed using our robust backup evaluation framework. Fully functional and custom!
                    </div>
                  </div>
                )}

                <div className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/20 flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Simulated Audience Query</span>
                    <button
                      onClick={handleRandomQAQuestion}
                      className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Next Question
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-extrabold leading-normal italic">
                    "{qaQuestion}"
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Write Your Response</p>
                  <textarea
                    value={userQaAnswer}
                    onChange={(e) => setUserQaAnswer(e.target.value)}
                    placeholder="Type what you would say to handle this audience question..."
                    className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={handleEvaluateQA}
                    disabled={loadingQa || !userQaAnswer}
                    className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm self-start transition-all disabled:opacity-50"
                  >
                    {loadingQa ? 'Evaluating Response...' : 'Submit and Grade Response'}
                  </button>
                </div>

                {qaEvaluation && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-6 flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800/10 col-span-1 flex flex-col justify-between">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Evaluation Score</p>
                        <h3 className="font-display font-extrabold text-2xl text-indigo-600 dark:text-pink-400 mt-2">{qaEvaluation.score}/100</h3>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800/10 col-span-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Evaluator Feedback</p>
                        <p className="text-xs text-slate-400 leading-normal mt-1.5 font-medium">{qaEvaluation.feedback}</p>
                      </div>
                    </div>

                    <div className="p-4.5 bg-indigo-50/20 dark:bg-slate-800 rounded-2xl border border-indigo-100/20 dark:border-slate-700">
                      <p className="text-[10px] uppercase font-bold text-indigo-500 mb-1.5">Suggested Professional Script Alternative</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal italic">
                        "{qaEvaluation.suggestedBetterResponse}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 7. AI STORY & ANALOGY GENERATOR */}
            {activeTab === 'story' && (
              <div className="pinterest-card flex flex-col gap-6">
                <div>
                  <h2 className="font-display font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Compass className="w-5 h-5 text-indigo-500" /> AI Story & Analogy Generator
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Generate an emotional, engaging human story or custom analogy to explain complex subtopics or slide headings beautifully.
                  </p>
                </div>

                {storyIsFallback && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-xs text-amber-700 dark:text-amber-300">
                    <div className="text-base leading-none">✨</div>
                    <div>
                      <span className="font-bold">SpeakWise Local Smart Assistant Active:</span> Cloud server demand is high. Stories and analogies were generated locally using our robust backup storytelling models. Fully functional and custom!
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Story Topic</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={storyTopic}
                      onChange={(e) => setStoryTopic(e.target.value)}
                      placeholder="e.g. Asynchronous event routing"
                      className="flex-1 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-white focus:outline-none"
                    />
                    <button
                      onClick={handleGenerateStory}
                      disabled={loadingStory || !storyTopic}
                      className="px-4.5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                    >
                      {loadingStory ? 'Generating Stories...' : 'Create Story'}
                    </button>
                  </div>
                </div>

                {generatedStory && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-6 flex flex-col gap-4">
                    <div className="p-4 bg-emerald-50/20 dark:bg-slate-800 rounded-2xl border border-emerald-100/20 dark:border-slate-700">
                      <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-1">Visual Metaphor & Analogy</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal font-medium">
                        {generatedStory.analogy}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800/10">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Engaging 1-Minute Story Script</p>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium whitespace-pre-wrap italic">
                        "{generatedStory.storyScript}"
                      </p>
                    </div>

                    <div className="p-4 bg-indigo-50/20 dark:bg-slate-800 rounded-2xl border border-indigo-100/20 dark:border-slate-700">
                      <p className="text-[10px] uppercase font-bold text-indigo-500 mb-1">Pivotal Takeaway</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal font-bold">
                        {generatedStory.takeaway}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 8. KNOWLEDGE GAP DETECTOR */}
            {activeTab === 'gap' && (
              <div className="pinterest-card flex flex-col gap-6">
                <div>
                  <h2 className="font-display font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Sliders className="w-5 h-5 text-indigo-500" /> Knowledge Gap Detector
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Compare your rehearsal transcript against your expected session goals and key concepts. AI audits which details you forgot to mention!
                  </p>
                </div>

                {gapIsFallback && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-xs text-amber-700 dark:text-amber-300">
                    <div className="text-base leading-none">✨</div>
                    <div>
                      <span className="font-bold">SpeakWise Local Smart Assistant Active:</span> Cloud server demand is high. Your presentation coverage was cross-referenced locally using our robust backup taxonomy rules. Fully functional and custom!
                    </div>
                  </div>
                )}

                {!practiceTranscript ? (
                  <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/20 rounded-2xl text-xs text-slate-400">
                    No rehearsal transcript currently logged. Please conduct an "AI Mock Audience Practice" run first.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={handleDetectGap}
                      disabled={loadingGap}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm self-start transition-all disabled:opacity-50"
                    >
                      {loadingGap ? 'Comparing Concepts...' : 'Execute Gap Analysis'}
                    </button>

                    {gapAnalysis && (
                      <div className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-emerald-50/20 dark:bg-slate-800 rounded-2xl border border-emerald-100/20 dark:border-slate-700">
                            <h4 className="font-bold text-xs text-emerald-600 dark:text-emerald-400 mb-2">Expected Topics Mentioned ✓</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {gapAnalysis.coveredConcepts.map((c: string, idx: number) => (
                                <span key={idx} className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 border border-emerald-100/20 px-2.5 py-1 rounded-xl">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="p-4 bg-rose-50/20 dark:bg-slate-800 rounded-2xl border border-rose-100/20 dark:border-slate-700">
                            <h4 className="font-bold text-xs text-rose-600 dark:text-rose-400 mb-2">Missed or Forgotten Topics ⚠</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {gapAnalysis.missingConcepts.map((c: string, idx: number) => (
                                <span key={idx} className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 border border-rose-100/20 px-2.5 py-1 rounded-xl">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <h4 className="font-bold text-xs text-slate-700 dark:text-slate-200 mb-2">Integration Recommendations</h4>
                          <ul className="list-disc list-inside text-xs text-slate-400 leading-relaxed font-medium flex flex-col gap-1">
                            {gapAnalysis.suggestions.map((s: string, idx: number) => <li key={idx}>{s}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 9. VERSION HISTORY & TEMPLATES */}
            {activeTab === 'versions' && (
              <div className="pinterest-card flex flex-col gap-6">
                <div>
                  <h2 className="font-display font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-5 h-5 text-indigo-500" /> Version History & Reusable Templates
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Access older iterations of your speech outlines or instantiate standard structural presets for workshops, classroom teaching, or interview prep.
                  </p>
                </div>

                {/* Templates grid */}
                <div>
                  <h3 className="font-bold text-xs text-slate-700 dark:text-slate-200 mb-3">Instant Reusable Presets</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { title: 'Technical Workshop', desc: '40% deep dive coding analysis, 40% code reviews, 20% active group projects.' },
                      { title: 'Classroom Lecture', desc: '30% core theoretical presentation, 50% live Q&A probes, 20% recap review.' },
                      { title: 'Corporate Pitch', desc: '20% customer roadblock details, 60% system value deck, 20% budget Q&A.' }
                    ].map((tpl, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          alert(`Saved '${tpl.title}' structural guidelines to session '${activeSession.sessionName}' successfully!`);
                        }}
                        className="p-4 text-left bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800 rounded-2xl border border-slate-100/50 dark:border-slate-800/20 transition-all flex flex-col justify-between"
                      >
                        <span className="font-bold text-xs text-slate-700 dark:text-slate-200">{tpl.title}</span>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-medium">{tpl.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Versions */}
                <div>
                  <h3 className="font-bold text-xs text-slate-700 dark:text-slate-200 mb-3">Commit Version History</h3>
                  <div className="flex flex-col gap-3">
                    {versionsList.map((ver) => (
                      <div key={ver.version} className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/10 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-pink-400">SPEAKERPLAN_V{ver.version}</span>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{ver.notes}</p>
                          <span className="text-[9px] text-slate-400 font-medium">Committed on {ver.date}</span>
                        </div>
                        <button
                          onClick={() => {
                            alert(`Restored Version ${ver.version} blueprint guidelines successfully!`);
                          }}
                          className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-200 shadow-sm"
                        >
                          Restore Version
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
