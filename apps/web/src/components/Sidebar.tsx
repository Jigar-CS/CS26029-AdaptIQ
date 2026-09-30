'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
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
  Sparkles,
  Briefcase,
  Terminal,
  GitCompare,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const studentLinks = [
    { name: 'Learning Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Placement Readiness', href: '/student/placement', icon: Briefcase, badge: 'Phase 10' },
    { name: 'Coding Arena', href: '/student/coding', icon: Terminal, badge: 'Phase 11' },
    { name: 'Adaptive Practice', href: '/student/practice', icon: BrainCircuit },
    { name: 'Assessments & Exams', href: '/student/assessments', icon: FileCheck, badge: 'Active' },
    { name: 'Learning Curve', href: '/student/dashboard#curve', icon: TrendingUp },
    { name: 'Learning Path', href: '/student/learning-path', icon: GraduationCap, badge: 'Phase 4' },
  ];

  const adminLinks = [
    { name: 'System Overview', href: '/admin/students', icon: LayoutDashboard },
    { name: 'Authorized Students', href: '/admin/students', icon: Users },
    { name: 'Institution Hierarchy', href: '/admin/institutes', icon: Building2, badge: 'Active' },
    { name: 'System Settings', href: '/admin/settings', icon: Settings, badge: 'Phase 2' },
  ];

  const facultyLinks = [
    { name: 'Faculty Dashboard', href: '/faculty/dashboard', icon: LayoutDashboard },
    { name: 'Plagiarism Studio', href: '/faculty/plagiarism', icon: GitCompare, badge: 'Phase 12' },
    { name: 'AI Question Studio', href: '/faculty/ai-generator', icon: Sparkles, badge: 'Active' },
    { name: 'Document AI / RAG', href: '/faculty/documents', icon: FileSpreadsheet, badge: 'Phase 7' },
    { name: 'Exam Studio', href: '/faculty/assessments', icon: FileCheck, badge: 'Active' },
    { name: 'Invigilation Console', href: '/faculty/invigilation', icon: ShieldCheck, badge: 'Phase 9' },
    { name: 'Question Bank', href: '/faculty/dashboard#bank', icon: BookOpen },
    { name: 'Class Analytics', href: '/faculty/dashboard#analytics', icon: TrendingUp },
  ];

  const counsellorLinks = [
    { name: 'Counsellor Dashboard', href: '/counsellor/dashboard', icon: LayoutDashboard },
    { name: 'Assigned Students', href: '/counsellor/dashboard#students', icon: Users },
    { name: 'Intervention Alerts', href: '/counsellor/dashboard#alerts', icon: ShieldCheck, badge: 'Phase 2' },
  ];

  const hodLinks = [
    { name: 'Department Dashboard', href: '/hod/dashboard', icon: LayoutDashboard },
    { name: 'Curriculum Mastery', href: '/hod/dashboard#curriculum', icon: TrendingUp },
  ];

  const headLinks = [
    { name: 'Institutional Overview', href: '/head/dashboard', icon: LayoutDashboard },
    { name: 'Program Comparison', href: '/head/dashboard#programs', icon: Building2 },
  ];

  let currentLinks = studentLinks;
  if (user.role === UserRole.SUPER_ADMIN) currentLinks = adminLinks;
  else if (user.role === UserRole.FACULTY) currentLinks = facultyLinks;
  else if (user.role === UserRole.COUNSELLOR) currentLinks = counsellorLinks;
  else if (user.role === UserRole.HOD) currentLinks = hodLinks;
  else if (user.role === UserRole.HEAD) currentLinks = headLinks;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen fixed left-0 top-0 text-slate-300 z-30">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg text-white tracking-tight">CLIAS</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Learning Intelligence</p>
          </div>
        </div>

        {/* Role Badge */}
        <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Current Role</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {user.role}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {currentLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{link.name}</span>
                </div>
                {link.badge && (
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between mb-3">
          <div className="truncate pr-2">
            <p className="text-xs font-semibold text-white truncate">{user.name || user.email}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
