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
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isPinned, togglePin } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);

  if (!user) return null;

  // The sidebar is open either when pinned or when hovered over the short bar
  const isExpanded = isPinned || isHovered;

  const studentLinks = [
    { name: 'Learning Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Placement Readiness', href: '/student/placement', icon: Briefcase },
    { name: 'Coding Arena', href: '/student/coding', icon: Terminal },
    { name: 'Adaptive Practice', href: '/student/practice', icon: BrainCircuit },
    { name: 'Assessments & Exams', href: '/student/assessments', icon: FileCheck },
    { name: 'Learning Path', href: '/student/learning-path', icon: GraduationCap },
  ];

  const adminLinks = [
    { name: 'System Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Authorized Students', href: '/admin/students', icon: Users },
    { name: 'Institution Hierarchy', href: '/admin/institutes', icon: Building2 },
    { name: 'System Settings', href: '/admin/settings', icon: Settings },
  ];

  const facultyLinks = [
    { name: 'Faculty Dashboard', href: '/faculty/dashboard', icon: LayoutDashboard },
    { name: 'Question Bank', href: '/faculty/questions', icon: BookOpen },
    { name: 'Class Analytics', href: '/faculty/analytics', icon: TrendingUp },
    { name: 'AI Question Studio', href: '/faculty/ai-generator', icon: Sparkles },
    { name: 'Document AI / RAG', href: '/faculty/documents', icon: FileSpreadsheet },
    { name: 'Exam Studio', href: '/faculty/assessments', icon: FileCheck },
    { name: 'Plagiarism Studio', href: '/faculty/plagiarism', icon: GitCompare },
    { name: 'Invigilation Console', href: '/faculty/invigilation', icon: ShieldCheck },
  ];

  const counsellorLinks = [
    { name: 'Counsellor Dashboard', href: '/counsellor/dashboard', icon: LayoutDashboard },
    { name: 'Assigned Students', href: '/counsellor/students', icon: Users },
    { name: 'Intervention Alerts', href: '/counsellor/alerts', icon: ShieldCheck },
  ];

  const hodLinks = [
    { name: 'Department Dashboard', href: '/hod/dashboard', icon: LayoutDashboard },
    { name: 'Curriculum Mastery', href: '/hod/dashboard#curriculum', icon: TrendingUp },
  ];

  const headLinks = [
    { name: 'Institutional Overview', href: '/head/dashboard', icon: LayoutDashboard },
    { name: 'Program Comparison', href: '/head/programs', icon: Building2 },
  ];

  let currentLinks = studentLinks;
  if (user.role === UserRole.SUPER_ADMIN) currentLinks = adminLinks;
  else if (user.role === UserRole.FACULTY) currentLinks = facultyLinks;
  else if (user.role === UserRole.COUNSELLOR) currentLinks = counsellorLinks;
  else if (user.role === UserRole.HOD) currentLinks = hodLinks;
  else if (user.role === UserRole.HEAD) currentLinks = headLinks;

  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between text-slate-700 dark:text-slate-300 z-40 transition-all duration-300 ease-in-out shadow-xs ${
        isExpanded ? 'w-64' : 'w-[72px]'
      }`}
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

          {/* Stick / Pin Toggle Button on Top Right (Appears when opened) */}
          {isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePin();
              }}
              title={isPinned ? 'Unpin Sidebar (Collapse to Icons)' : 'Pin Sidebar (Stick Open & Shift Screen)'}
              className={`p-2 rounded-lg transition-all shrink-0 animate-in fade-in duration-200 ${
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

            if (isExpanded) {
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  prefetch={false}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="truncate">{link.name}</span>
                  </div>
                </Link>
              );
            }

            // Compact Icon-Only Mode with Tooltip
            return (
              <div key={link.name} className="relative group flex justify-center">
                <Link
                  href={link.href}
                  prefetch={false}
                  className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                </Link>

                {/* Floating Tooltip */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                  {link.name}
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
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user.name || user.email}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>
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
                onClick={logout}
                title="Log out"
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
            <div
              title={`${user.name || user.email} (${user.role})`}
              className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs"
            >
              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
