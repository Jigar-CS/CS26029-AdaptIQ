'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { BrainCircuit, Lock, Mail, Loader2, AlertCircle, Sun, Moon } from 'lucide-react';
import { UserRole } from '@clias/shared-types';

export default function LoginPage() {
  const [email, setEmail] = useState('student@charusat.edu.in');
  const [password, setPassword] = useState('clias123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const universityName = process.env.NEXT_PUBLIC_UNIVERSITY_NAME || 'CHARUSAT';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await login(email, password);
      // Role-aware redirection
      if (user.role === UserRole.SUPER_ADMIN) {
        router.push('/admin/students');
      } else if (user.role === UserRole.FACULTY) {
        router.push('/faculty/dashboard');
      } else if (user.role === UserRole.COUNSELLOR) {
        router.push('/counsellor/dashboard');
      } else if (user.role === UserRole.HOD) {
        router.push('/hod/dashboard');
      } else if (user.role === UserRole.HEAD) {
        router.push('/head/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('clias123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative transition-colors duration-200">
      {/* Theme Toggle Button in Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition shadow-xs flex items-center gap-1.5"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#172554] flex items-center justify-center text-white shadow-xs">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#172554] dark:text-white">CLIAS</span>
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">University Portal Sign In</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{universityName} Learning Intelligence &amp; Assessment System</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                University Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`name@${process.env.NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN || 'charusat.edu.in'}`}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-850 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-850 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center mb-2.5">
              One-Click Role Presets:
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => fillDemo('student@charusat.edu.in')}
                className="py-1.5 px-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 transition"
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => fillDemo('faculty@charusat.edu.in')}
                className="py-1.5 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 transition"
              >
                Faculty
              </button>
              <button
                type="button"
                onClick={() => fillDemo('counsellor@charusat.edu.in')}
                className="py-1.5 px-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 transition"
              >
                Counsellor
              </button>
              <button
                type="button"
                onClick={() => fillDemo('hod@charusat.edu.in')}
                className="py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
              >
                HOD
              </button>
              <button
                type="button"
                onClick={() => fillDemo('head@charusat.edu.in')}
                className="py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
              >
                Dean / Head
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin@charusat.edu.in')}
                className="py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
              >
                Super Admin
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>New university student? </span>
            <Link href="/auth/register" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Activate your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
