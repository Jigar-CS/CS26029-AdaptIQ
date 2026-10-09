'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  sanitizeText,
  sanitizePhone,
  sanitizeAiInput,
  validateUrl,
  validateProfileField,
  LIMITS,
} from '@/lib/sanitize';
import { UserRole } from '@clias/shared-types';
import {
  User,
  Mail,
  Phone,
  Building,
  GraduationCap,
  Briefcase,
  Lock,
  Bell,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  ExternalLink,
  Code2,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Globe,
  Github,
  Linkedin,
  Clock,
  MapPin,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';

interface ProfileViewProps {
  forcedRole?: UserRole;
  roleTitle?: string;
  roleDescription?: string;
}

export function ProfileView({ forcedRole, roleTitle, roleDescription }: ProfileViewProps) {
  const { user, updateUser } = useAuth();
  const activeRole = forcedRole || user?.role || UserRole.STUDENT;

  const [activeTab, setActiveTab] = useState<'profile' | 'academic' | 'security' | 'preferences'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');

  // Student specific
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [institute, setInstitute] = useState('CSPIT');
  const [programName, setProgramName] = useState('B.Tech Computer Engineering');
  const [semester, setSemester] = useState<number>(4);
  const [division, setDivision] = useState('CE-A');
  const [graduationYear, setGraduationYear] = useState<number>(2026);
  const [targetRole, setTargetRole] = useState('SDE');

  // Faculty & Admin specific
  const [employeeCode, setEmployeeCode] = useState('');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preferences
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    systemAlerts: true,
    digestWeekly: true,
    darkModeSync: true,
  });

  // Avatar presets
  const avatarColors = [
    'from-blue-600 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-purple-600 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-cyan-600 to-blue-700',
    'from-rose-500 to-red-600',
  ];
  const [selectedAvatarColor, setSelectedAvatarColor] = useState(avatarColors[0]);

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  const fetchProfile = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.get('/profile/me');
      if (data) {
        setName(data.name || user?.name || '');
        setEmail(data.email || user?.email || '');
        setPhoneNumber(data.phoneNumber || '');
        setBio(data.bio || '');
        setDepartment(data.department || '');
        setDesignation(data.designation || '');
        setOfficeLocation(data.officeLocation || '');
        setSpecialization(data.specialization || '');
        setGithubUrl(data.githubUrl || '');
        setLinkedinUrl(data.linkedinUrl || '');
        setPortfolioUrl(data.portfolioUrl || '');
        setSkills(Array.isArray(data.skills) ? data.skills : []);

        if (data.studentDetails) {
          setEnrollmentNumber(data.studentDetails.enrollmentNumber || '');
          setInstitute(data.studentDetails.institute || 'CSPIT');
          setProgramName(data.studentDetails.programName || 'B.Tech Computer Engineering');
          setSemester(data.studentDetails.semester || 4);
          setDivision(data.studentDetails.division || 'CE-A');
          setGraduationYear(data.studentDetails.graduationYear || 2026);
        }

        if (data.placementDetails?.targetRole) {
          setTargetRole(data.placementDetails.targetRole);
        }

        if (data.facultyDetails?.employeeCode) {
          setEmployeeCode(data.facultyDetails.employeeCode);
        }

        if (data.preferences) {
          setPreferences((prev) => ({ ...prev, ...data.preferences }));
        }
      }
    } catch {
      // Fallback with current session details
      if (user) {
        setName(user.name || user.email.split('@')[0]);
        setEmail(user.email);
        if (user.studentDetails) {
          setEnrollmentNumber(user.studentDetails.enrollmentNumber || '');
          setInstitute(user.studentDetails.institute || 'CSPIT');
          setDepartment(user.studentDetails.department || 'Computer Engineering');
          setProgramName(user.studentDetails.programName || 'B.Tech Computer Engineering');
          setSemester(user.studentDetails.semester || 4);
          setDivision(user.studentDetails.division || 'CE-A');
          setGraduationYear(user.studentDetails.graduationYear || 2026);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    // ── Client-side validation ───────────────────────────────────────────────
    if (!name.trim()) {
      setErrorMessage('Full name is required.');
      setSaving(false);
      return;
    }
    if (name.trim().length > LIMITS.name) {
      setErrorMessage(`Name must be ${LIMITS.name} characters or fewer.`);
      setSaving(false);
      return;
    }
    if (phoneNumber && !/^[0-9\s\-+().]*$/.test(phoneNumber)) {
      setErrorMessage('Phone number contains invalid characters.');
      setSaving(false);
      return;
    }
    if (bio && bio.length > LIMITS.bio) {
      setErrorMessage(`Bio must be ${LIMITS.bio} characters or fewer.`);
      setSaving(false);
      return;
    }
    if (githubUrl && !validateUrl(githubUrl)) {
      setErrorMessage('GitHub URL must be a valid http/https URL.');
      setSaving(false);
      return;
    }
    if (linkedinUrl && !validateUrl(linkedinUrl)) {
      setErrorMessage('LinkedIn URL must be a valid http/https URL.');
      setSaving(false);
      return;
    }
    if (portfolioUrl && !validateUrl(portfolioUrl)) {
      setErrorMessage('Portfolio URL must be a valid http/https URL.');
      setSaving(false);
      return;
    }

    // ── Sanitize before sending ──────────────────────────────────────────────
    const payload = {
      name:            sanitizeText(name, LIMITS.name),
      phoneNumber:     sanitizePhone(phoneNumber),
      bio:             sanitizeText(bio, LIMITS.bio),
      department:      sanitizeText(department, 120),
      designation:     sanitizeText(designation, 120),
      officeLocation:  sanitizeText(officeLocation, LIMITS.officeLocation),
      specialization:  sanitizeText(specialization, LIMITS.specialization),
      githubUrl:       githubUrl.trim() || undefined,
      linkedinUrl:     linkedinUrl.trim() || undefined,
      portfolioUrl:    portfolioUrl.trim() || undefined,
      skills:          skills.map((s) => sanitizeText(s, LIMITS.skill)).filter(Boolean).slice(0, LIMITS.maxSkills),
      targetRole:      sanitizeText(targetRole, 40),
      semester:        Number(semester),
      division:        sanitizeText(division, 40),
      employeeCode:    sanitizeText(employeeCode, 40),
      preferences,
    };

    try {
      const updated = await api.patch('/profile/me', payload);
      setSaveSuccess('Your profile changes have been saved successfully.');
      updateUser({
        name: updated.name || name,
      });
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword.length > LIMITS.password) {
      setPasswordMessage({ type: 'error', text: `Password must be ${LIMITS.password} characters or fewer.` });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setPasswordSaving(true);
    try {
      await api.post('/profile/change-password', {
        // Strip null bytes — no other transform needed (passwords are hashed server-side)
        currentPassword: currentPassword.replace(/\0/g, ''),
        newPassword: newPassword.replace(/\0/g, ''),
      });
      setPasswordMessage({ type: 'success', text: 'Password successfully updated! Your account is now secured.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage({
        type: 'error',
        text: err.message || 'Incorrect current password or invalid request.',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  const addSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = sanitizeText(newSkillInput, LIMITS.skill);
    if (!trimmed) return;
    if (skills.length >= LIMITS.maxSkills) {
      setErrorMessage(`You can add a maximum of ${LIMITS.maxSkills} skills.`);
      return;
    }
    if (!skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setNewSkillInput('');
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Helper for password strength
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200 dark:bg-slate-700' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score: 65, label: 'Moderate', color: 'bg-amber-500' };
    return { score: 100, label: 'Strong & Secure', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading your profile data...</p>
      </div>
    );
  }

  const roleColors: Record<string, { bg: string; text: string; border: string }> = {
    STUDENT: { bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    FACULTY: { bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
    COUNSELLOR: { bg: 'bg-teal-50 dark:bg-teal-950/60', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
    HOD: { bg: 'bg-indigo-50 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
    HEAD: { bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
    SUPER_ADMIN: { bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  };

  const currentRoleStyle = roleColors[activeRole] || roleColors.STUDENT;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-blue-500/10 via-indigo-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {/* Avatar with initial */}
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${selectedAvatarColor} text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-blue-500/20 ring-4 ring-white dark:ring-slate-800 shrink-0`}>
              {name ? name.slice(0, 2).toUpperCase() : (user?.email?.slice(0, 2).toUpperCase() || 'CL')}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {name || user?.name || user?.email}
                </h2>
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${currentRoleStyle.bg} ${currentRoleStyle.text} ${currentRoleStyle.border}`}>
                  {activeRole}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified Institutional Account
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                <span>{email || user?.email}</span>
                <span>•</span>
                <span>{department || 'Computer Engineering'}</span>
                {enrollmentNumber && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">ID: {enrollmentNumber}</span>
                  </>
                )}
                {employeeCode && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Emp Code: {employeeCode}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchProfile}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </div>

        {/* Success / Error Alerts */}
        {saveSuccess && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mt-6 -mb-2 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Personal Information</span>
          </button>

          <button
            onClick={() => setActiveTab('academic')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'academic'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>
              {activeRole === UserRole.STUDENT ? 'Academic & Placement Record' : 'Professional & Role Details'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Security & Password</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'preferences'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notification Preferences</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Personal Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Identity & Contact Information</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update how your name, profile badge, and contact channels appear across the CLIAS platform.
              </p>
            </div>

            {/* Avatar Theme Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Avatar Gradient Style
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {avatarColors.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatarColor(color)}
                    className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} transition transform active:scale-90 flex items-center justify-center text-white ${
                      selectedAvatarColor === color ? 'ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-slate-900 scale-105 shadow-md' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {selectedAvatarColor === color && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Display Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  University Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl cursor-not-allowed"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Institutional email is managed by your registrar.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Campus / Cabin / Office Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={officeLocation}
                    onChange={(e) => setOfficeLocation(e.target.value)}
                    placeholder={activeRole === UserRole.STUDENT ? 'e.g. Lab 402 / Block 3' : 'e.g. Room 214, Faculty Tower'}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Bio &amp; Professional Statement
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief summary of your learning objectives, focus areas, or departmental mission..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
              />
            </div>
          </div>

          {/* Social & Portfolio Links */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Professional &amp; Coding Portfolios</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect external profiles for project portfolios, competitive code archives, and verified credentials.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  GitHub Profile
                </label>
                <div className="relative">
                  <Github className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  LinkedIn Profile
                </label>
                <div className="relative">
                  <Linkedin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Personal Portfolio / Research Site
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://yourwebsite.edu"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Personal Details'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Academic / Professional Details */}
      {activeTab === 'academic' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeRole === UserRole.STUDENT ? 'Institutional Academic Profile' : 'Professional Faculty Credentials'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeRole === UserRole.STUDENT
                    ? 'Curriculum cohorts, verified enrollment data, and technical readiness indicators.'
                    : 'Departmental assignments, academic ranks, and instructional domains.'}
                </p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${currentRoleStyle.bg} ${currentRoleStyle.text} ${currentRoleStyle.border}`}>
                {activeRole}
              </span>
            </div>

            {/* STUDENT VIEW */}
            {activeRole === UserRole.STUDENT && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Enrollment Number
                    </span>
                    <p className="text-sm font-black text-blue-700 dark:text-blue-300 font-mono mt-0.5">
                      {enrollmentNumber || '24CS093'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Institute
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {institute} (CHARUSAT)
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Degree Program
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {programName}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Graduation Year
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {graduationYear}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Current Semester
                    </label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Class Section / Division
                    </label>
                    <input
                      type="text"
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      placeholder="e.g. CE-A"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Target Career Benchmark
                    </label>
                    <select
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
                    >
                      <option value="SDE">Software Development Engineer (SDE)</option>
                      <option value="DATA_ANALYST">Data Analyst &amp; BI Engineer</option>
                      <option value="ML_ENGINEER">Machine Learning &amp; AI Specialist</option>
                      <option value="CYBERSECURITY_ANALYST">Cybersecurity &amp; Pen Tester</option>
                      <option value="CLOUD_DEVOPS">Cloud &amp; DevOps Infrastructure</option>
                      <option value="GATE_CS">GATE CS Academic Aspirant</option>
                    </select>
                  </div>
                </div>

                {/* Skills Tag Editor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Technical Core Skills &amp; Competencies
                  </label>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="hover:text-rose-500 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        onKeyDown={addSkill}
                        placeholder="Add skill (e.g. React, Next.js, Docker, Python)... press Enter"
                        className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={addSkill}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold rounded-lg transition"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FACULTY / COUNSELLOR / HOD / HEAD / SUPER_ADMIN VIEW */}
            {activeRole !== UserRole.STUDENT && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Employee ID / Faculty Code
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={employeeCode}
                        onChange={(e) => setEmployeeCode(e.target.value)}
                        placeholder="e.g. FAC-2024-089"
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Designation / Title
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder={activeRole === UserRole.SUPER_ADMIN ? 'System Administrator' : 'Assistant Professor'}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Academic Department / Division
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Computer Science & Engineering"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Specialization / Research Domains
                    </label>
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g. Machine Learning, Distributed Systems, Data Science"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Skills/Tags */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Areas of Expertise &amp; Instructional Focus
                  </label>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="hover:text-rose-500 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        onKeyDown={addSkill}
                        placeholder="Add domain (e.g. AI Research, Accreditation, Curriculum)... press Enter"
                        className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={addSkill}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold rounded-lg transition"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Academic Details'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Security & Password */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Update Account Password</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enhance your institutional portal security by maintaining strong, non-reused password credentials.
              </p>
            </div>

            {passwordMessage && (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold animate-in fade-in ${
                  passwordMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                {passwordMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters with mixed symbols"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                {/* Password strength meter */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex justify-between">
                      <span>Strength: {strength.label}</span>
                      <span>{strength.score}%</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{passwordSaving ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Security status side card */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Security Diagnostics</span>
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Institutional Domain</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">@charusat.edu.in</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Account Authorization</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">JWT Bearer (7 Days)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Active Role Policy</span>
                  <span className="font-bold text-slate-900 dark:text-white">{activeRole}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Email Verification</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Security Recommendation:</p>
                <p>Use passphrases containing numbers and symbols. CLIAS uses SHA-256 salted bcrypt hashes.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Notification Preferences */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Communication &amp; Portal Preferences</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure automated notifications sent to your registered Charusat email address.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Adaptive Assessment &amp; Exam Notifications
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Receive email alerts when scheduled assessments, quizzes, or invigilation slots are published.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Platform Security &amp; Institutional Alerts
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    High-priority security updates, login alerts, and administrative broadcast notifications.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.systemAlerts}
                  onChange={(e) => setPreferences({ ...preferences, systemAlerts: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Weekly Learning &amp; Mastery Digest
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Weekly summary of questions solved, retention decay alerts, and target role readiness progress.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.digestWeekly}
                  onChange={(e) => setPreferences({ ...preferences, digestWeekly: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
