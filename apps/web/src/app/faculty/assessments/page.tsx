'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  FileText,
  Plus,
  Clock,
  Award,
  Users,
  CheckCircle,
  TrendingUp,
  X,
  Loader2,
  Check,
  Search,
} from 'lucide-react';

export default function FacultyAssessmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // New assessment form state
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState('QUIZ');
  const [newDuration, setNewDuration] = useState(30);
  const [newTotalMarks, setNewTotalMarks] = useState(100);
  const [newPassingMarks, setNewPassingMarks] = useState(40);
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      loadInitialData();
    }
  }, [user, authLoading]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const courseList = await api.get('/courses');
      setCourses(courseList);
      if (courseList.length > 0) {
        setSelectedCourseId(courseList[0].id);
        await loadCourseAssessments(courseList[0].id);
      }
    } catch (err) {
      console.error('Failed to load courses', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseAssessments = async (courseId: string) => {
    try {
      const data = await api.get(`/assessments/student?courseId=${courseId}`);
      setAssessments(data);
    } catch (err) {
      console.error('Failed to load assessments', err);
    }
  };

  const openCreateModal = async () => {
    setIsModalOpen(true);
    try {
      const questions = await api.get(`/practice/sessions/questions?courseId=${selectedCourseId}`);
      setAvailableQuestions(questions || []);
      // Default auto-select first 5 questions if available
      if (questions && questions.length > 0) {
        setSelectedQuestionIds(questions.slice(0, 5).map((q: any) => q.id));
      }
    } catch (err) {
      console.error('Failed to load question bank', err);
    }
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id],
    );
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestionIds.length === 0) {
      alert('Please select at least one question for the test.');
      return;
    }

    setCreating(true);
    try {
      await api.post('/assessments', {
        title: newTitle,
        code: newCode || `ASM-${Date.now().toString().slice(-4)}`,
        courseId: selectedCourseId,
        type: newType,
        durationMinutes: Number(newDuration),
        totalMarks: Number(newTotalMarks),
        passingMarks: Number(newPassingMarks),
        questionIds: selectedQuestionIds,
      });

      setIsModalOpen(false);
      await loadCourseAssessments(selectedCourseId);
    } catch (err: any) {
      alert(err.message || 'Failed to create assessment');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Assessment & Examination Studio"
          subtitle="Author formal quizzes, scheduled mid-terms, and evaluate class performance"
        />

        <main className="p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Header Action Bar */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Department Assessment Authoring
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure timed assessments, select curriculum questions, and review cohort submissions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  loadCourseAssessments(e.target.value);
                }}
                className="p-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Assessment</span>
              </button>
            </div>
          </div>

          {/* Assessment Cards */}
          {loading ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-400">
              Loading assessments...
            </div>
          ) : assessments.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No Assessments Created</p>
              <p className="text-xs text-slate-400 mt-1">Click Create Assessment to launch your first exam.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assessments.map((a) => (
                <div
                  key={a.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {a.type} • {a.code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {a.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
                    {a.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Duration</span>
                      <strong className="text-slate-800">{a.durationMinutes}m</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Total Marks</span>
                      <strong className="text-slate-800">{a.totalMarks} pts</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Questions</span>
                      <strong className="text-slate-800">{a.totalQuestions} items</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Create Assessment Wizard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create New Course Assessment</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assessment Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Trees & BST Mastery Exam"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assessment Code</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. CS301-QUIZ-02"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="QUIZ">Quiz</option>
                    <option value="UNIT_TEST">Unit Test</option>
                    <option value="MID_TERM">Mid-Term</option>
                    <option value="FINAL_EXAM">Final Exam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Passing %</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={newPassingMarks}
                    onChange={(e) => setNewPassingMarks(Number(e.target.value))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              {/* Question selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Questions from Course Question Bank ({selectedQuestionIds.length} Selected)
                </label>
                <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {availableQuestions.map((q) => {
                    const isSelected = selectedQuestionIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestionSelection(q.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex-1 pr-3">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                            {q.topic?.name || 'DSA'} • {q.difficulty}
                          </span>
                          <span className="line-clamp-2 leading-snug">{q.questionText}</span>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Publish Assessment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
