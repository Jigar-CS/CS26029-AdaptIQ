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
} from 'lucide-react';
import { UserRole } from '@clias/shared-types';
import { toast } from '@/lib/toast';

export default function LoginPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  const { user, login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  // Cooldown countdown timer for rate limiting
  React.useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Warm-up and prefetch destination dashboard bundles on mount for instant zero-lag entry
  React.useEffect(() => {
    // Force reset any browser autofill on initial mount
    setEmail('');
    setPassword('');
    const t = setTimeout(() => {
      setEmail('');
      setPassword('');
    }, 100);

    router.prefetch('/faculty/dashboard');
    router.prefetch('/student/dashboard');
    router.prefetch('/faculty/counselling');
    router.prefetch('/hod/dashboard');
    router.prefetch('/admin/dashboard');

    return () => clearTimeout(t);
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Please enter your university email and password.', 'Required Fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.name || user.email}!`, 'Signed In');

      // Role-aware redirection
      if (user.role === UserRole.SUPER_ADMIN) {
        router.push('/admin/dashboard');
      } else if (user.role === UserRole.HOD) {
        router.push('/hod/dashboard');
      } else if (user.role === UserRole.FACULTY) {
        router.push('/faculty/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch (err: any) {
      if (err.status === 429) {
        const retry = err.data?.retryAfter || 45;
        setCooldownSeconds(retry);
        const rateMsg = `Too many attempts. For security, please wait ${retry} seconds before trying again.`;
        setError(rateMsg);
        toast.warning(rateMsg, 'Rate Limit Exceeded');
      } else {
        const errMsg = err.message || 'Invalid email or password. Please verify your credentials.';
        setError(errMsg);
        toast.error(errMsg, 'Authentication Failed');
      }
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

          {user && (
            <div className="mb-5 p-3.5 bg-blue-500/10 border border-blue-500/30 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                  Active Session Detected
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-600/15 text-blue-700 dark:text-blue-300">
                  {user.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate">
                Signed in as <strong className="text-slate-900 dark:text-white">{user.name || user.email}</strong>
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Link
                  href={
                    user.role === UserRole.SUPER_ADMIN
                      ? '/admin/dashboard'
                      : user.role === UserRole.HOD
                      ? '/hod/dashboard'
                      : user.role === UserRole.FACULTY
                      ? '/faculty/dashboard'
                      : '/student/dashboard'
                  }
                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-[#e05033] hover:bg-[#c8432b] transition shadow-xs"
                  style={{ borderRadius: 0 }}
                >
                  Go to {user.role === UserRole.FACULTY ? 'Faculty' : user.role === UserRole.STUDENT ? 'Student' : 'Admin'} Dashboard &rarr;
                </Link>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer"
                  style={{ borderRadius: 0 }}
                >
                  Sign Out
                </button>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-blue-500/20">
                Or enter credentials below to switch accounts:
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            {/* Hidden dummy fields to neutralize browser credential autofill heuristics */}
            <input
              type="text"
              name="prevent_autofill_username"
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
              className="sr-only opacity-0 w-0 h-0 absolute -z-50 pointer-events-none"
            />
            <input
              type="password"
              name="prevent_autofill_password"
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="new-password"
              className="sr-only opacity-0 w-0 h-0 absolute -z-50 pointer-events-none"
            />

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 font-mono uppercase tracking-wider text-[11px]">
                University Email Address or Student ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="charusat_identifier"
                  id="charusat_identifier"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  placeholder="name@charusat.edu.in or Student ID (e.g. 24CS090)"
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
                  name="charusat_access_token"
                  id="charusat_access_token"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-[11px] font-mono bg-[rgba(74,111,165,0.06)] dark:bg-[rgba(106,144,197,0.06)] border border-[rgba(74,111,165,0.28)] dark:border-[rgba(106,144,197,0.2)] text-[#1a2540] dark:text-[#e8edf5] focus:outline-none focus:border-[#e05033] focus:bg-[#faf7f2] dark:focus:bg-[#121b30] transition"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || cooldownSeconds > 0}
              className="w-full py-3 px-4 text-[10px] font-mono font-bold uppercase tracking-widest text-white bg-[#e05033] hover:bg-[#c8432b] transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2 disabled:cursor-not-allowed"
              style={{ borderRadius: 0 }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>
                {loading
                  ? 'Authenticating...'
                  : cooldownSeconds > 0
                  ? `Cooldown Active (${cooldownSeconds}s)`
                  : 'Sign In'}
              </span>
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
