'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import {
  BrainCircuit,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { UserRole } from '@clias/shared-types';
import { toast } from '@/lib/toast';

interface RolePreset {
  id: string;
  label: string;
  email: string;
  password: string;
  roleBadge: string;
  description: string;
  accentColor: string;
}

const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'FACULTY',
    label: 'Faculty',
    email: 'faculty1.cspit.cse@charusat.edu.in',
    password: 'clias123',
    roleBadge: 'FACULTY',
    description: 'CSPIT CSE Faculty & Exam Evaluator',
    accentColor: 'border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40',
  },
  {
    id: 'STUDENT',
    label: 'Student',
    email: 'student@charusat.edu.in',
    password: 'rahul@2006',
    roleBadge: 'STUDENT',
    description: 'Rahul Patel (Batch 24 CSE)',
    accentColor: 'border-red-500 text-red-700 dark:text-red-300 bg-red-50/80 dark:bg-red-950/40',
  },
  {
    id: 'COUNSELLOR',
    label: 'Counsellor',
    email: 'counsellor@charusat.edu.in',
    password: 'clias123',
    roleBadge: 'COUNSELLOR',
    description: 'Lead Academic Counsellor',
    accentColor: 'border-amber-500 text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40',
  },
  {
    id: 'HOD',
    label: 'HOD',
    email: 'hod@charusat.edu.in',
    password: 'clias123',
    roleBadge: 'HOD',
    description: 'Head of Department (CSE)',
    accentColor: 'border-teal-500 text-teal-800 dark:text-teal-300 bg-teal-50/80 dark:bg-teal-950/40',
  },
  {
    id: 'ADMIN',
    label: 'Admin',
    email: 'admin@charusat.edu.in',
    password: 'clias123',
    roleBadge: 'SUPER_ADMIN',
    description: 'System Super Administrator',
    accentColor: 'border-slate-500 text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80',
  },
];

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<string>('FACULTY');
  const [email, setEmail] = useState<string>('faculty1.cspit.cse@charusat.edu.in');
  const [password, setPassword] = useState<string>('clias123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const universityName = process.env.NEXT_PUBLIC_UNIVERSITY_NAME || 'CHARUSAT';

  const currentPreset = ROLE_PRESETS.find((p) => p.id === selectedRole) || ROLE_PRESETS[0];

  // Warm-up and prefetch destination dashboard bundles on mount for instant zero-lag entry
  React.useEffect(() => {
    router.prefetch('/faculty/dashboard');
    router.prefetch('/student/dashboard');
    router.prefetch('/faculty/counselling');
    router.prefetch('/hod/dashboard');
    router.prefetch('/admin/dashboard');

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role')?.toUpperCase();
      if (roleParam) {
        const matchingPreset = ROLE_PRESETS.find((p) => p.id === roleParam);
        if (matchingPreset) {
          setSelectedRole(matchingPreset.id);
          setEmail(matchingPreset.email);
          setPassword(matchingPreset.password);
        }
      }
    }
  }, [router]);

  const handleSelectPreset = (preset: RolePreset) => {
    setSelectedRole(preset.id);
    setEmail(preset.email);
    setPassword(preset.password);
    setError(null);

    // Warm-up target route for this specific preset
    if (preset.id === 'FACULTY') router.prefetch('/faculty/dashboard');
    else if (preset.id === 'STUDENT') router.prefetch('/student/dashboard');
    else if (preset.id === 'COUNSELLOR') router.prefetch('/faculty/counselling');
    else if (preset.id === 'HOD') router.prefetch('/hod/dashboard');
    else if (preset.id === 'ADMIN') router.prefetch('/admin/dashboard');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name || user.email}!`, 'Signed In');
      // Role-aware redirection
      if (user.role === UserRole.SUPER_ADMIN) {
        router.push('/admin/dashboard');
      } else if (user.role === UserRole.FACULTY) {
        if (selectedRole === 'COUNSELLOR' && (user.isCounsellor || (user as any).isDualCounsellor)) {
          router.push('/faculty/counselling');
        } else {
          router.push('/faculty/dashboard');
        }
      } else if (user.role === UserRole.HOD) {
        router.push('/hod/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Invalid email or password. Please verify your credentials.';
      setError(errMsg);
      toast.error(errMsg, 'Authentication Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#1a2540] dark:text-[#e8edf5] flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative transition-colors duration-200 grid-paper z-10">
      {/* CARDIA Atlas Coordinate Grid Atmosphere */}
      <div className="absolute inset-0 pointer-events-none atlas-grid opacity-35 dark:opacity-20" />

      {/* Theme Toggle Button in Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={toggleTheme}
          className="p-2.5 text-[#6b7fa3] dark:text-[#8ba0c0] hover:text-[#1a2540] dark:hover:text-[#e8edf5] bg-[#faf7f2] dark:bg-[#121b30] hover:bg-[rgba(74,111,165,0.1)] border border-[rgba(74,111,165,0.3)] transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          style={{ borderRadius: 0 }}
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

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
          <div className="w-11 h-11 bg-[#e05033] flex items-center justify-center text-white shadow-sm" style={{ borderRadius: 0 }}>
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-display tracking-tight text-[#1a2540] dark:text-[#e8edf5] uppercase">CLIAS</span>
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">University Portal Sign In</h1>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#faf7f2] dark:bg-[#121b30] py-7 px-6 border border-[rgba(74,111,165,0.28)] dark:border-[rgba(106,144,197,0.2)] shadow-xl sm:px-9" style={{ borderRadius: 0 }}>

          {/* Quick Select Role Selector Tabs */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Select Role:
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Ready
              </span>
            </div>

            <div className="grid grid-cols-6 gap-1.5 font-mono text-[10px] font-bold">
              {ROLE_PRESETS.map((preset, idx) => {
                const isActive = preset.id === selectedRole;
                const colSpan = idx < 3 ? 'col-span-2' : 'col-span-3';
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`${colSpan} py-2 px-2 text-center transition cursor-pointer border flex items-center justify-center gap-1 ${
                      isActive
                        ? `${preset.accentColor} border-2 shadow-sm font-black`
                        : 'border-[rgba(74,111,165,0.2)] dark:border-white/10 hover:border-[#e05033]/50 text-slate-600 dark:text-slate-400 bg-white/40 dark:bg-white/5'
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    {isActive && <Check className="w-3 h-3 shrink-0" />}
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Role Meta Notice */}
            <div className="mt-2.5 px-2.5 py-1.5 bg-[rgba(74,111,165,0.06)] dark:bg-white/5 border border-[rgba(74,111,165,0.18)] dark:border-white/10 flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-600 dark:text-slate-300 truncate">
                Role: <strong className="text-slate-900 dark:text-white uppercase">{currentPreset.label}</strong> ({currentPreset.description})
              </span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 font-mono uppercase tracking-wider text-[11px]">
                University Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  autoComplete="username"
                  placeholder={`name@${process.env.NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN || 'charusat.edu.in'}`}
                  className="w-full pl-10 pr-4 py-2.5 text-[11px] font-mono bg-[rgba(74,111,165,0.06)] dark:bg-[rgba(106,144,197,0.06)] border border-[rgba(74,111,165,0.28)] dark:border-[rgba(106,144,197,0.2)] text-[#1a2540] dark:text-[#e8edf5] focus:outline-none focus:border-[#e05033] focus:bg-[#faf7f2] dark:focus:bg-[#121b30] transition tracking-wider placeholder:normal-case placeholder:tracking-normal"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider text-[11px]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] font-mono text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-[11px] font-mono bg-[rgba(74,111,165,0.06)] dark:bg-[rgba(106,144,197,0.06)] border border-[rgba(74,111,165,0.28)] dark:border-[rgba(106,144,197,0.2)] text-[#1a2540] dark:text-[#e8edf5] focus:outline-none focus:border-[#e05033] focus:bg-[#faf7f2] dark:focus:bg-[#121b30] transition"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-[10px] font-mono font-bold uppercase tracking-widest text-white bg-[#e05033] hover:bg-[#c8432b] transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
              style={{ borderRadius: 0 }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{loading ? 'Authenticating...' : `Sign In as ${currentPreset.label}`}</span>
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-[rgba(74,111,165,0.15)] dark:border-white/10 pt-4">
            <span>New university student? </span>
            <Link href="/auth/register" className="font-mono font-bold text-[10px] uppercase tracking-widest text-[#e05033] dark:text-[#e8604a] hover:underline">
              Activate your account &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
