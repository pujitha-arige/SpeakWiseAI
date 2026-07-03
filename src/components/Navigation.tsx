/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { 
  LayoutDashboard, 
  FileText, 
  Mic, 
  Calendar, 
  BarChart2, 
  User, 
  LogOut, 
  Sun, 
  Moon, 
  Bell, 
  Menu, 
  X,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Layers
} from 'lucide-react';

interface NavigationProps {
  currentHash: string;
  onNavigate: (hash: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentHash, onNavigate }) => {
  const { user, logout, theme, toggleTheme, notifications, markNotificationsRead } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const menuItems = [
    { id: '#dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: '#workspace', label: 'Session Workspace', icon: Layers },
    { id: '#plan-session', label: 'Plan Session', icon: FileText },
    { id: '#coaching', label: 'Speaker Practice', icon: Mic },
    { id: '#upcoming', label: 'Upcoming Sessions', icon: Calendar },
    { id: '#analytics', label: 'Coaching Analytics', icon: BarChart2 },
    { id: '#profile', label: 'Profile Hub', icon: User },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'reminder':
        return <Calendar className="w-5 h-5 text-amber-500" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/60 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            S
          </div>
          <span className="font-display font-bold tracking-tight text-lg text-slate-800 dark:text-white">SpeakWise</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Notifications Trigger */}
          <button 
            onClick={() => { setShowNotifications(!showNotifications); markNotificationsRead(); }}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>
          
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800/60 transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:flex lg:flex-col lg:justify-between p-6`}>
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-400 via-purple-400 to-pink-400 flex items-center justify-center text-white font-extrabold text-xl shadow-md animate-pulse">
                S
              </div>
              <div>
                <h1 className="font-display font-extrabold tracking-tight text-xl bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">SpeakWise AI</h1>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Speaker Coach</p>
              </div>
            </div>
            <button className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Status Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center gap-3 border border-slate-100/50 dark:border-slate-800/20">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center font-bold text-lg overflow-hidden">
              {user?.profilePic ? (
                <img src={user.profilePic} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name.charAt(0)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate">{user?.name}</h2>
              <p className="text-xs text-slate-400 truncate">{user?.occupation || 'Speaker Enthusiast'}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {menuItems.map((item) => {
              const IconComp = item.icon;
              const isActive = currentHash === item.id || (currentHash === '' && item.id === '#dashboard');
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl font-medium text-sm transition-all duration-300 text-left ${
                    isActive 
                      ? 'bg-gradient-to-r from-indigo-50 to-pink-50 dark:from-indigo-950/40 dark:to-pink-950/20 text-indigo-600 dark:text-pink-400 shadow-sm border border-indigo-100/30 dark:border-pink-900/10' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <IconComp className={`w-5 h-5 ${isActive ? 'text-indigo-500 dark:text-pink-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer controls */}
        <div className="flex flex-col gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/60">
          {/* Notifications trigger desktop */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifications(!showNotifications); markNotificationsRead(); }}
              className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm font-medium"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-400" />
                <span>Alerts Feed</span>
              </div>
              {unreadCount > 0 && (
                <span className="bg-pink-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotifications && (
              <div className="absolute bottom-12 left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl max-h-80 overflow-y-auto no-scrollbar p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-display font-semibold text-xs text-slate-700 dark:text-slate-300">Live Notifications</span>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No notifications yet. Enjoy SpeakWise!
                  </div>
                ) : (
                  notifications.map((noti) => (
                    <div key={noti._id} className="flex gap-3 text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                      <div className="mt-0.5">{getNotificationIcon(noti.type)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{noti.title}</p>
                        <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5">{noti.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Theme Switcher */}
          <button 
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm font-medium"
          >
            <div className="flex items-center gap-3">
              {theme === 'light' ? <Moon className="w-5 h-5 text-slate-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
              <span>{theme === 'light' ? 'Twilight Mode' : 'Pinterest Light'}</span>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md capitalize font-bold">
              {theme}
            </span>
          </button>

          {/* Log Out */}
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-sm font-semibold text-left transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile background block */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}
    </>
  );
};
