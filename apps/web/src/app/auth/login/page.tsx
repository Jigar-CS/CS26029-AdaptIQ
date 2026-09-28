'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { BrainCircuit, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { UserRole } from '@clias/shared-types';

export default function LoginPage() {
  const [email, setEmail] = useState('student@charusat.edu.in');
  const [password, setPassword] = useState('clias123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
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
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link href="/" className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
            <BrainCircuit className="w-7 h-7" />
          </div>
        </Link>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">CLIAS Sign In</h2>
        <p className="text-xs text-slate-400 mt-1">{universityName} Institutional Assessment & Learning Intelligence</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-950/80 backdrop-blur-xl py-8 px-6 shadow-2xl border border-slate-800 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                University Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`name@${process.env.NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN || 'charusat.edu.in'}`}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2.5">
              Quick Switch Role Preset:
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => fillDemo('student@charusat.edu.in')}
                className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-indigo-950 text-indigo-300 border border-slate-800 hover:border-indigo-500/40 transition"
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => fillDemo('faculty@charusat.edu.in')}
                className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-emerald-950 text-emerald-300 border border-slate-800 hover:border-emerald-500/40 transition"
              >
                Faculty
              </button>
              <button
                type="button"
                onClick={() => fillDemo('counsellor@charusat.edu.in')}
                className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-amber-950 text-amber-300 border border-slate-800 hover:border-amber-500/40 transition"
              >
                Counsellor
              </button>
              <button
                type="button"
                onClick={() => fillDemo('hod@charusat.edu.in')}
                className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-purple-950 text-purple-300 border border-slate-800 hover:border-purple-500/40 transition"
              >
                HOD
              </button>
              <button
                type="button"
                onClick={() => fillDemo('head@charusat.edu.in')}
                className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-blue-950 text-blue-300 border border-slate-800 hover:border-blue-500/40 transition"
              >
                Head
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin@charusat.edu.in')}
                className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-rose-950 text-rose-300 border border-slate-800 hover:border-rose-500/40 transition"
              >
                Super Admin
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-slate-400">
            <span>New university student? </span>
            <Link href="/auth/register" className="font-bold text-indigo-400 hover:underline">
              Activate your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
