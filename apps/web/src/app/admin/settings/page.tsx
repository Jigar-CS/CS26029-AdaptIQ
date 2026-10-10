'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { UserRole } from '@clias/shared-types';
import {
  Settings,
  ShieldCheck,
  Building,
  Key,
  Cpu,
  Mail,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Globe,
  Database,
  Sliders,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [savedNotification, setSavedNotification] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [universityName, setUniversityName] = useState('CHARUSAT');
  const [universityFullName, setUniversityFullName] = useState('Charotar University of Science and Technology');
  const [emailDomain, setEmailDomain] = useState('charusat.edu.in');
  const [portalTitle, setPortalTitle] = useState('CLIAS — Learning Intelligence & Assessment System');

  const [jwtExpiry, setJwtExpiry] = useState('7d');
  const [otpExpiryMinutes, setOtpExpiryMinutes] = useState(5);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [enforceStrictIsolation, setEnforceStrictIsolation] = useState(true);

  const [aiServiceUrl, setAiServiceUrl] = useState('http://localhost:8000');
  const [ragSimilarityThreshold, setRagSimilarityThreshold] = useState(0.75);
  const [socraticMaxTurns, setSocraticMaxTurns] = useState(10);

  const [emailDriver, setEmailDriver] = useState('development');
  const [senderEmail, setSenderEmail] = useState('no-reply@charusat.edu.in');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== UserRole.SUPER_ADMIN)) {
      router.push('/auth/login');
      return;
    }

    const loadSettings = async () => {
      try {
        const config: any = await api.get('/admin/settings');
        if (config) {
          if (config.universityName) setUniversityName(config.universityName);
          if (config.universityFullName) setUniversityFullName(config.universityFullName);
          if (config.emailDomain) setEmailDomain(config.emailDomain);
          if (config.portalTitle) setPortalTitle(config.portalTitle);
          if (config.jwtExpiry) setJwtExpiry(config.jwtExpiry);
          if (config.otpExpiryMinutes) setOtpExpiryMinutes(config.otpExpiryMinutes);
          if (config.maxLoginAttempts) setMaxLoginAttempts(config.maxLoginAttempts);
          if (typeof config.enforceStrictIsolation === 'boolean') setEnforceStrictIsolation(config.enforceStrictIsolation);
          if (config.aiServiceUrl) setAiServiceUrl(config.aiServiceUrl);
          if (typeof config.ragSimilarityThreshold === 'number') setRagSimilarityThreshold(config.ragSimilarityThreshold);
          if (config.socraticMaxTurns) setSocraticMaxTurns(config.socraticMaxTurns);
          if (config.emailDriver) setEmailDriver(config.emailDriver);
          if (config.senderEmail) setSenderEmail(config.senderEmail);
        }
      } catch (err) {
        console.warn('Could not load dynamic settings:', err);
      }
    };

    if (user && user.role === UserRole.SUPER_ADMIN) {
      loadSettings();
    }
  }, [user, authLoading]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/admin/settings', {
        universityName,
        universityFullName,
        emailDomain,
        portalTitle,
        jwtExpiry,
        otpExpiryMinutes,
        maxLoginAttempts,
        enforceStrictIsolation,
        aiServiceUrl,
        ragSimilarityThreshold,
        socraticMaxTurns,
        emailDriver,
        senderEmail,
      });
      setSavedNotification(true);
      setTimeout(() => {
        setSavedNotification(false);
      }, 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setUniversityName('CHARUSAT');
    setUniversityFullName('Charotar University of Science and Technology');
    setEmailDomain('charusat.edu.in');
    setPortalTitle('CLIAS — Learning Intelligence & Assessment System');
    setJwtExpiry('7d');
    setOtpExpiryMinutes(5);
    setMaxLoginAttempts(5);
    setEnforceStrictIsolation(true);
    setAiServiceUrl('http://localhost:8000');
    setRagSimilarityThreshold(0.75);
    setSocraticMaxTurns(10);
    setEmailDriver('development');
    setSenderEmail('no-reply@charusat.edu.in');

    try {
      await api.patch('/admin/settings', {
        universityName: 'CHARUSAT',
        universityFullName: 'Charotar University of Science and Technology',
        emailDomain: 'charusat.edu.in',
        portalTitle: 'CLIAS — Learning Intelligence & Assessment System',
        jwtExpiry: '7d',
        otpExpiryMinutes: 5,
        maxLoginAttempts: 5,
        enforceStrictIsolation: true,
        aiServiceUrl: 'http://localhost:8000',
        ragSimilarityThreshold: 0.75,
        socraticMaxTurns: 10,
        emailDriver: 'development',
        senderEmail: 'no-reply@charusat.edu.in',
      });
      setSavedNotification(true);
      setTimeout(() => setSavedNotification(false), 3000);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="System Settings & Institutional Governance Console"
          subtitle="Identity, Security Keys, AI Engine Endpoints & Notification Dispatch Configuration"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-200">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  System Settings &amp; Configuration
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Global Policy Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure institutional identity parameters, authentication security lifecycles, and microservice integration endpoints.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
              <button
                form="settings-form"
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </button>
            </div>
          </div>

          {savedNotification && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>System configuration successfully validated and updated across the active cluster.</span>
            </div>
          )}

          <form id="settings-form" onSubmit={handleSaveSettings} className="space-y-6">
            {/* Section 1: Institutional Identity */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Institutional Identity &amp; Domain</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Controls email validation domains and university branding</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    University Brand Short Name
                  </label>
                  <input
                    type="text"
                    required
                    value={universityName}
                    onChange={(e) => setUniversityName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    University Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={universityFullName}
                    onChange={(e) => setUniversityFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Authorized Institutional Email Domain
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                    <input
                      type="text"
                      required
                      value={emailDomain}
                      onChange={(e) => setEmailDomain(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Student and faculty registration is restricted to this domain.</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Portal Window Title
                  </label>
                  <input
                    type="text"
                    required
                    value={portalTitle}
                    onChange={(e) => setPortalTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Security & Authentication */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Security &amp; Access Governance</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">JWT token durations, OTP verification limits, and strict role isolation</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    JWT Session Token Lifespan
                  </label>
                  <select
                    value={jwtExpiry}
                    onChange={(e) => setJwtExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="1d">1 Day</option>
                    <option value="7d">7 Days (Default)</option>
                    <option value="14d">14 Days</option>
                    <option value="30d">30 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    OTP Code Validity (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={otpExpiryMinutes}
                    onChange={(e) => setOtpExpiryMinutes(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Max Consecutive Login Attempts
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={10}
                    value={maxLoginAttempts}
                    onChange={(e) => setMaxLoginAttempts(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enforceStrictIsolation}
                    onChange={(e) => setEnforceStrictIsolation(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Enforce Strict Role Isolation Matrix (Rule 5 &amp; 23)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Guarantees counsellors view only assigned mentees, faculty access only designated courses, and unassigned records are strictly quarantined.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Section 3: AI Intelligence Engine & RAG */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Cpu className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">AI Microservice &amp; Semantic RAG Settings</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Endpoints and hyperparameters for Socratic tutoring and grounded quiz generation</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    AI Microservice URL
                  </label>
                  <input
                    type="text"
                    required
                    value={aiServiceUrl}
                    onChange={(e) => setAiServiceUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    RAG Cosine Similarity Threshold
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="0.95"
                    value={ragSimilarityThreshold}
                    onChange={(e) => setRagSimilarityThreshold(parseFloat(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Max Socratic Chat Dialogue Turns
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={25}
                    value={socraticMaxTurns}
                    onChange={(e) => setSocraticMaxTurns(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Email Relay */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Email &amp; Notification Relay</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Driver configuration for OTP delivery and proctoring violation alerts</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Service Driver
                  </label>
                  <select
                    value={emailDriver}
                    onChange={(e) => setEmailDriver(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="development">Development Mock (Console Logged)</option>
                    <option value="smtp">Production SMTP Relay</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sender "From" Address
                  </label>
                  <input
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
