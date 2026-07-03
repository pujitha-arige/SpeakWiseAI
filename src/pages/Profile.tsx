/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { 
  User, 
  Camera, 
  Image as ImageIcon, 
  Briefcase, 
  Award, 
  Check, 
  Sparkles, 
  Settings, 
  Bell, 
  Moon, 
  Sun,
  Video,
  Clock
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, token, updateUser, theme, toggleTheme } = useAuth();

  // Form State
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [occupation, setOccupation] = useState(user?.occupation || '');
  const [experience, setExperience] = useState(user?.experience || '0-2 Years');
  const [skills, setSkills] = useState<string>(() => {
    if (Array.isArray(user?.skills)) {
      return user.skills.join(', ');
    }
    return (user?.skills as any) || '';
  });
  
  // Base64 Images
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [coverPic, setCoverPic] = useState(user?.coverImage || '');

  // Sync state if user context updates
  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setOccupation(user.occupation || '');
      setExperience(user.experience || '0-2 Years');
      if (Array.isArray(user.skills)) {
        setSkills(user.skills.join(', '));
      } else {
        setSkills((user.skills as any) || '');
      }
      setProfilePic(user.profilePic || '');
      setCoverPic(user.coverImage || '');
    }
  }, [user]);

  // Notifications toggles
  const [reminders, setReminders] = useState(true);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePic(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPic(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          bio,
          occupation,
          experience,
          skills,
          profilePic,
          coverPic,
          coverImage: coverPic
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      updateUser(data.user);
      setSuccess('Profile settings successfully updated and synchronized!');
    } catch (err: any) {
      setError(err.message || 'Error updating profile.');
    } finally {
      setLoading(false);
    }
  };

  const skillsList = typeof skills === 'string'
    ? (skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [])
    : (Array.isArray(skills) ? skills : []);

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      
      {/* Cover Backdrop Photo block */}
      <div className="relative w-full h-44 rounded-[2.5rem] bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-sm group">
        {coverPic ? (
          <img src={coverPic} alt="Cover backdrop" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#E8E5F8] via-[#F3EDF7] to-[#FFF0E6] dark:from-slate-950 dark:via-purple-950 dark:to-slate-950 flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-indigo-400 dark:text-pink-400 animate-pulse" />
          </div>
        )}
        
        {/* Cover Photo camera upload button overlay */}
        <label className="absolute right-4 bottom-4 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur text-slate-600 dark:text-slate-300 shadow cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="w-4 h-4" />
          <input type="file" accept="image/*" onChange={handleCoverImageUpload} className="hidden" />
        </label>
      </div>

      {/* Main Grid: Info form and settings panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start -mt-16 relative z-10 px-4 md:px-8">
        
        {/* LEFT COLUMN: Visual profile details card */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          
          <div className="pinterest-card text-center flex flex-col items-center p-6 bg-white dark:bg-slate-900 shadow-lg pt-16 relative">
            {/* Avatar block with camera upload */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-3xl bg-indigo-50 dark:bg-slate-800 ring-4 ring-white dark:ring-slate-900 shadow-md overflow-hidden group">
              {profilePic ? (
                <img src={profilePic} alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-extrabold text-2xl text-indigo-500">
                  {user?.name.charAt(0)}
                </div>
              )}
              {/* camera upload trigger */}
              <label className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-5 h-5" />
                <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
              </label>
            </div>

            <div className="mt-6">
              <h2 className="font-display font-extrabold text-base text-slate-800 dark:text-white">{user?.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{user?.occupation || 'Conference Presenter'}</p>
            </div>

            {/* Speaking credentials status bar */}
            <div className="grid grid-cols-2 gap-2 w-full mt-6 text-xs border-t border-slate-100 dark:border-slate-800/80 pt-4 text-slate-500">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                <p className="font-bold text-slate-700 dark:text-slate-300">{user?.experience || '0-2 Years'}</p>
                <p className="text-[9px] text-slate-400 font-semibold uppercase">Speaking Rank</p>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                <p className="font-bold text-slate-700 dark:text-slate-300">Gold Pro</p>
                <p className="text-[9px] text-slate-400 font-semibold uppercase">Badge Rank</p>
              </div>
            </div>

            {/* Skills Pills */}
            <div className="w-full border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4 text-left">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wide mb-2.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                Verified Speaking Skills
              </h3>
              {skillsList.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No custom skills listed. Add them below!</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {skillsList.map((sk, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-pink-400 text-[10px] font-bold rounded-lg border border-indigo-100/20">
                      {sk}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Biography readout */}
            {user?.bio && (
              <div className="w-full border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4 text-left">
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wide mb-1.5">Bio Outline</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">"{user.bio}"</p>
              </div>
            )}
          </div>

          {/* Quick Stats Summary Card */}
          <div className="pinterest-card p-5 text-left text-xs bg-gradient-to-tr from-indigo-50/50 to-pink-50/40 dark:from-slate-900 border border-slate-100 dark:border-slate-800">
            <h4 className="font-display font-bold text-slate-800 dark:text-white mb-2">SpeakWise Journey Stats</h4>
            <div className="flex flex-col gap-2.5 mt-3 text-slate-500 font-medium">
              <div className="flex justify-between items-center">
                <span>Account Created</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(user?.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Database Synced</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">Yes (MERN Connected)</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Settings form and panels */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          
          {/* Main Edit Profile form */}
          <div className="pinterest-card">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 mb-5">
              <Settings className="w-4 h-4 text-indigo-500" />
              Edit Speaker Identity
            </h3>

            {success && (
              <div className="p-3 mb-4 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100">
                {success}
              </div>
            )}

            {error && (
              <div className="p-3 mb-4 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300 text-left">
              <div className="flex flex-col gap-1">
                <label className="font-semibold">Display Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Occupation / Role</label>
                <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="Keynote presenter" className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Speaking Experience</label>
                <select value={experience} onChange={e => setExperience(e.target.value)} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all">
                  <option value="0-2 Years" className="dark:bg-slate-900 dark:text-white">0-2 Years (Beginner)</option>
                  <option value="3-5 Years" className="dark:bg-slate-900 dark:text-white">3-5 Years (Intermediate)</option>
                  <option value="5+ Years" className="dark:bg-slate-900 dark:text-white">5+ Years (Professional)</option>
                  <option value="10+ Years" className="dark:bg-slate-900 dark:text-white">10+ Years (Elite Keynote)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">Speaking Skills (comma separated)</label>
                <input type="text" value={skills} onChange={e => setSkills(e.target.value)} placeholder="Vocal variety, Stage movement, Storytelling" className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="font-semibold">Short Presenter Biography</label>
                <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Share your speaker background and audience engagement goals..." className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-pink-500/20 focus:border-indigo-500 dark:focus:border-pink-500 focus:outline-none transition-all" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full md:col-span-2 py-3 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow mt-2"
              >
                {loading ? 'Saving Profile...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>

          {/* Settings & Configuration Cards */}
          <div className="pinterest-card text-left">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 mb-5">
              <Settings className="w-4 h-4 text-indigo-500" /> Preferential Configuration Controls
            </h3>

            <div className="flex flex-col gap-4 text-xs font-medium">
              {/* Theme Settings toggle */}
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/10">
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200">Active Theme Color Preset</p>
                  <p className="text-[10px] text-slate-400">Toggle between pastel light and glassmorphism twilight themes</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-[10px] font-bold border border-slate-100 flex items-center gap-1.5 shadow-sm text-indigo-500"
                >
                  {theme === 'light' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-pink-500" />}
                  {theme === 'light' ? 'Pinterest Light' : 'Glass Twilight'}
                </button>
              </div>

              {/* Notification toggle */}
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/10">
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200">Session Alert Notifications</p>
                  <p className="text-[10px] text-slate-400">Check background events scheduled for the current hour</p>
                </div>
                <button
                  onClick={() => setReminders(!reminders)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1 ${reminders ? 'bg-indigo-500' : 'bg-slate-400'}`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  {reminders ? 'Enabled' : 'Disabled'}
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
