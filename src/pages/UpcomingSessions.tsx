/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit, 
  Clock, 
  MapPin, 
  Bell, 
  Sparkles, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Info
} from 'lucide-react';
import { IUpcomingSession } from '../types.js';

export const UpcomingSessions: React.FC = () => {
  const { token, fetchNotifications } = useAuth();
  
  const [events, setEvents] = useState<IUpcomingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Form State (Add / Edit)
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState('');

  // Form inputs
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('45');
  const [location, setLocation] = useState('');
  const [alertReminder, setAlertReminder] = useState(true);

  useEffect(() => {
    if (token) {
      loadEvents();
    }
  }, [token]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/upcoming-sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (e) {
      console.error('Error fetching calendar events:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title || !topic || !date || !time) {
      setError('Title, topic, date, and time are required.');
      return;
    }

    setLoading(true);
    try {
      const url = isEditing ? `/api/upcoming-sessions/${editId}` : '/api/upcoming-sessions';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          topic,
          date,
          time,
          duration: Number(duration),
          location: location || 'Virtual Zoom Room',
          alertReminder
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save calendar event.');
      }

      if (isEditing) {
        setEvents(prev => prev.map(e => e._id === editId ? data.session : e));
      } else {
        setEvents(prev => [...prev, data.session]);
      }

      setShowForm(false);
      setIsEditing(false);
      resetForm();
      fetchNotifications(); // update alerts
    } catch (err: any) {
      setError(err.message || 'Error processing save.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this scheduled event from your calendar?')) return;
    try {
      const res = await fetch(`/api/upcoming-sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (ev: IUpcomingSession) => {
    setTitle(ev.title);
    setTopic(ev.topic);
    setDate(ev.date.split('T')[0]);
    setTime(ev.time);
    setDuration(String(ev.duration));
    setLocation(ev.location || '');
    setAlertReminder(ev.alertReminder ?? true);
    setEditId(ev._id);
    setIsEditing(true);
    setShowForm(true);
  };

  const resetForm = () => {
    setTitle('');
    setTopic('');
    setDate('');
    setTime('');
    setDuration('45');
    setLocation('');
    setAlertReminder(true);
    setEditId('');
    setIsEditing(false);
  };

  // Helper: Month calculations for our Custom Calendar Grid
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Map events to daily slots
  const getEventsForDay = (day: number) => {
    return events.filter(e => {
      const eDate = new Date(e.date);
      return eDate.getDate() === day && 
             eDate.getMonth() === month && 
             eDate.getFullYear() === year;
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white tracking-tight">Calendar Scheduling</h1>
          <p className="text-xs text-slate-400 font-medium">Coordinate upcoming workshops and track active reminders</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold rounded-xl border border-indigo-100/50 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Schedule Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Month Grid Custom Calendar (2 cols wide) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          <div className="pinterest-card">
            {/* Month Controller */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-extrabold text-base text-slate-800 dark:text-white">
                {monthNames[month]} {year}
              </h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextMonth} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays Labels */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 text-[10px] uppercase mb-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Month Day Slots */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty padding day slots */}
              {[...Array(firstDay)].map((_, i) => (
                <div key={`empty-${i}`} className="h-16 md:h-20 bg-slate-50/40 dark:bg-slate-950/10 rounded-xl" />
              ))}

              {/* Active days in month */}
              {[...Array(daysInMonth)].map((_, idx) => {
                const dayNum = idx + 1;
                const dayEvents = getEventsForDay(dayNum);
                const isToday = new Date().getDate() === dayNum && new Date().getMonth() === month && new Date().getFullYear() === year;
                const isSelected = selectedDay === dayNum;

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedDay(dayNum)}
                    className={`h-16 md:h-20 p-2 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-tr from-[#E8E5F8]/40 to-[#FFF0E6]/30 border-indigo-300 dark:border-indigo-900 shadow-sm'
                        : isToday
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 text-indigo-600 dark:text-pink-400 font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold">{dayNum}</span>
                    
                    {/* Event indicators */}
                    {dayEvents.length > 0 && (
                      <div className="flex gap-1 overflow-x-hidden">
                        {dayEvents.slice(0, 3).map(e => (
                          <span
                            key={e._id}
                            title={e.title}
                            className="w-2 h-2 rounded-full bg-pink-400 shrink-0 animate-pulse"
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] font-bold text-slate-400">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick instructions or help card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800/10 flex gap-3 text-xs">
            <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="text-left leading-relaxed text-slate-400 font-medium">
              <strong className="text-slate-700 dark:text-slate-300">Upcoming Alerts & Background Checking:</strong> SpeakWise runs a server-side polling trigger checking every few seconds for upcoming sessions. When an event is scheduled for the current hour, you will automatically receive a custom alert notification in your sidebar feed!
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Scheduled Events List & Action Form */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          
          {/* Scheduling form Slide-Over Panel */}
          {showForm && (
            <div className="pinterest-card p-6 bg-gradient-to-br from-indigo-50/30 to-pink-50/40 dark:from-slate-900 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-pink-500" />
                  {isEditing ? 'Edit Calendar Event' : 'Schedule New Event'}
                </h3>
                <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="p-2 mb-3 text-xs text-rose-500 bg-rose-50 rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateOrUpdate} className="flex flex-col gap-3 text-xs text-slate-600 dark:text-slate-300 text-left">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">Event Title *</label>
                  <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Q3 Product Review Keynote" className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold">Topic *</label>
                  <input required type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., UX/UI Roadmaps" className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold">Date *</label>
                    <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold">Time *</label>
                    <input required type="time" value={time} onChange={e => setTime(e.target.value)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold">Duration (Minutes)</label>
                    <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold">Location / Link</label>
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Virtual Zoom Link" className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2 ml-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-400 text-[10px] uppercase">
                    <input
                      type="checkbox"
                      checked={alertReminder}
                      onChange={e => setAlertReminder(e.target.checked)}
                      className="rounded"
                    />
                    Enable Automatic Alert Reminder
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold rounded-2xl flex items-center justify-center gap-1 shadow mt-2"
                >
                  Save Event
                </button>
              </form>
            </div>
          )}

          {/* List panel side-by-side */}
          <div className="pinterest-card">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-4">
              {selectedDay ? `Scheduled Events on Day ${selectedDay}` : 'All Scheduled Events'}
            </h3>

            {events.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">No scheduled sessions found.</div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto no-scrollbar">
                {(selectedDay ? getEventsForDay(selectedDay) : events).map(ev => (
                  <div key={ev._id} className="p-3.5 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800/20 text-left flex flex-col gap-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-700 dark:text-slate-200 truncate">{ev.title}</h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{ev.topic}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => startEdit(ev)} className="p-1 bg-white dark:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-500 border border-slate-100">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(ev._id)} className="p-1 bg-white dark:bg-slate-800 rounded-lg text-rose-400 hover:text-rose-600 border border-slate-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 border-t border-slate-100/50 pt-2 font-medium">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{ev.date.split('T')[0]} @ {ev.time} ({ev.duration}m)</span>
                      </div>
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-pink-400" />
                        <span className="truncate">{ev.location}</span>
                      </div>
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
