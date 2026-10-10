'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useSidebar } from '@/lib/sidebar-context';
import { api } from '@/lib/api';
import { Bell, Search, Shield, User as UserIcon, Sun, Moon, Check, Sparkles, Lock, Menu } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  metadata?: string;
  createdAt: string;
}

export interface NavbarProps {
  title?: string;
  subtitle?: string;
  isLocked?: boolean;
  onLockedClick?: () => void;
}

function NotificationCardBody({ item }: { item: NotificationItem }) {
  let meta: any = null;
  try {
    if (item.metadata) {
      meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
    }
  } catch (e) {
    // ignore
  }

  const isRemediationNudge =
    item.type === 'REMEDIATION_NUDGE' ||
    item.title?.toLowerCase().includes('remediation');

  if (isRemediationNudge) {
    const topicName = meta?.topicName || 'Arrays';
    const courseCode = meta?.courseCode || 'CS301';
    const actionUrl = meta?.actionUrl || `/student/practice?topicId=${meta?.topicId || ''}&courseId=${meta?.courseId || ''}`;

    return (
      <div className="space-y-2 mt-1.5 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {courseCode} • {topicName}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
            🎯 Remediation Practice Assigned
          </span>
        </div>

        <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
          Prof. Dhara Solanki has dispatched an automated remediation practice session for <strong>{topicName}</strong> to reinforce core concepts and build mastery.
        </p>

        <div className="pt-1">
          <Link
            href={actionUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition"
          >
            <span>Start Practice Session Now</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    );
  }

  const isApproved =
    item.type === 'DISPUTE_APPROVED' ||
    item.title?.toLowerCase().includes('approved') ||
    item.title?.toLowerCase().includes('credit awarded');
  const isRejected =
    item.type === 'DISPUTE_REJECTED' ||
    item.title?.toLowerCase().includes('reviewed') ||
    item.title?.toLowerCase().includes('solution upheld');

  if (isApproved || isRejected) {
    const lines = (item.message || '').split('\n').map((l) => l.trim()).filter(Boolean);

    // Extract sections from formatted string
    const topicLine = lines.find((l) => l.startsWith('Topic:') || l.startsWith('Course:'));
    const summaryLine = lines.find(
      (l) =>
        !l.startsWith('Dispute Decision:') &&
        !l.startsWith('Course:') &&
        !l.startsWith('Review Summary:') &&
        !l.startsWith('Faculty') &&
        !l.startsWith('Adjustments') &&
        !l.startsWith('Learning Guidance') &&
        !l.startsWith('•') &&
        !l.startsWith('"'),
    );

    const facultyQuote =
      lines.find((l) => l.startsWith('"') && l.endsWith('"')) ||
      (meta?.facultyRemarks ? `"${meta.facultyRemarks}"` : null);

    const actionPoints = lines.filter((l) => l.startsWith('•'));

    const topicName =
      meta?.topicName ||
      (topicLine?.includes('Topic:') ? topicLine.split('Topic:')[1].trim() : 'Curriculum Question');
    const courseCode =
      meta?.courseCode ||
      (topicLine?.includes('Course:') ? topicLine.split('Course:')[1].split('•')[0].trim() : 'CS301');

    return (
      <div className="space-y-2 mt-1.5 text-xs">
        {/* Topic & Decision Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {courseCode ? `${courseCode} • ` : ''}{topicName}
          </span>
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 ${
              isApproved
                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}
          >
            {isApproved ? '✓ Dispute Upheld & Credited' : 'ℹ️ Official Answer Upheld'}
          </span>
        </div>

        {/* Narrative Summary */}
        <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
          {summaryLine ||
            (isApproved
              ? `Faculty reviewed your challenge on "${topicName}" and concluded that your reasoning is mathematically and conceptually sound.`
              : `Faculty investigated your challenge on "${topicName}" and verified that the original question explanation is accurate.`)}
        </p>

        {/* Faculty Feedback Callout */}
        {facultyQuote && (
          <div
            className={`p-2.5 rounded-xl border-l-[3px] text-[11px] leading-relaxed ${
              isApproved
                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200'
                : 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 text-slate-800 dark:text-slate-200'
            }`}
          >
            <span className="not-italic font-bold text-[10px] uppercase tracking-wider block mb-1 text-slate-500 dark:text-slate-400">
              💬 Faculty Review Feedback:
            </span>
            <span className="italic font-medium">{facultyQuote}</span>
          </div>
        )}

        {/* Action Points / Profile Adjustments */}
        {actionPoints.length > 0 && (
          <div className="bg-slate-100/70 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              {isApproved ? 'Applied Profile Adjustments:' : 'Learning Guidance & Next Steps:'}
            </span>
            <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              {actionPoints.map((pt, idx) => {
                const cleanPt = pt.replace(/^•\s*/, '');
                const colonIdx = cleanPt.indexOf(':');
                if (colonIdx !== -1) {
                  const boldLabel = cleanPt.substring(0, colonIdx);
                  const rest = cleanPt.substring(colonIdx + 1);
                  return (
                    <li key={idx} className="flex items-start gap-1.5 leading-snug">
                      <span className={isApproved ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-blue-500 dark:text-blue-400 font-bold'}>
                        {isApproved ? '✓' : '•'}
                      </span>
                      <span>
                        <strong className="text-slate-900 dark:text-slate-100 font-semibold">{boldLabel}:</strong>
                        {rest}
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className={isApproved ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-blue-500 dark:text-blue-400 font-bold'}>
                      {isApproved ? '✓' : '•'}
                    </span>
                    <span>{cleanPt}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Fallback for general system notifications
  return (
    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line mt-1">
      {item.message}
    </p>
  );
}

export function Navbar({ title, subtitle, isLocked = false, onLockedClick }: NavbarProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleMobile } = useSidebar();
  const universityName = process.env.NEXT_PUBLIC_UNIVERSITY_NAME || 'CHARUSAT';

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (user && user.role === 'STUDENT') {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const data = await api.get('/disputes/notifications');
      setNotifications(data);
    } catch (err) {
      console.warn('Notifications unavailable', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/disputes/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (err) {
      console.warn('Failed to mark read', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs transition-colors duration-200">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={toggleMobile}
          className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="truncate">
          <h1 className="text-sm sm:text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {title || `${universityName} Learning Intelligence`}
          </h1>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Session In Progress Badge */}
        {isLocked && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Session in Progress</span>
          </div>
        )}

        {/* Search Input */}
        <div className="relative hidden md:block w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            disabled={isLocked}
            placeholder={isLocked ? 'Search locked during session' : 'Search topics, courses...'}
            className={`w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 absolute top-1.5 right-1.5 ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-[460px] max-w-[460px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">
                    No notifications yet. Dispute resolutions and faculty updates will appear here.
                  </p>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 transition ${
                        item.read
                          ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400'
                          : 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-500/30 text-slate-900 dark:text-white font-medium shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          {item.title}
                        </span>
                        {!item.read && (
                          <button
                            onClick={() => handleMarkRead(item.id)}
                            className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 shrink-0"
                          >
                            <Check className="w-3 h-3" /> Mark read
                          </button>
                        )}
                      </div>

                      <NotificationCardBody item={item} />

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800/60 text-[10px] text-slate-400">
                        <span>{new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        <span>{item.read ? 'Read' : 'Unread'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700"></div>

        {/* User Card */}
        {mounted && user && (
          <Link
            href={`/${user.role.toLowerCase()}/profile`}
            onClick={(e) => {
              if (isLocked) {
                e.preventDefault();
                onLockedClick?.();
              }
            }}
            prefetch={false}
            title={isLocked ? 'Profile locked during active session' : 'View & Edit Profile'}
            className={`flex items-center gap-3 p-1.5 rounded-xl transition group ${isLocked ? 'cursor-not-allowed opacity-70' : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer'}`}
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center group-hover:ring-2 group-hover:ring-blue-500 transition">
              {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition flex items-center gap-1">
                <span>{user.name || user.email}</span>
                {isLocked && <Lock className="w-3 h-3 text-slate-400 inline" />}
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                {user.role}
              </span>
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}
