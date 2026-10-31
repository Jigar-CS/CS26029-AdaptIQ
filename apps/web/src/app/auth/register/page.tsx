'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  BrainCircuit,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GraduationCap,
  Briefcase,
  ShieldAlert,
  BookOpen,
  RotateCcw,
  User,
} from 'lucide-react';
import { UserRole } from '@clias/shared-types';
import { toast } from '@/lib/toast';

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: Set Password
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STUDENT);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [staffDetails, setStaffDetails] = useState<any>(null);

  // Teaching subject allocation for faculty
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState<number>(0);

  const router = useRouter();
  const universityName = process.env.NEXT_PUBLIC_UNIVERSITY_NAME || 'CHARUSAT';

  // Load available subjects on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const list = await api.get('/courses');
        if (Array.isArray(list) && list.length > 0) {
          setCourses(list);
          setSelectedCourseId(list[0].id);
        }
      } catch (e) {
        console.warn('Could not load curriculum course list:', e);
      }
    };
    fetchCourses();
  }, []);

  // Timer for Resend OTP button
  useEffect(() => {
    let timer: any;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Fixed institutional domain based on selected role:
  // Student -> charusat.edu.in
  // Faculty -> charusat.ac.in
  const isFacultyOrStaff = selectedRole !== UserRole.STUDENT;
  const targetDomain = isFacultyOrStaff ? 'charusat.ac.in' : 'charusat.edu.in';

  // Clean identifier: strip any accidental '@...' typed or pasted
  const cleanIdentifier = identifier.trim().toLowerCase().replace(/@.*$/, '');
  const email = cleanIdentifier ? `${cleanIdentifier}@${targetDomain}` : '';

  const handleIdentifierChange = (val: string) => {
    // If the user pastes or types an email with '@', take only the prefix before '@'
    const stripped = val.replace(/@.*$/, '').trim();
    setIdentifier(stripped);
    setError(null);
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (!cleanIdentifier) {
      const msg =
        selectedRole === UserRole.STUDENT
          ? 'Please enter your Student ID / Enrollment Number (e.g. 24CS093).'
          : 'Please enter your Faculty ID or Official Name (e.g. dharasolanki.cse).';
      setError(msg);
      toast.error(msg, 'Required Field');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/register/request-otp', {
        email,
        role: selectedRole,
      });
      const msg = res.message || `Verification code dispatched to ${email}.`;
      setInfoMsg(msg);
      toast.success(msg, 'OTP Dispatched');
      setStep(2);
      setResendCountdown(30);
    } catch (err: any) {
      const errMsg = err.message || 'Failed to request verification code.';
      setError(errMsg);
      toast.error(errMsg, 'Request Failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/register/request-otp', {
        email,
        role: selectedRole,
      });
      const msg = res.message || `A new verification code has been dispatched to ${email}.`;
      setInfoMsg(msg);
      toast.info(msg, 'Code Resent');
      setResendCountdown(30);
    } catch (err: any) {
      const errMsg = err.message || 'Failed to resend verification code.';
      setError(errMsg);
      toast.error(errMsg, 'Resend Failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/register/verify-otp', {
        email,
        otp: otp.trim(),
        role: selectedRole,
      });

      if (res.student) {
        setStudentDetails(res.student);
        if (res.student.name && !res.student.name.startsWith('Student ')) {
          setFullName(res.student.name);
        } else {
          setFullName('');
        }
      } else if (res.profile) {
        setStaffDetails(res.profile);
        if (res.profile.name) {
          setFullName(res.profile.name);
        }
      } else {
        setStaffDetails({ email, role: selectedRole, name: cleanIdentifier });
        setFullName(cleanIdentifier);
      }
      toast.success('Identity verified successfully!', 'Verified');
      setStep(3);
    } catch (err: any) {
      const errMsg = err.message || 'Invalid or expired verification code.';
      setError(errMsg);
      toast.error(errMsg, 'Verification Failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set password and finalize registration
  const handleFinalizeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      const msg = 'Please enter your official full name.';
      setError(msg);
      toast.warning(msg, 'Name Required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      toast.error('Passwords do not match. Please re-enter your password.', 'Password Mismatch');
      return;
    }

    if (selectedRole === UserRole.FACULTY && !selectedCourseId) {
      const msg = 'Please select the teaching subject you are assigned to instruct.';
      setError(msg);
      toast.warning(msg, 'Selection Required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/register', {
        email,
        otp: otp.trim(),
        password,
        role: selectedRole,
        fullName: fullName.trim(),
        courseId: selectedRole === UserRole.FACULTY ? selectedCourseId : undefined,
      });

      toast.success('Account successfully registered! Please sign in with your credentials.', 'Registration Complete');
      router.push('/auth/login');
    } catch (err: any) {
      const errMsg = err.message || 'Registration failed.';
      setError(errMsg);
      toast.error(errMsg, 'Registration Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent grid-paper flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-[#1a2540] dark:text-[#e8edf5] z-10">
      {/* Background accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#e05033]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
          <div className="w-12 h-12 bg-[#e05033] flex items-center justify-center text-white shadow-sm" style={{ borderRadius: 0 }}>
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div className="text-left">
            <span className="font-display font-black text-2xl tracking-wider text-[#1a2540] dark:text-white block leading-none">
              CLIAS
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#4a6fa5] dark:text-slate-400">
              Intelligence System
            </span>
          </div>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-[#141c2e] dark:text-white">
          Institutional Registration
        </h1>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mt-5 font-mono">
          <div
            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border transition ${
              step >= 1
                ? 'bg-[#dc2626] text-white border-[#dc2626] shadow-sm'
                : 'bg-white/60 dark:bg-slate-800 text-[#141c2e]/50 dark:text-slate-400 border-[#141c2e]/10 dark:border-slate-700'
            }`}
          >
            1
          </div>
          <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-[#dc2626]' : 'bg-[#141c2e]/10 dark:bg-slate-700'}`} />
          <div
            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border transition ${
              step >= 2
                ? 'bg-[#dc2626] text-white border-[#dc2626] shadow-sm'
                : 'bg-white/60 dark:bg-slate-800 text-[#141c2e]/50 dark:text-slate-400 border-[#141c2e]/10 dark:border-slate-700'
            }`}
          >
            2
          </div>
          <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-[#dc2626]' : 'bg-[#141c2e]/10 dark:bg-slate-700'}`} />
          <div
            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border transition ${
              step >= 3
                ? 'bg-[#dc2626] text-white border-[#dc2626] shadow-sm'
                : 'bg-white/60 dark:bg-slate-800 text-[#141c2e]/50 dark:text-slate-400 border-[#141c2e]/10 dark:border-slate-700'
            }`}
          >
            3
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#faf8f5] dark:bg-[#0f172a] py-8 px-6 shadow-xl border border-[#141c2e]/14 dark:border-white/10 sm:rounded-2xl sm:px-10 backdrop-blur-sm">
          {/* STEP 1: Role Selection & Institutional ID */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-[#141c2e]/80 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Registering As:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole(UserRole.STUDENT);
                      setIdentifier('');
                      setError(null);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                      selectedRole === UserRole.STUDENT
                        ? 'bg-[#dc2626] text-white border-[#dc2626] shadow-md shadow-red-600/20'
                        : 'bg-white/60 dark:bg-slate-900/60 text-[#141c2e]/70 dark:text-slate-400 border-[#141c2e]/12 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole(UserRole.FACULTY);
                      setIdentifier('');
                      setError(null);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                      selectedRole === UserRole.FACULTY
                        ? 'bg-[#0d9488] text-white border-[#0d9488] shadow-md shadow-teal-600/20'
                        : 'bg-white/60 dark:bg-slate-900/60 text-[#141c2e]/70 dark:text-slate-400 border-[#141c2e]/12 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Faculty</span>
                  </button>
                </div>
              </div>

              {/* Strict Institutional Policy Banner */}
              {isFacultyOrStaff ? (
                <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-900 dark:text-teal-200 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold font-mono">
                    <ShieldAlert className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Fixed Domain: @charusat.ac.in</span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold font-mono">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Fixed Domain: @charusat.edu.in</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#141c2e]/80 dark:text-slate-300 mb-1">
                  {isFacultyOrStaff ? 'Faculty ID or Official Name' : 'Student ID / Enrollment Number'}
                </label>
                <div className="flex rounded-xl overflow-hidden border border-[#141c2e]/20 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-red-500/30 focus-within:border-[#dc2626] transition shadow-inner">
                  <div className="pl-3.5 pr-1 flex items-center text-[#141c2e]/50 dark:text-slate-500">
                    {isFacultyOrStaff ? (
                      <Briefcase className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    ) : (
                      <GraduationCap className="w-4 h-4 text-[#dc2626]" />
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    placeholder={
                      isFacultyOrStaff
                        ? 'e.g. dharasolanki.cse or john.doe'
                        : 'e.g. 24CS093'
                    }
                    className="w-full py-2.5 px-2.5 text-xs bg-transparent text-[#141c2e] dark:text-white font-mono placeholder:text-slate-400 focus:outline-none"
                  />
                  <div
                    className={`px-3 py-2.5 border-l border-[#141c2e]/10 dark:border-slate-700 text-xs font-mono font-bold flex items-center select-none ${
                      isFacultyOrStaff
                        ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300'
                    }`}
                  >
                    @{targetDomain}
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#141c2e]/60 dark:text-slate-400">
                  <span className="truncate mr-2 font-sans">
                    Mail will be sent to:{' '}
                    <strong className="text-[#141c2e] dark:text-white font-mono font-semibold">
                      {cleanIdentifier ? `${cleanIdentifier}@${targetDomain}` : `[id]@${targetDomain}`}
                    </strong>
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-teal-600 dark:text-teal-400 shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Locked
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !cleanIdentifier}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#dc2626] hover:bg-[#b91c1c] rounded-xl shadow-md shadow-red-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{loading ? 'Sending verification code...' : 'Send Verification OTP'}</span>
              </button>
            </form>
          )}

          {/* STEP 2: Verify OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#141c2e]/10 dark:border-slate-800 text-xs text-[#141c2e]/80 dark:text-slate-300">
                <div className="flex justify-between items-center mb-1.5 font-mono">
                  <span className="text-[#141c2e]/60 dark:text-slate-400 text-[11px]">Verification Email Dispatched:</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      selectedRole === UserRole.STUDENT
                        ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
                        : 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20'
                    }`}
                  >
                    {selectedRole}
                  </span>
                </div>
                <p className="font-bold text-[#141c2e] dark:text-white font-mono text-sm">{email}</p>
                <p className="text-[11px] text-teal-700 dark:text-teal-400 mt-2 font-sans">
                  💡 A 6-digit verification code has been dispatched to your email address.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[#141c2e]/80 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Enter 6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#141c2e]/40 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 text-center font-mono tracking-widest text-sm bg-white dark:bg-slate-900 border border-[#141c2e]/20 dark:border-slate-700 text-[#141c2e] dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-[#dc2626] transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs px-0.5">
                <span className="text-[#141c2e]/60 dark:text-slate-400 text-[11px]">Didn&apos;t receive code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || resendCountdown > 0}
                  className="text-xs font-mono font-semibold text-[#dc2626] hover:text-[#b91c1c] disabled:text-slate-400 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError(null);
                  }}
                  className="w-1/3 py-2.5 px-3 text-xs font-medium text-[#141c2e]/70 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-[#141c2e]/12 dark:border-slate-800 transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-2/3 py-2.5 px-4 text-xs font-semibold text-white bg-[#dc2626] hover:bg-[#b91c1c] rounded-xl shadow-md shadow-red-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Verify OTP</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Confirm Profile & Set Password */}
          {step === 3 && (
            <form onSubmit={handleFinalizeRegistration} className="space-y-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#141c2e]/12 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between border-b border-[#141c2e]/10 dark:border-slate-800 pb-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#dc2626] tracking-wider">
                    {selectedRole === UserRole.STUDENT ? 'Verified Student Record' : 'Verified Faculty Profile'}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                    Verified @{targetDomain}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#141c2e]/60 dark:text-slate-400">Email:</span>
                    <span className="font-mono font-bold text-[#141c2e] dark:text-white">{email}</span>
                  </div>
                  {studentDetails && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-[#141c2e]/60 dark:text-slate-400">Enrollment:</span>
                        <span className="font-bold font-mono text-[#dc2626]">
                          {studentDetails.enrollmentNumber}
                        </span>
                      </div>
                      {studentDetails.department && (
                        <div className="flex justify-between">
                          <span className="text-[#141c2e]/60 dark:text-slate-400">Department:</span>
                          <span className="font-medium text-[#141c2e] dark:text-white">
                            {studentDetails.department}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {staffDetails && (
                    <div className="flex justify-between">
                      <span className="text-[#141c2e]/60 dark:text-slate-400">Role:</span>
                      <span className="font-bold text-teal-700 dark:text-teal-400">{selectedRole}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Full Name Input */}
              <div>
                <label className="block text-xs font-medium text-[#141c2e]/80 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#141c2e]/40 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={
                      selectedRole === UserRole.STUDENT
                        ? 'Enter your official full name (e.g. Param Shah)'
                        : 'Enter your official full name (e.g. Prof. John Doe)'
                    }
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-slate-900 border border-[#141c2e]/20 dark:border-slate-700 text-[#141c2e] dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-[#dc2626] transition font-sans"
                  />
                </div>
              </div>

              {/* Faculty Subject Allocation */}
              {selectedRole === UserRole.FACULTY && (
                <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-teal-800 dark:text-teal-400 font-bold text-xs font-mono">
                    <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Designated Teaching Subject</span>
                  </div>
                  <div className="text-[11px] text-[#141c2e]/80 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-teal-500/20 leading-relaxed font-sans">
                    ⚠️ <strong>Permanent Assignment:</strong> You will be registered exclusively for this subject. Assessments and analytics will align with this subject.
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#141c2e]/80 dark:text-slate-300 mb-1">
                      Which subject are you teaching?
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-[#141c2e]/20 dark:border-slate-700 text-[#141c2e] dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition cursor-pointer"
                    >
                      <option value="" disabled>-- Select Your Teaching Subject --</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.name} (Semester {c.semester})
                        </option>
                      ))}
                    </select>
                  </div>
                  {courses.find((c) => c.id === selectedCourseId) && (
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-[#141c2e]/10 dark:border-slate-800 text-[11px] flex justify-between items-center">
                      <div>
                        <div className="font-bold text-[#141c2e] dark:text-white font-mono">
                          {courses.find((c) => c.id === selectedCourseId)?.code} - {courses.find((c) => c.id === selectedCourseId)?.name}
                        </div>
                        <div className="text-[10px] text-[#141c2e]/60 dark:text-slate-400">
                          Semester {courses.find((c) => c.id === selectedCourseId)?.semester} &bull; Computer Engineering
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 font-mono font-bold text-[10px] shrink-0 border border-teal-500/30">
                        Assigned
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#141c2e]/80 dark:text-slate-300 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#141c2e]/40 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-slate-900 border border-[#141c2e]/20 dark:border-slate-700 text-[#141c2e] dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-[#dc2626] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#141c2e]/80 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#141c2e]/40 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-slate-900 border border-[#141c2e]/20 dark:border-slate-700 text-[#141c2e] dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-[#dc2626] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || password.length < 6}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#dc2626] hover:bg-[#b91c1c] rounded-xl shadow-md shadow-red-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Activate Account & Proceed</span>
              </button>
            </form>
          )}

          <div className="mt-5 text-center text-xs text-[#141c2e]/60 dark:text-slate-400">
            <span>Already registered? </span>
            <Link href="/auth/login" className="font-semibold text-[#dc2626] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
