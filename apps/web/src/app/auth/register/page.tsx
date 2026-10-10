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
} from 'lucide-react';
import { UserRole } from '@clias/shared-types';

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: Set Password
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STUDENT);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
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
      setError(
        selectedRole === UserRole.STUDENT
          ? 'Please enter your Student ID / Enrollment Number (e.g. 24CS093).'
          : 'Please enter your Faculty ID or Official Name (e.g. dharasolanki.cse).'
      );
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/register/request-otp', {
        email,
        role: selectedRole,
      });
      setInfoMsg(res.message || `Verification code dispatched to ${email}.`);
      setStep(2);
      setResendCountdown(30);
    } catch (err: any) {
      setError(err.message || 'Failed to request verification code.');
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
      setInfoMsg(res.message || `A new verification code has been dispatched to ${email}.`);
      setResendCountdown(30);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
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
      } else if (res.profile) {
        setStaffDetails(res.profile);
      } else {
        setStaffDetails({ email, role: selectedRole, name: cleanIdentifier });
      }
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set password and finalize registration
  const handleFinalizeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (selectedRole === UserRole.FACULTY && !selectedCourseId) {
      setError('Please select the teaching subject you are assigned to instruct.');
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
        fullName: staffDetails?.name,
        courseId: selectedRole === UserRole.FACULTY ? selectedCourseId : undefined,
      });

      localStorage.setItem('clias_token', res.accessToken);
      localStorage.setItem('clias_user', JSON.stringify(res.user));

      if (selectedRole === UserRole.FACULTY) {
        router.push('/faculty/dashboard');
      } else if (selectedRole === UserRole.COUNSELLOR) {
        router.push('/counsellor/dashboard');
      } else if (selectedRole === UserRole.HOD) {
        router.push('/hod/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link href="/" className="inline-flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
            <BrainCircuit className="w-7 h-7" />
          </div>
        </Link>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Institutional Account Registration</h2>
        <p className="text-xs text-slate-400 mt-1">
          Verify institutional credentials & activate your {universityName} profile
        </p>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div
            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
              step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
            }`}
          >
            1
          </div>
          <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-800'}`}></div>
          <div
            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
              step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
            }`}
          >
            2
          </div>
          <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-800'}`}></div>
          <div
            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
              step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
            }`}
          >
            3
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-950/80 backdrop-blur-xl py-8 px-6 shadow-2xl border border-slate-800 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {infoMsg && (
            <div className="mb-5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* STEP 1: Role Selection & Institutional ID */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      selectedRole === UserRole.STUDENT
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
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
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      selectedRole === UserRole.FACULTY
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Faculty</span>
                  </button>
                </div>
              </div>

              {/* Strict Institutional Policy Banner */}
              {isFacultyOrStaff ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Fixed Faculty Domain: @charusat.ac.in</span>
                  </div>
                  <p className="text-amber-300/80">
                    Faculty & staff only need to enter their official ID or name prefix. Verification OTP will be automatically dispatched to <strong>[name/id]@charusat.ac.in</strong>.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                    <span>Fixed Student Domain: @charusat.edu.in</span>
                  </div>
                  <p className="text-blue-300/80">
                    Students only need to enter their Student ID (e.g. 24CS093). Verification OTP will be automatically dispatched to <strong>[student_id]@charusat.edu.in</strong>.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isFacultyOrStaff ? 'Faculty ID or Official Name' : 'Student ID / Enrollment Number'}
                </label>
                <div className="flex rounded-xl overflow-hidden border border-slate-700 bg-slate-900 focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:border-indigo-500 transition shadow-inner">
                  <div className="pl-3.5 pr-1 flex items-center text-slate-500">
                    {isFacultyOrStaff ? (
                      <Briefcase className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <GraduationCap className="w-4 h-4 text-indigo-400" />
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
                    className="w-full py-2.5 px-2.5 text-xs bg-transparent text-white font-mono placeholder:text-slate-500 focus:outline-none"
                  />
                  <div
                    className={`px-3 py-2.5 border-l border-slate-700 text-xs font-mono font-bold flex items-center select-none ${
                      isFacultyOrStaff ? 'bg-emerald-950/40 text-emerald-300' : 'bg-indigo-950/40 text-indigo-300'
                    }`}
                  >
                    @{targetDomain}
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate mr-2">
                    Mail will be sent to:{' '}
                    <strong className="text-white font-mono">
                      {cleanIdentifier ? `${cleanIdentifier}@${targetDomain}` : `[id]@${targetDomain}`}
                    </strong>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400 shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Locked
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !cleanIdentifier}
                className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{loading ? 'Sending verification code...' : 'Send Verification OTP'}</span>
              </button>
            </form>
          )}

          {/* STEP 2: Verify OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-500 text-[11px]">Verification Email Dispatched:</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      selectedRole === UserRole.STUDENT
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {selectedRole}
                  </span>
                </div>
                <p className="font-bold text-white font-mono text-sm">{email}</p>
                <p className="text-[11px] text-indigo-400 mt-2">
                  💡 A 6-digit verification code has been dispatched to your email address.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enter 6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 text-center font-mono tracking-widest text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs px-0.5">
                <span className="text-slate-400 text-[11px]">Didn&apos;t receive code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || resendCountdown > 0}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 disabled:cursor-not-allowed transition flex items-center gap-1"
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
                  className="w-1/3 py-2.5 px-3 text-xs font-semibold text-slate-400 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-2/3 py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
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
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                    {selectedRole === UserRole.STUDENT ? 'Verified Student Record' : 'Verified Faculty Profile'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Verified @{targetDomain}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-bold text-white">{email}</span>
                  </div>
                  {studentDetails && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Name:</span>
                        <span className="font-bold text-white">{studentDetails.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Enrollment:</span>
                        <span className="font-bold font-mono text-indigo-300">
                          {studentDetails.enrollmentNumber}
                        </span>
                      </div>
                    </>
                  )}
                  {staffDetails && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Role:</span>
                      <span className="font-bold text-emerald-400">{selectedRole}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Faculty Subject Allocation */}
              {selectedRole === UserRole.FACULTY && (
                <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Designated Teaching Subject (Fixed Allocation)</span>
                  </div>
                  <div className="text-[11px] text-slate-300 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-500/20 leading-relaxed">
                    ⚠️ <strong>Permanent Assignment:</strong> You will be registered exclusively for this subject. All your assessments, question banks, AI question generators, and class analytics will be restricted strictly to this subject.
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Which subject are you teaching?
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition cursor-pointer"
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
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">
                          {courses.find((c) => c.id === selectedCourseId)?.code} - {courses.find((c) => c.id === selectedCourseId)?.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Semester {courses.find((c) => c.id === selectedCourseId)?.semester} &bull; Department of Computer Engineering
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] shrink-0 border border-emerald-500/30">
                        Assigned Subject
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || password.length < 6}
                className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Activate Account & Proceed</span>
              </button>
            </form>
          )}

          <div className="mt-5 text-center text-xs text-slate-400">
            <span>Already registered? </span>
            <Link href="/auth/login" className="font-bold text-indigo-400 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
