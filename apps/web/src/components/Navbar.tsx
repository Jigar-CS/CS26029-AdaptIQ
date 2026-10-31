'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useSidebar } from '@/lib/sidebar-context';
import { api } from '@/lib/api';
import {
  Bell,
  Search,
  Shield,
  User as UserIcon,
  Sun,
  Moon,
  Check,
  Sparkles,
  Lock,
  Menu,
  RotateCw,
  Trash2,
  CheckCheck,
  X,
  BellOff,
} from 'lucide-react';

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
            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 ${isApproved
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
            className={`p-2.5 rounded-xl border-l-[3px] text-[11px] leading-relaxed ${isApproved
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

  if (item.type === 'DISPUTE_PENDING') {
    return (
      <div className="space-y-2 mt-1.5 text-xs">
        <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
          {item.message}
        </p>
        <div className="pt-1">
          <Link
            href="/faculty/disputes"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition"
          >
            <span>Review Dispute in Queue</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    );
  }

  if (item.type === 'PROCTORING_FLAGGED') {
    return (
      <div className="space-y-2 mt-1.5 text-xs">
        <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
          {item.message}
        </p>
        <div className="pt-1">
          <Link
            href="/faculty/invigilation"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition"
          >
            <span>View Proctoring Logs</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    );
  }

  if (item.type === 'AT_RISK_ALERT') {
    return (
      <div className="space-y-2 mt-1.5 text-xs">
        <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
          {item.message}
        </p>
        <div className="pt-1">
          <Link
            href="/faculty/counselling/alerts"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition"
          >
            <span>Open Student Intervention</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    );
  }

  if (item.type === 'ASSESSMENT_ASSIGNED') {
    return (
      <div className="space-y-2 mt-1.5 text-xs">
        <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
          {item.message}
        </p>
        <div className="pt-1">
          <Link
            href="/student/assessments"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition"
          >
            <span>Go to Assessments</span>
            <span>→</span>
          </Link>
        </div>
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

function formatTimeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function Navbar({ title, subtitle, isLocked = false, onLockedClick }: NavbarProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleMobile } = useSidebar();
  const universityName = process.env.NEXT_PUBLIC_UNIVERSITY_NAME || 'CHARUSAT';

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [hasNewArrival, setHasNewArrival] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  const loadNotifications = async (silent: boolean = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const data = await api.get('/disputes/notifications');
      if (Array.isArray(data)) {
        setNotifications((prev) => {
          const prevUnread = prev.filter((n) => !n.read).length;
          const newUnread = data.filter((n: any) => !n.read).length;
          if (newUnread > prevUnread) {
            setHasNewArrival(true);
            setTimeout(() => setHasNewArrival(false), 3500);
          }
          return data;
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.warn('Notifications unavailable', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  // Initial load for any authenticated role
  useEffect(() => {
    setMounted(true);
    if (user) {
      loadNotifications();
    }
  }, [user]);

  // Periodic polling auto-update every 2 minutes + on focus/online
  useEffect(() => {
    if (!user) return;
    const intervalId = setInterval(() => {
      loadNotifications(true);
    }, 120000); // 2 minutes

    const handleFocus = () => {
      loadNotifications(true);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }, [user]);

  // Real-time SSE listener
  useEffect(() => {
    if (!user) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('clias_token') : null;
    if (!token) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const connectSSE = () => {
      if (isCancelled) return;

      try {
        // Connect directly to the API server to avoid Next.js dev server rewrite proxy ECONNRESETs
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL ||
          (typeof window !== 'undefined' && window.location.hostname
            ? `${window.location.protocol}//${window.location.hostname}:4000/api/v1`
            : '/api/v1');
        const streamUrl = `${apiBase.replace(/\/$/, '')}/disputes/notifications/stream?token=${encodeURIComponent(token)}`;

        eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
          if (!isCancelled) setIsLiveConnected(true);
        };

        eventSource.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const payload = JSON.parse(event.data);
            if (payload?.type === 'PING') {
              setIsLiveConnected(true);
              return;
            }
            // Real-time notification received!
            loadNotifications(true);
            setHasNewArrival(true);
            setTimeout(() => {
              if (!isCancelled) setHasNewArrival(false);
            }, 3500);
          } catch {
            // ignore malformed ping
          }
        };

        eventSource.onerror = () => {
          if (!isCancelled) setIsLiveConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Debounce reconnection attempt
          if (!isCancelled && !reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connectSSE();
            }, 5000);
          }
        };
      } catch (err) {
        console.warn('Notification stream connection failed:', err);
      }
    };

    connectSSE();

    return () => {
      isCancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [user]);

  // Cross-tab synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'clias_notifications_sync') {
        loadNotifications(true);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleRefresh = async () => {
    await loadNotifications(false);
  };

  const handleClearAll = async () => {
    try {
      await api.delete('/disputes/notifications');
      setNotifications([]);
      if (typeof window !== 'undefined') {
        localStorage.setItem('clias_notifications_sync', Date.now().toString());
      }
    } catch (err) {
      console.warn('Failed to clear notifications on server', err);
      setNotifications([]);
    }
  };

  const handleClearOne = async (id: string) => {
    try {
      await api.delete(`/disputes/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (typeof window !== 'undefined') {
        localStorage.setItem('clias_notifications_sync', Date.now().toString());
      }
    } catch (err) {
      console.warn('Failed to clear notification', err);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/disputes/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('clias_notifications_sync', Date.now().toString());
      }
    } catch (err) {
      console.warn('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/disputes/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      if (typeof window !== 'undefined') {
        localStorage.setItem('clias_notifications_sync', Date.now().toString());
      }
    } catch (err) {
      console.warn('Failed to mark all read', err);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-16 bg-[#faf7f2]/95 dark:bg-[#0c1220]/95 backdrop-blur-md border-b border-[rgba(74,111,165,0.22)] dark:border-[rgba(106,144,197,0.18)] px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs transition-colors duration-200">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={toggleMobile}
          className="lg:hidden p-2 -ml-1 text-[#1a2540] dark:text-[#e8edf5] hover:text-[#e05033] dark:hover:text-[#e8604a] hover:bg-[rgba(224,80,51,0.08)] transition shrink-0"
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="truncate">
          <h1 className="text-sm sm:text-base md:text-lg font-display text-[#1a2540] dark:text-[#e8edf5] tracking-tight truncate uppercase">
            {title || `${universityName} Learning Intelligence`}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Session In Progress Badge */}
        {isLocked && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[rgba(224,80,51,0.1)] text-[#e05033] dark:text-[#e8604a] border border-[rgba(224,80,51,0.35)] text-[10px] font-mono font-bold uppercase tracking-wider shadow-xs" style={{ borderRadius: 0 }}>
            <Lock className="w-3.5 h-3.5" />
            <span>Session in Progress</span>
          </div>
        )}

        {/* Search Input */}
        <div className="relative hidden md:block w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6fa5] dark:text-[#6a90c5]" />
          <input
            type="text"
            disabled={isLocked}
            placeholder={isLocked ? 'Search locked during session' : 'Search topics, courses...'}
            className={`w-full pl-9 pr-4 py-1.5 text-[11px] font-mono bg-[rgba(74,111,165,0.08)] dark:bg-[rgba(106,144,197,0.08)] border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] text-[#1a2540] dark:text-[#e8edf5] focus:outline-none focus:border-[#e05033] transition uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
            style={{ borderRadius: 0 }}
          />
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 text-[#6b7fa3] dark:text-[#8ba0c0] hover:text-[#1a2540] dark:hover:text-[#e8edf5] hover:bg-[rgba(74,111,165,0.1)] border border-[rgba(74,111,165,0.25)] transition flex items-center gap-1.5"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
          style={{ borderRadius: 0 }}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[#4a6fa5]" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 text-[#6b7fa3] dark:text-[#8ba0c0] hover:text-[#1a2540] dark:hover:text-[#e8edf5] hover:bg-[rgba(74,111,165,0.1)] transition ${hasNewArrival ? 'text-[#e05033] dark:text-[#e8604a] ring-2 ring-[rgba(224,80,51,0.4)] bg-[rgba(224,80,51,0.08)]' : ''
              }`}
            title={`Notifications ${unreadCount > 0 ? `(${unreadCount} new)` : ''}`}
            aria-label="Open notifications panel"
          >
            <Bell className={`w-4 h-4 ${hasNewArrival ? 'animate-bounce text-[#e05033] dark:text-[#e8604a]' : ''}`} />
            {unreadCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#e05033] absolute top-1.5 right-1.5 ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-[480px] max-w-[480px] bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] shadow-2xl z-50 p-4 space-y-3" style={{ borderRadius: 0 }}>
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[rgba(74,111,165,0.22)] dark:border-[rgba(106,144,197,0.18)]">
                <div className="flex items-center gap-2">
                  <h4 className="text-[10px] font-mono font-bold text-[#1a2540] dark:text-[#e8edf5] uppercase tracking-widest flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[#e05033]" />
                    <span>Notifications</span>
                  </h4>
                  {unreadCount > 0 ? (
                    <span className="px-2 py-0.5 bg-[rgba(224,80,51,0.12)] text-[#e05033] text-[10px] font-mono font-bold border border-[rgba(224,80,51,0.3)]">
                      {unreadCount} new
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-[rgba(74,111,165,0.1)] text-[#4a6fa5] dark:text-[#6a90c5] text-[10px] font-mono font-semibold">
                      {notifications.length} total
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Refresh Option */}
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={`p-1.5 text-[#6b7fa3] dark:text-[#8ba0c0] hover:text-[#1a2540] dark:hover:text-[#e8edf5] hover:bg-[rgba(74,111,165,0.1)] transition ${isRefreshing ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    title="Refresh notifications now"
                    aria-label="Refresh notifications now"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#e05033]' : ''}`} />
                  </button>

                  {/* Mark All Read */}
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="p-1.5 text-[#6b7fa3] dark:text-[#8ba0c0] hover:text-[#e05033] hover:bg-[rgba(74,111,165,0.1)] transition text-[11px] font-medium"
                      title="Mark all as read"
                      aria-label="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Clear All Option */}
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="px-2 py-1 text-[#6b7fa3] dark:text-[#8ba0c0] hover:text-[#e05033] hover:bg-[rgba(224,80,51,0.08)] transition text-[11px] font-semibold flex items-center gap-1"
                      title="Clear all notifications"
                      aria-label="Clear all notifications"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-[10px] font-mono">Clear</span>
                    </button>
                  )}

                  {/* Close Dropdown */}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1.5 text-[#6b7fa3] hover:text-[#1a2540] dark:hover:text-[#e8edf5] hover:bg-[rgba(74,111,165,0.1)] transition"
                    title="Close notifications"
                    aria-label="Close notifications"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status Bar / Auto-sync Indicator */}
              <div className="flex items-center justify-between text-[10px] font-mono px-2.5 py-1 bg-[rgba(74,111,165,0.08)] text-[#4a6fa5] dark:text-[#6a90c5] border border-[rgba(74,111,165,0.18)]">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveConnected ? 'bg-emerald-400' : 'bg-[#e05033]'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveConnected ? 'bg-emerald-500' : 'bg-[#e05033]'}`}></span>
                  </span>
                  <span className="font-medium text-[#1a2540] dark:text-[#e8edf5]">
                    {isLiveConnected ? 'Live sync active' : 'Auto-updates every 2m'}
                  </span>
                </div>
                <span>
                  {lastUpdated ? `Updated ${formatTimeAgo(lastUpdated)}` : 'Auto-updating'}
                </span>
              </div>

              {/* Notification List */}
              <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 px-4 space-y-2">
                    <div className="w-10 h-10 bg-[rgba(74,111,165,0.1)] flex items-center justify-center mx-auto text-[#4a6fa5]">
                      <BellOff className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-mono font-semibold text-[#1a2540] dark:text-[#e8edf5] uppercase tracking-wider">
                      All caught up!
                    </p>
                    <p className="text-[11px] text-[#6b7fa3] dark:text-[#8ba0c0] max-w-xs mx-auto">
                      No notifications pending. New dispute updates, assessments, and alerts will appear automatically.
                    </p>
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#e05033] hover:underline pt-1"
                    >
                      <RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`group relative p-3.5 border text-xs space-y-2 transition ${item.read
                          ? 'bg-[rgba(74,111,165,0.04)] dark:bg-[rgba(106,144,197,0.04)] border-[rgba(74,111,165,0.18)] dark:border-[rgba(106,144,197,0.15)] text-[#6b7fa3] dark:text-[#8ba0c0]'
                          : 'bg-[rgba(224,80,51,0.04)] dark:bg-[rgba(224,80,51,0.08)] border-[rgba(224,80,51,0.25)] dark:border-[rgba(224,80,51,0.3)] text-[#1a2540] dark:text-[#e8edf5] font-medium shadow-2xs'
                        }`}
                      style={{ borderRadius: 0 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-[#1a2540] dark:text-[#e8edf5] flex items-center gap-1.5 leading-snug">
                          {!item.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#e05033] shrink-0 inline-block"></span>
                          )}
                          {item.title}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {!item.read && (
                            <button
                              onClick={() => handleMarkRead(item.id)}
                              className="text-[10px] font-mono font-semibold text-[#e05033] hover:underline flex items-center gap-0.5 px-1 py-0.5"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3" /> Mark read
                            </button>
                          )}
                          {/* Individual Clear / Dismiss Button */}
                          <button
                            onClick={() => handleClearOne(item.id)}
                            className="p-1 text-[#6b7fa3] hover:text-[#e05033] hover:bg-[rgba(224,80,51,0.08)] transition"
                            title="Dismiss notification"
                            aria-label="Dismiss notification"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <NotificationCardBody item={item} />

                      <div className="flex items-center justify-between pt-1 border-t border-[rgba(74,111,165,0.15)] text-[10px] font-mono text-[#6b7fa3] dark:text-[#8ba0c0]">
                        <span>
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className={item.read ? 'text-[#6b7fa3]' : 'text-[#e05033] font-semibold'}>
                          {item.read ? 'Read' : 'New'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-[1px] bg-[rgba(74,111,165,0.25)]"></div>

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
            className={`flex items-center gap-3 p-1.5 transition group ${isLocked ? 'cursor-not-allowed opacity-70' : 'hover:bg-[rgba(74,111,165,0.08)] cursor-pointer'}`}
            style={{ borderRadius: 0 }}
          >
            <div className="w-8 h-8 bg-[rgba(224,80,51,0.12)] border border-[rgba(224,80,51,0.3)] text-[#e05033] dark:text-[#e8604a] font-mono font-bold text-xs flex items-center justify-center group-hover:ring-1 group-hover:ring-[#e05033] transition" style={{ borderRadius: 0 }}>
              {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#1a2540] dark:text-[#e8edf5] leading-none group-hover:text-[#e05033] dark:group-hover:text-[#e8604a] transition flex items-center gap-1 font-sans">
                <span>{user.name || user.email}</span>
                {isLocked && <Lock className="w-3 h-3 text-[#4a6fa5] inline" />}
              </p>
              <span className="text-[10px] font-mono text-[#4a6fa5] dark:text-[#6a90c5] font-semibold uppercase tracking-wider">
                {user.role}
              </span>
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}
