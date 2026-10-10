'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSidebar } from '@/lib/sidebar-context';
import { useTheme } from '@/lib/theme-context';
import { UserRole } from '@clias/shared-types';
import {
  LayoutDashboard,
  BrainCircuit,
  FileCheck,
  TrendingUp,
  GraduationCap,
  Users,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  Building2,
  BookOpen,
  LogOut,
  Briefcase,
  Terminal,
  GitCompare,
  Pin,
  Sparkles,
  Sun,
  Moon,
  UserCircle,
  Trophy,
  ShieldAlert,
  Lock,
  X,
} from 'lucide-react';

export interface SidebarProps {
  isLocked?: boolean;
  onLockedClick?: () => void;
}

export function Sidebar({ isLocked = false, onLockedClick }: SidebarProps = {}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isPinned, togglePin, isMobileOpen, setIsMobileOpen } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) return null;

  // On mobile (when isMobileOpen is true), expand sidebar. On desktop, expand when pinned or hovered.
  const isExpanded = isMobileOpen || isPinned || isHovered;


  const studentLinks = [
    { name: 'Learning Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Semester Leaderboard', href: '/student/leaderboard', icon: Trophy },
    { name: 'Placement Readiness', href: '/student/placement', icon: Briefcase },
    { name: 'Coding Arena', href: '/student/coding', icon: Terminal },
    { name: 'Assessments & Exams', href: '/student/assessments', icon: FileCheck },
    { name: 'Learning Path', href: '/student/learning-path', icon: GraduationCap },
    { name: 'My Profile', href: '/student/profile', icon: UserCircle },
  ];

  const adminLinks = [
    { name: 'System Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Authorized Students', href: '/admin/students', icon: Users },
    { name: 'Institution Hierarchy', href: '/admin/institutes', icon: Building2 },
    { name: 'System Settings', href: '/admin/settings', icon: Settings },
    { name: 'My Profile', href: '/admin/profile', icon: UserCircle },
  ];

  const facultyLinks = [
    { name: 'Faculty Dashboard', href: '/faculty/dashboard', icon: LayoutDashboard },
    { name: 'Question Bank', href: '/faculty/questions', icon: BookOpen },
    { name: 'Question Disputes', href: '/faculty/disputes', icon: ShieldAlert },
    { name: 'Class Analytics', href: '/faculty/analytics', icon: TrendingUp },
    { name: 'AI Question Studio', href: '/faculty/ai-generator', icon: Sparkles },
    { name: 'Document AI / RAG', href: '/faculty/documents', icon: FileSpreadsheet },
    { name: 'Exam Studio', href: '/faculty/assessments', icon: FileCheck },
    { name: 'Plagiarism Studio', href: '/faculty/plagiarism', icon: GitCompare },
    { name: 'Invigilation Console', href: '/faculty/invigilation', icon: ShieldCheck },
    { name: 'My Profile', href: '/faculty/profile', icon: UserCircle },
  ];

  const counsellorLinks = [
    { name: 'Counsellor Dashboard', href: '/counsellor/dashboard', icon: LayoutDashboard },
    { name: 'Assigned Students', href: '/counsellor/students', icon: Users },
    { name: 'Intervention Alerts', href: '/counsellor/alerts', icon: ShieldCheck },
    { name: 'My Profile', href: '/counsellor/profile', icon: UserCircle },
  ];

  const hodLinks = [
    { name: 'Department Dashboard', href: '/hod/dashboard', icon: LayoutDashboard },
    { name: 'Curriculum Mastery', href: '/hod/dashboard#curriculum', icon: TrendingUp },
    { name: 'My Profile', href: '/hod/profile', icon: UserCircle },
  ];

  const headLinks = [
    { name: 'Institutional Overview', href: '/head/dashboard', icon: LayoutDashboard },
    { name: 'Program Comparison', href: '/head/programs', icon: Building2 },
    { name: 'My Profile', href: '/head/profile', icon: UserCircle },
  ];

  let currentLinks = studentLinks;
  if (user.role === UserRole.SUPER_ADMIN) currentLinks = adminLinks;
  else if (user.role === UserRole.FACULTY) currentLinks = facultyLinks;
  else if (user.role === UserRole.COUNSELLOR) currentLinks = counsellorLinks;
  else if (user.role === UserRole.HOD) currentLinks = hodLinks;
  else if (user.role === UserRole.HEAD) currentLinks = headLinks;

  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between text-slate-700 dark:text-slate-300 z-50 transition-all duration-300 ease-in-out shadow-2xl lg:shadow-xs ${
          isMobileOpen
            ? 'translate-x-0 w-64'
            : '-translate-x-full lg:translate-x-0'
        } ${isExpanded ? 'lg:w-64' : 'lg:w-[72px]'}`}
      >
        <div className="flex flex-col min-h-0">
          {/* Brand Header */}
          <div
            className={`border-b border-slate-200 dark:border-slate-800 transition-all duration-300 ${
              isExpanded
                ? 'p-4 flex items-center justify-between gap-2'
                : 'p-3.5 flex justify-center'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#172554] flex items-center justify-center text-white shadow-xs shrink-0">
                <BrainCircuit className="w-6 h-6 text-white" />
              </div>

              {isExpanded && (
                <div className="truncate animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">CLIAS</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 px-1.5 py-0.5 rounded">
                      v1.0
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">Learning Intelligence</p>
                </div>
              )}
            </div>

            {/* Mobile Close Button (< lg) or Desktop Pin Toggle (>= lg) */}
            <div className="flex items-center gap-1">
              {/* Mobile Close (X) Button */}
              <button
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Close Menu"
                aria-label="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Desktop Pin Toggle */}
              {isExpanded && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin();
                  }}
                  title={isPinned ? 'Unpin Sidebar (Collapse to Icons)' : 'Pin Sidebar (Stick Open & Shift Screen)'}
                  className={`hidden lg:block p-2 rounded-lg transition-all shrink-0 animate-in fade-in duration-200 ${
                    isPinned
                      ? 'bg-blue-600 text-white shadow-xs border border-blue-500'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  <Pin
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isPinned ? 'fill-white rotate-45' : 'text-slate-400 hover:rotate-12'
                    }`}
                  />
                </button>
              )}
            </div>
          </div>

        {/* Role Badge */}
        {isExpanded ? (
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/40 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Current Role</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/30">
                {user.role}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-2 border-b border-slate-200 dark:border-slate-800/60 flex justify-center">
            <span
              title={`Role: ${user.role}`}
              className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/30 uppercase cursor-default"
            >
              {user.role.slice(0, 3)}
            </span>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-2 space-y-1.5 overflow-y-auto overflow-x-hidden flex-1">
          {currentLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            const isItemLocked = isLocked && !isActive;

            const handleLinkClick = (e: React.MouseEvent) => {
              if (isItemLocked) {
                e.preventDefault();
                e.stopPropagation();
                onLockedClick?.();
                return;
              }
              setIsMobileOpen(false);
            };

            if (isExpanded) {
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={handleLinkClick}
                  prefetch={false}
                  title={isItemLocked ? `${link.name} (Locked during practice session - exit session first)` : link.name}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold shadow-xs'
                      : isItemLocked
                      ? 'text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="truncate">{link.name}</span>
                  </div>
                  {isItemLocked && (
                    <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  )}
                </Link>
              );
            }

            // Compact Icon-Only Mode with Tooltip
            return (
              <div key={link.name} className="relative group flex justify-center">
                <Link
                  href={link.href}
                  onClick={handleLinkClick}
                  prefetch={false}
                  className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isItemLocked
                      ? 'text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed hover:bg-transparent'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                </Link>

                {/* Floating Tooltip */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                  {link.name} {isItemLocked && '(Locked during session)'}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* User Footer with Theme Toggle */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
        {isExpanded ? (
          <div className="flex items-center justify-between animate-in fade-in duration-200">
            <Link
              href={`/${user.role.toLowerCase()}/profile`}
              onClick={(e) => {
                if (isLocked) {
                  e.preventDefault();
                  onLockedClick?.();
                }
              }}
              prefetch={false}
              className={`truncate pr-2 group block transition ${isLocked ? 'cursor-not-allowed opacity-60' : 'hover:opacity-85'}`}
              title={isLocked ? 'Profile locked during active practice session' : 'Click to view & edit profile'}
            >
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1">
                <span>{user.name || user.email}</span>
                {isLocked && <Lock className="w-3 h-3 text-slate-400 inline ml-0.5" />}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
              {user.role === UserRole.FACULTY && (user.courseCode || user.courseName) && (
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 truncate mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="truncate">{user.courseCode || 'Subject'}: {user.courseName}</span>
                </p>
              )}
            </Link>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
              </button>
              <button
                onClick={(e) => {
                  if (isLocked) {
                    e.preventDefault();
                    onLockedClick?.();
                    return;
                  }
                  logout();
                }}
                title={isLocked ? 'Logout locked during active practice session' : 'Log out'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
            <Link
              href={`/${user.role.toLowerCase()}/profile`}
              onClick={(e) => {
                if (isLocked) {
                  e.preventDefault();
                  onLockedClick?.();
                }
              }}
              prefetch={false}
              title={isLocked ? 'Profile locked during active session' : `View Profile: ${user.name || user.email}`}
              className={`w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs transition ${isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:ring-2 hover:ring-blue-500'}`}
            >
              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </Link>
            <button
              onClick={(e) => {
                if (isLocked) {
                  e.preventDefault();
                  onLockedClick?.();
                  return;
                }
                logout();
              }}
              title={isLocked ? 'Logout locked during active session' : 'Log out'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
