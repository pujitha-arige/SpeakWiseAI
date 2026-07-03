/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  ArrowRight, 
  Video, 
  Flame, 
  CheckCircle, 
  HelpCircle, 
  Trash2, 
  Clock, 
  Award,
  BookOpen,
  Volume2
} from 'lucide-react';
import { IPracticeEvaluation, ISession } from '../types.js';

export const PracticeSession: React.FC = () => {
  const { token } = useAuth();
  
  const [sessions, setSessions] = useState<ISession[]>([]);
  const [evaluations, setEvaluations] = useState<IPracticeEvaluation[]>([]);
  const [activeEval, setActiveEval] = useState<IPracticeEvaluation | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [sessionTitle, setSessionTitle] = useState('My Impromptu Pitch');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');

  // Speech Recognition Reference
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (token) {
      loadSessionsAndLogs();
    }
    return () => {
      stopRecordingTimer();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [token]);

  // Loading Step Animator
  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % 4);
      }, 3500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const loadSessionsAndLogs = async () => {
    try {
      // Load planned sessions for dropdown selection
      const sRes = await fetch('/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (sRes.ok) {
        const sList = await sRes.json();
        setSessions(sList);
        if (sList.length > 0) {
          setSelectedSessionId(sList[0]._id);
          setSessionTitle(sList[0].sessionName);
        }
      }

      // Load past evaluations
      const eRes = await fetch('/api/evaluations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (eRes.ok) {
        const eList = await eRes.json();
        setEvaluations(eList);
        if (eList.length > 0 && !activeEval) {
          setActiveEval(eList[0]);
        }
      }
    } catch (err) {
      console.error('Error loading coaching logs:', err);
    }
  };

  const handleSessionSelect = (id: string) => {
    setSelectedSessionId(id);
    const found = sessions.find(s => s._id === id);
    if (found) {
      setSessionTitle(found.sessionName);
    }
  };

  // Start Voice Recognition
  const startRecording = () => {
    setError('');
    setTranscript('');
    setSeconds(0);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Web Speech API is not fully supported in this browser. Please type or simulate your speech instead below.');
      setIsRecording(true);
      startRecordingTimer();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        startRecordingTimer();
        console.log('Voice recording started.');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(prev => prev + ' ' + finalTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone permission was denied. Verify permission settings.');
          stopRecording();
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        stopRecordingTimer();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setError('Error starting speech engine. Type mock text to test.');
      setIsRecording(true);
      startRecordingTimer();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    stopRecordingTimer();
  };

  const startRecordingTimer = () => {
    stopRecordingTimer();
    timerRef.current = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Post to backend for Gemini evaluation
  const submitSpeechForEvaluation = async () => {
    if (!transcript.trim()) {
      setError('Speech transcript is empty. Speak into mic or type a script.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transcript,
          sessionTitle,
          sessionId: selectedSessionId,
          durationSeconds: seconds || Math.max(15, Math.round(transcript.split(' ').length / 2))
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Speech coach failed to evaluate.');
      }

      setEvaluations(prev => [data.evaluation, ...prev]);
      setActiveEval(data.evaluation);
      // Reset practice fields
      setTranscript('');
      setSeconds(0);
    } catch (err: any) {
      setError(err.message || 'Error conducting coaching analysis.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvaluation = async (id: string) => {
    if (!window.confirm('Delete this speech report from records?')) return;
    try {
      const res = await fetch(`/api/evaluations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setEvaluations(prev => prev.filter(e => e._id !== id));
        if (activeEval?._id === id) {
          setActiveEval(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const reassureMessages = [
    "SpeakWise AI is transcribing and aligning presentation objectives...",
    "Reviewing vocal variety, tone frequencies, and filler counts...",
    "Drafting positive pros, speaker flaws, and pacing suggestions...",
    "Finalizing dynamic coaching dashboard score matrices..."
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <h1 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white tracking-tight">AI Speaker Coach</h1>
        <p className="text-xs text-slate-400 font-medium">Record live pitch presentations and get professional communication feedback</p>
      </div>

      {loading ? (
        /* ==================== LOADING SCREEN ==================== */
        <div className="pinterest-card py-20 max-w-2xl mx-auto text-center flex flex-col items-center justify-center gap-6">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-slate-800" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-pink-500 animate-spin" />
            <Mic className="w-8 h-8 text-indigo-500 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white">Coaching Pitch Analysis</h3>
            <p className="text-xs text-indigo-500 font-bold mt-1.5 animate-pulse">
              {reassureMessages[loadingStep]}
            </p>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-3">
              This can take up to 15 seconds. SpeakWise is grading vocabulary structure and drafting vocal recommendations.
            </p>
          </div>
        </div>
      ) : (
        /* ==================== SPEAKER COACH WORKSPACE ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT COLUMN: Record Panel */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            
            {/* Record widget card */}
            <div className="pinterest-card p-6 bg-gradient-to-tr from-indigo-50/40 via-white to-pink-50/40 dark:from-slate-900 border border-slate-100/50 dark:border-slate-800 flex flex-col gap-5">
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-indigo-500" />
                Live Recording Studio
              </h3>

              {error && (
                <div className="p-3 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 rounded-xl">
                  {error}
                </div>
              )}

              {/* Selector */}
              <div className="flex flex-col gap-1.5 text-xs text-left">
                <label className="font-semibold text-slate-500">Practice Session Topic</label>
                {sessions.length > 0 ? (
                  <select
                    disabled={isRecording}
                    value={selectedSessionId}
                    onChange={e => handleSessionSelect(e.target.value)}
                    className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all"
                  >
                    {sessions.map(s => (
                      <option key={s._id} value={s._id} className="dark:bg-slate-900 dark:text-white">{s.sessionName}</option>
                    ))}
                    <option value="Impromptu" className="dark:bg-slate-900 dark:text-white">Custom Impromptu Talk</option>
                  </select>
                ) : (
                  <input
                    disabled={isRecording}
                    type="text"
                    value={sessionTitle}
                    onChange={e => setSessionTitle(e.target.value)}
                    placeholder="e.g., Mastering the Impromptu Pitch"
                    className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all"
                  />
                )}
                {selectedSessionId === 'Impromptu' && (
                  <input
                    disabled={isRecording}
                    type="text"
                    value={sessionTitle}
                    onChange={e => setSessionTitle(e.target.value)}
                    placeholder="Enter custom impromptu topic..."
                    className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl mt-1.5 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all"
                  />
                )}
              </div>

              {/* Mic buttons and feedback */}
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 ${
                    isRecording 
                      ? 'bg-rose-500 hover:bg-rose-600 animate-pulse scale-105 ring-4 ring-rose-100 dark:ring-rose-950' 
                      : 'bg-gradient-to-r from-indigo-500 to-pink-500 hover:scale-105 ring-4 ring-indigo-50 dark:ring-indigo-950'
                  }`}
                >
                  {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isRecording ? 'RECORDING ACTIVE' : 'MICROPHONE READY'}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 justify-center mt-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Elapsed: {formatTime(seconds)}</span>
                  </div>
                </div>
              </div>

              {/* Live transcript text area */}
              <div className="flex flex-col gap-1.5 text-xs text-left">
                <label className="font-semibold text-slate-500">Scrolling Speech Transcript</label>
                <textarea
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  placeholder={isRecording ? 'Start speaking now. Your voice will transcribe here in real-time...' : 'Or type/paste your speech script directly here to analyze...'}
                  rows={4}
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-2xl resize-none font-medium leading-relaxed focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all"
                />
              </div>

              <button
                onClick={submitSpeechForEvaluation}
                disabled={isRecording || !transcript.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold rounded-2xl text-xs shadow hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                Evaluate Pitch Delivery
                <Sparkles className="w-4 h-4 text-pink-300" />
              </button>
            </div>

            {/* List past coaching history logs */}
            <div className="pinterest-card">
              <h3 className="font-display font-bold text-xs text-slate-800 dark:text-white mb-4">Past Coaching History</h3>
              {evaluations.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No practice logs found.</div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto no-scrollbar">
                  {evaluations.map(e => (
                    <div
                      key={e._id}
                      onClick={() => setActiveEval(e)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        activeEval?._id === e._id
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <h4 className="font-bold text-xs text-slate-700 dark:text-slate-200 truncate">{e.sessionTitle}</h4>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                        <span>Score: <strong className="text-indigo-500">{e.overallScore}</strong></span>
                        <span>{e.evaluatedAt.split('T')[0]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Results Presentation Panel */}
          <div className="lg:col-span-2">
            {!activeEval ? (
              <div className="pinterest-card py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-4">
                <Mic className="w-12 h-12 text-indigo-400 dark:text-pink-400" />
                <div>
                  <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">No coach report loaded</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Start speaking or select a past coaching report to inspect performance.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                
                {/* Score Dials and Header */}
                <div className="pinterest-card">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded uppercase">
                        AI Coach Evaluation
                      </span>
                      <h2 className="font-display font-extrabold text-lg text-slate-800 dark:text-white mt-2">
                        Speech Report: {activeEval.sessionTitle}
                      </h2>
                      <p className="text-[10px] text-slate-400 mt-0.5">Evaluated at: {new Date(activeEval.evaluatedAt).toLocaleString()} ({activeEval.durationSeconds} seconds)</p>
                    </div>
                    <button
                      onClick={() => handleDeleteEvaluation(activeEval._id)}
                      className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scores circular grid dials */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {/* Overall Score */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800/30">
                      <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-pink-400 font-extrabold text-lg flex items-center justify-center border-2 border-indigo-300">
                        {activeEval.overallScore}%
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2.5">Overall Score</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 uppercase font-semibold">Weighted Competency</p>
                    </div>

                    {/* Confidence Score */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800/30">
                      <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-extrabold text-lg flex items-center justify-center border-2 border-emerald-300">
                        {activeEval.confidenceScore}%
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2.5">Confidence</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 uppercase font-semibold">Vocal Projection</p>
                    </div>

                    {/* Communication Score */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800/30">
                      <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-extrabold text-lg flex items-center justify-center border-2 border-purple-300">
                        {activeEval.communicationScore}%
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2.5">Clarity & Communication</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 uppercase font-semibold">Message Clarity</p>
                    </div>

                    {/* Engagement Score */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800/30">
                      <div className="w-14 h-14 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400 font-extrabold text-lg flex items-center justify-center border-2 border-pink-300">
                        {activeEval.engagementScore}%
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2.5">Engagement</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 uppercase font-semibold">Audience Interest</p>
                    </div>
                  </div>
                </div>

                {/* Speech Quality Breakdown */}
                <div className="pinterest-card">
                  <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 mb-4">
                    <Volume2 className="w-4 h-4 text-indigo-500" /> Speech Quality & Vocal Delivery Analysis
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-left">
                    <div className="flex flex-col gap-2.5">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/20 rounded-xl">
                        <strong className="text-slate-400 text-[10px] uppercase block mb-0.5">Clarity</strong>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">{activeEval.speechQuality.clarity}</p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/20 rounded-xl">
                        <strong className="text-slate-400 text-[10px] uppercase block mb-0.5">Confidence Cues</strong>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">{activeEval.speechQuality.confidence}</p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/20 rounded-xl">
                        <strong className="text-slate-400 text-[10px] uppercase block mb-0.5">Tone Mood</strong>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">{activeEval.speechQuality.tone}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/20 rounded-xl">
                        <strong className="text-slate-400 text-[10px] uppercase block mb-0.5">Vocal Speed & Pacing</strong>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">{activeEval.speechQuality.speed}</p>
                      </div>

                      {/* Filler words list */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/20 rounded-xl">
                        <div className="flex justify-between items-center mb-1.5">
                          <strong className="text-slate-400 text-[10px] uppercase">Detected Filler Words</strong>
                          <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                            {activeEval.speechQuality.fillerCount} fillers
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {activeEval.speechQuality.fillerWords.map((word, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 rounded-lg text-[10px] font-bold tracking-wide">
                              "{word}"
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pros and Cons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="pinterest-card p-5 border-emerald-100/50 dark:border-slate-800">
                    <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-3">
                      <CheckCircle className="w-4 h-4" /> Strong Key Deliveries (Pros)
                    </h4>
                    <ul className="flex flex-col gap-2 list-none text-slate-500 dark:text-slate-400 font-semibold pl-1">
                      {activeEval.feedback.pros.map((pro, idx) => (
                        <li key={idx} className="flex gap-2 items-start">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pinterest-card p-5 border-rose-100/50 dark:border-slate-800">
                    <h4 className="font-bold text-rose-500 flex items-center gap-1.5 mb-3">
                      <MicOff className="w-4 h-4 text-rose-500" /> Coaching Critiques (Cons)
                    </h4>
                    <ul className="flex flex-col gap-2 list-none text-slate-500 dark:text-slate-400 font-semibold pl-1">
                      {activeEval.feedback.cons.map((con, idx) => (
                        <li key={idx} className="flex gap-2 items-start">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Suggestions and action steps */}
                <div className="pinterest-card p-6 bg-gradient-to-tr from-indigo-50/50 via-white to-pink-50/40 dark:from-slate-900 border border-slate-100 dark:border-slate-800">
                  <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 mb-4">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    How to Instantly Improve Your Pitch
                  </h3>
                  <div className="flex flex-col gap-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                    {activeEval.feedback.suggestions.map((sug, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-white/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/20">
                        <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-indigo-500 shrink-0">
                          {idx + 1}
                        </span>
                        <p>{sug}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Raw Speech Transcript Card */}
                <div className="pinterest-card p-5">
                  <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wide mb-3">Recorded Speech Script</h3>
                  <p className="text-slate-500 dark:text-slate-300 italic font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/10 text-xs">
                    "{activeEval.transcript}"
                  </p>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
