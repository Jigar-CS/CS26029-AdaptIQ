'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSidebar } from '@/lib/sidebar-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  User,
  BookOpen,
  Filter,
  Check,
  X,
  Loader2,
  Archive,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface QuestionOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
  order: number;
}

interface DisputeItem {
  id: string;
  questionId: string;
  studentId: string;
  selectedOptionId: string | null;
  reasonCategory: string;
  studentComment: string;
  status: 'PENDING' | 'APPROVED_STUDENT_CORRECT' | 'REJECTED_AI_CORRECT';
  facultyRemarks: string | null;
  resolvedAt: string | null;
  createdAt: string;
  student: {
    user: { email: string };
    authorizedStudent: { name: string; enrollmentNumber: string };
  };
  question: {
    id: string;
    questionText: string;
    explanation: string;
    difficulty: string;
    sourceType: string;
    course: { code: string; name: string };
    topic: { name: string };
    options: QuestionOption[];
  };
  faculty?: {
    user: { email: string };
  };
}

export default function FacultyDisputesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isPinned } = useSidebar();

  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [activeRemarkInputs, setActiveRemarkInputs] = useState<{ [key: string]: string }>({});
  const [quarantineFlags, setQuarantineFlags] = useState<{ [key: string]: boolean }>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      loadDisputes();
    }
  }, [user, authLoading]);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const data = await api.get('/disputes/faculty-queue');
      setDisputes(data);
    } catch (err) {
      console.error('Failed to load disputes queue', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (
    disputeId: string,
    action: 'APPROVE_STUDENT_CORRECT' | 'REJECT_AI_CORRECT',
  ) => {
    setResolvingId(disputeId);
    try {
      const remarks = activeRemarkInputs[disputeId] || '';
      const quarantineQuestion = !!quarantineFlags[disputeId];

      await api.post(`/disputes/${disputeId}/resolve`, {
        action,
        facultyRemarks: remarks,
        quarantineQuestion,
      });

      // Reload disputes
      await loadDisputes();
    } catch (err) {
      console.error('Failed to resolve dispute', err);
    } finally {
      setResolvingId(null);
    }
  };

  const pendingCount = disputes.filter((d) => d.status === 'PENDING').length;
  const approvedCount = disputes.filter((d) => d.status === 'APPROVED_STUDENT_CORRECT').length;
  const rejectedCount = disputes.filter((d) => d.status === 'REJECTED_AI_CORRECT').length;

  const filteredDisputes = disputes.filter((d) => {
    if (filterStatus === 'ALL') return true;
    return d.status === filterStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans">
      <Sidebar />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPinned ? 'pl-64' : 'pl-[72px]'}`}>
        <Navbar
          title="Question Dispute Moderation"
          subtitle="Human-in-the-loop review of AI & curriculum questions challenged by students"
        />

        <main className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/20 p-6 sm:p-8 shadow-xs dark:shadow-2xl">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 inline-flex items-center gap-1.5 mb-2">
                <ShieldAlert className="w-3.5 h-3.5" />
                Human-in-the-Loop Quality Assurance
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Student Question Disputes & Review
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                When students dispute a question&apos;s answer or AI reasoning, review their claims here. Approving a dispute retroactively adjusts their topic mastery score and notifies them in real time.
              </p>
            </div>
          </div>

          {/* Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Pending Review"
              value={pendingCount}
              subtitle="Requires faculty decision"
              trend={pendingCount > 0 ? { value: 'Needs Action', isPositive: false } : { value: 'All Clear', isPositive: true }}
              color="amber"
              icon={Clock}
            />
            <MetricCard
              title="Disputes Upheld"
              value={approvedCount}
              subtitle="Student answer verified"
              trend={{ value: 'Mastery Credited', isPositive: true }}
              color="emerald"
              icon={CheckCircle2}
            />
            <MetricCard
              title="Disputes Dismissed"
              value={rejectedCount}
              subtitle="AI / Original verified"
              trend={{ value: 'Feedback Delivered', isPositive: true }}
              color="rose"
              icon={XCircle}
            />
            <MetricCard
              title="Total Moderated"
              value={disputes.length}
              subtitle="All historical reports"
              color="indigo"
              icon={BookOpen}
            />
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Status:</span>
              <div className="flex items-center gap-1.5 ml-2">
                {[
                  { key: 'ALL', label: 'All Reports' },
                  { key: 'PENDING', label: `Pending (${pendingCount})` },
                  { key: 'APPROVED_STUDENT_CORRECT', label: `Approved (${approvedCount})` },
                  { key: 'REJECTED_AI_CORRECT', label: `Dismissed (${rejectedCount})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      filterStatus === tab.key
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-slate-500">
              Showing <strong>{filteredDisputes.length}</strong> reports
            </span>
          </div>

          {/* Disputes List */}
          {loading ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
              <p className="text-xs text-slate-500 font-medium">Loading dispute moderation queue...</p>
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No Disputes in Queue</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                There are no question disputes matching this filter. Student submissions will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredDisputes.map((dispute) => {
                const selectedOpt = dispute.question.options.find(
                  (o) => o.id === dispute.selectedOptionId,
                );
                const isResolving = resolvingId === dispute.id;

                return (
                  <div
                    key={dispute.id}
                    className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5"
                  >
                    {/* Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {dispute.student.authorizedStudent.name}
                            <span className="text-xs font-mono font-medium text-slate-500 ml-2">
                              ({dispute.student.authorizedStudent.enrollmentNumber})
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {dispute.question.course.code} • {dispute.question.topic.name} • {new Date(dispute.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {dispute.reasonCategory.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            dispute.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                              : dispute.status === 'APPROVED_STUDENT_CORRECT'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                          }`}
                        >
                          {dispute.status === 'PENDING'
                            ? 'Pending Review'
                            : dispute.status === 'APPROVED_STUDENT_CORRECT'
                            ? 'Approved (Student Upheld)'
                            : 'Dismissed (AI Upheld)'}
                        </span>
                      </div>
                    </div>

                    {/* Split View: Question Context & Student Claim */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Question & Stored AI Answer */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                            Original Question ({dispute.question.difficulty})
                          </span>
                          {dispute.question.sourceType === 'AI_GENERATED' && (
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                              AI Synthesized
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                          {dispute.question.questionText}
                        </p>

                        <div className="space-y-1.5 pt-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Options:
                          </span>
                          {dispute.question.options.map((opt, idx) => (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                                opt.isCorrect
                                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 font-bold'
                                  : opt.id === dispute.selectedOptionId
                                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 font-semibold'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold">
                                  {String.fromCharCode(65 + idx)}.
                                </span>
                                <span>{opt.optionText}</span>
                              </div>
                              {opt.isCorrect && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold">
                                  Marked Correct
                                </span>
                              )}
                              {!opt.isCorrect && opt.id === dispute.selectedOptionId && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold">
                                  Student Picked
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                          <strong className="text-slate-800 dark:text-slate-200 block mb-1">
                            Stored Explanation:
                          </strong>
                          {dispute.question.explanation}
                        </div>
                      </div>

                      {/* Right: Student Rationale & Moderation Decision */}
                      <div className="space-y-4 flex flex-col justify-between">
                        <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 space-y-2">
                          <span className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Student&apos;s Stated Challenge:
                          </span>
                          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed italic bg-white dark:bg-slate-900 p-3 rounded-lg border border-amber-200/60 dark:border-amber-500/20">
                            &ldquo;{dispute.studentComment}&rdquo;
                          </p>
                          {selectedOpt && (
                            <p className="text-[11px] text-amber-800 dark:text-amber-300">
                              Student argued that option: <strong>&ldquo;{selectedOpt.optionText}&rdquo;</strong> should be accepted.
                            </p>
                          )}
                        </div>

                        {/* If Pending: Moderation Form */}
                        {dispute.status === 'PENDING' ? (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Faculty Remarks & Clarification (Delivered to Student):
                            </label>
                            <input
                              type="text"
                              placeholder="e.g., Claim verified. Student calculation is correct."
                              value={activeRemarkInputs[dispute.id] || ''}
                              onChange={(e) =>
                                setActiveRemarkInputs({
                                  ...activeRemarkInputs,
                                  [dispute.id]: e.target.value,
                                })
                              }
                              className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                            />

                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400 pt-1">
                              <input
                                type="checkbox"
                                checked={!!quarantineFlags[dispute.id]}
                                onChange={(e) =>
                                  setQuarantineFlags({
                                    ...quarantineFlags,
                                    [dispute.id]: e.target.checked,
                                  })
                                }
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <Archive className="w-3.5 h-3.5 text-slate-500" />
                              <span>Quarantine & Archive question from future practice sessions</span>
                            </label>

                            <div className="pt-2 flex items-center justify-end gap-3">
                              <button
                                onClick={() => handleResolve(dispute.id, 'REJECT_AI_CORRECT')}
                                disabled={isResolving}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                              >
                                <X className="w-3.5 h-3.5 text-rose-500" />
                                <span>Dismiss Dispute</span>
                              </button>

                              <button
                                onClick={() => handleResolve(dispute.id, 'APPROVE_STUDENT_CORRECT')}
                                disabled={isResolving}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
                              >
                                {isResolving ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Approve (Student Was Right)</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* If Resolved: Verdict Summary */
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                Moderation Verdict:
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Resolved on {dispute.resolvedAt ? new Date(dispute.resolvedAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                              <strong>Faculty Feedback:</strong> {dispute.facultyRemarks || 'No additional remarks provided.'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
