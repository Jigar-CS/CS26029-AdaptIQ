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
  const [newDivision, setNewDivision] = useState<'ALL' | 'DIV 1' | 'DIV 2'>('ALL');
  const [newDuration, setNewDuration] = useState(30);
  const [newTotalMarks, setNewTotalMarks] = useState(100);
  const [newPassingMarks, setNewPassingMarks] = useState(40);
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [filterTopic, setFilterTopic] = useState('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');
  const [questionSearch, setQuestionSearch] = useState('');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

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
      
      // If faculty user has an assigned course, lock to it
      const facultyCourseId = user?.courseId || user?.assignedCourse?.id;
      const targetCourseId = facultyCourseId && courseList.some((c: any) => c.id === facultyCourseId)
        ? facultyCourseId
        : (courseList.length > 0 ? courseList[0].id : '');

      if (targetCourseId) {
        setSelectedCourseId(targetCourseId);
        await loadCourseAssessments(targetCourseId);
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
    setQuestionsLoading(true);
    setFilterTopic('ALL');
    setFilterDifficulty('ALL');
    setQuestionSearch('');
    try {
      // Fetch approved questions directly for the selected course
      const questions = await api.get(`/courses/${selectedCourseId}/questions`);
      setAvailableQuestions(questions || []);
      // Auto-select first 5 questions if none selected yet
      if (questions && questions.length > 0 && selectedQuestionIds.length === 0) {
        setSelectedQuestionIds(questions.slice(0, 5).map((q: any) => q.id));
      }
    } catch (err) {
      console.error('Failed to load question bank', err);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id],
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredQuestions.map((q) => q.id);
    setSelectedQuestionIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const deselectAllFiltered = () => {
    const filteredIdsSet = new Set(filteredQuestions.map((q) => q.id));
    setSelectedQuestionIds((prev) => prev.filter((id) => !filteredIdsSet.has(id)));
  };

  const uniqueTopics = Array.from(
    new Set(availableQuestions.map((q) => q.topic?.name).filter(Boolean))
  ).sort() as string[];

  const filteredQuestions = availableQuestions.filter((q) => {
    const matchTopic = filterTopic === 'ALL' || q.topic?.name === filterTopic;
    const matchDiff = filterDifficulty === 'ALL' || q.difficulty === filterDifficulty;
    const matchSearch =
      !questionSearch.trim() ||
      q.questionText.toLowerCase().includes(questionSearch.toLowerCase()) ||
      (q.topic?.name && q.topic.name.toLowerCase().includes(questionSearch.toLowerCase()));
    return matchTopic && matchDiff && matchSearch;
  });

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestionIds.length === 0) {
      alert('Please select at least one question from the question bank for the assessment.');
      return;
    }

    setCreating(true);
    try {
      await api.post('/assessments', {
        title: newTitle,
        code: newCode || `ASM-${Date.now().toString().slice(-4)}`,
        courseId: selectedCourseId,
        type: newType,
        division: newDivision,
        durationMinutes: Number(newDuration),
        totalMarks: Number(newTotalMarks),
        passingMarks: Number(newPassingMarks),
        questionIds: selectedQuestionIds,
      });

      setIsModalOpen(false);
      setNewTitle('');
      setNewCode('');
      await loadCourseAssessments(selectedCourseId);
    } catch (err: any) {
      alert(err.message || 'Failed to create assessment');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Assessment & Examination Studio"
          subtitle="Author formal quizzes, scheduled mid-terms, and evaluate class performance"
        />

        <main className="p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Header Action Bar */}
          <div className="bg-[#111827] rounded-2xl p-6 border border-slate-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Department Assessment Authoring
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure timed assessments, select curriculum questions, and allocate to specific divisions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {user?.courseId ? (
                <div className="px-3.5 py-2 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-emerald-200 text-xs font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>
                    Subject: {user.courseCode || courses.find((c) => c.id === selectedCourseId)?.code} - {user.courseName || courses.find((c) => c.id === selectedCourseId)?.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 ml-1">Fixed</span>
                </div>
              ) : (
                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    setSelectedCourseId(e.target.value);
                    loadCourseAssessments(e.target.value);
                  }}
                  className="p-2.5 text-xs font-semibold bg-[#1E293B] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Assessment</span>
              </button>
            </div>
          </div>

          {/* Assessment Cards */}
          {loading ? (
            <div className="p-16 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Loading assessments...</span>
            </div>
          ) : assessments.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#111827] p-12 text-center text-slate-400">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-base font-bold text-white">No Assessments Created</p>
              <p className="text-xs text-slate-400 mt-1">Click Create Assessment to launch your first exam.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assessments.map((a) => (
                <div
                  key={a.id}
                  className="bg-[#111827] rounded-2xl border border-slate-800 p-6 shadow-md hover:border-slate-700 transition space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {a.type} • {a.code}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          a.division === 'DIV 1'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : a.division === 'DIV 2'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {a.division === 'DIV 1'
                          ? 'Division A (DIV 1)'
                          : a.division === 'DIV 2'
                          ? 'Division B (DIV 2)'
                          : 'Both Divisions (All)'}
                      </span>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {a.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white leading-snug">{a.title}</h3>
                    {a.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{a.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs bg-[#1E293B] p-3 rounded-xl border border-slate-700/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Duration</span>
                      <strong className="text-white font-bold">{a.durationMinutes}m</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Total Marks</span>
                      <strong className="text-white font-bold">{a.totalMarks} pts</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Questions</span>
                      <strong className="text-white font-bold">{a.totalQuestions} items</strong>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/80 bg-[#1E293B]/80">
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight">Create New Course Assessment</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Allocate to target student division and select approved questions from question bank
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/80 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="p-6 overflow-y-auto space-y-5">
              {/* Assigned Course Header */}
              <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                    Assigned Teaching Subject
                  </span>
                  <span className="font-extrabold text-white text-sm">
                    {courses.find((c) => c.id === selectedCourseId)?.code} - {courses.find((c) => c.id === selectedCourseId)?.name}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Fixed For Faculty
                </span>
              </div>

              {/* Title & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Assessment Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Trees & BST Mastery Exam"
                    className="w-full p-3 text-xs bg-[#1E293B] border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Assessment Code</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. CS301-QUIZ-02"
                    className="w-full p-3 text-xs bg-[#1E293B] border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>
              </div>

              {/* Target Division Allocation */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-200">
                    <Users className="w-4 h-4 text-indigo-400" />
                    Target Student Allocation (Division)
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Reflected directly in assigned students' portals
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Division A */}
                  <button
                    type="button"
                    onClick={() => setNewDivision('DIV 1')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      newDivision === 'DIV 1'
                        ? 'bg-amber-950/60 border-2 border-amber-400 ring-2 ring-amber-500/30 text-white shadow-lg shadow-amber-950/50'
                        : 'bg-[#1E293B] border border-slate-700 hover:border-slate-500 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">Division A</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-400 text-amber-950">
                        DIV 1
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium leading-snug">
                      Roll 24CS001 – 24CS065
                    </p>
                  </button>

                  {/* Division B */}
                  <button
                    type="button"
                    onClick={() => setNewDivision('DIV 2')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      newDivision === 'DIV 2'
                        ? 'bg-purple-950/60 border-2 border-purple-400 ring-2 ring-purple-500/30 text-white shadow-lg shadow-purple-950/50'
                        : 'bg-[#1E293B] border border-slate-700 hover:border-slate-500 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">Division B</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-400 text-purple-950">
                        DIV 2
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium leading-snug">
                      Roll 24CS066 & above
                    </p>
                  </button>

                  {/* Both Divisions */}
                  <button
                    type="button"
                    onClick={() => setNewDivision('ALL')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      newDivision === 'ALL'
                        ? 'bg-indigo-950/60 border-2 border-indigo-400 ring-2 ring-indigo-500/30 text-white shadow-lg shadow-indigo-950/50'
                        : 'bg-[#1E293B] border border-slate-700 hover:border-slate-500 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">Both Divisions</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-400 text-indigo-950">
                        ALL
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium leading-snug">
                      All enrolled students
                    </p>
                  </button>
                </div>
              </div>

              {/* Assessment Type, Duration, Passing */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full p-3 text-xs bg-[#1E293B] border border-slate-600 rounded-xl text-white font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="QUIZ">Quiz</option>
                    <option value="UNIT_TEST">Unit Test</option>
                    <option value="MID_TERM">Mid-Term</option>
                    <option value="FINAL_EXAM">Final Exam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Duration (Min)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full p-3 text-xs bg-[#1E293B] border border-slate-600 rounded-xl text-white font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Passing %</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={newPassingMarks}
                    onChange={(e) => setNewPassingMarks(Number(e.target.value))}
                    className="w-full p-3 text-xs bg-[#1E293B] border border-slate-600 rounded-xl text-white font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Question Bank Selector with Topic Filtering */}
              <div className="space-y-3 pt-3 border-t border-slate-700/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-sm font-bold text-white">
                      Select Questions from Course Question Bank
                    </label>
                    <span className="text-xs text-slate-400">
                      Approved faculty questions for {courses.find((c) => c.id === selectedCourseId)?.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                      {selectedQuestionIds.length} Selected
                    </span>
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="px-3 py-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/50 rounded-lg transition"
                    >
                      Select All Filtered
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllFiltered}
                      className="px-3 py-1 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    >
                      Deselect
                    </button>
                  </div>
                </div>

                {/* Filters Row: Topic, Search, Difficulty */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-[#1E293B]/80 p-3 rounded-2xl border border-slate-700">
                  {/* Topic Filter */}
                  <div className="sm:col-span-5">
                    <select
                      value={filterTopic}
                      onChange={(e) => setFilterTopic(e.target.value)}
                      className="w-full p-2.5 text-xs bg-[#0F172A] border border-slate-600 rounded-xl text-white font-semibold focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">All Topics ({availableQuestions.length})</option>
                      {uniqueTopics.map((top) => {
                        const count = availableQuestions.filter((q) => q.topic?.name === top).length;
                        return (
                          <option key={top} value={top}>
                            {top} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Search Bar */}
                  <div className="sm:col-span-4 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      placeholder="Search questions..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#0F172A] border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Difficulty Filter */}
                  <div className="sm:col-span-3">
                    <select
                      value={filterDifficulty}
                      onChange={(e) => setFilterDifficulty(e.target.value)}
                      className="w-full p-2.5 text-xs bg-[#0F172A] border border-slate-600 rounded-xl text-white font-semibold focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">All Levels</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Question List */}
                <div className="max-h-72 overflow-y-auto space-y-2.5 border border-slate-700 rounded-2xl p-3 bg-[#0F172A]/80">
                  {questionsLoading ? (
                    <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                      <span>Loading approved questions...</span>
                    </div>
                  ) : filteredQuestions.length === 0 ? (
                    <div className="p-10 text-center text-xs text-slate-400">
                      No questions found matching the selected topic or search criteria.
                    </div>
                  ) : (
                    filteredQuestions.map((q) => {
                      const isSelected = selectedQuestionIds.includes(q.id);
                      const isExpanded = expandedQuestionId === q.id;

                      return (
                        <div
                          key={q.id}
                          className={`rounded-2xl border transition-all overflow-hidden ${
                            isSelected
                              ? 'bg-[#1E293B] border-2 border-indigo-500 shadow-md shadow-indigo-500/10'
                              : 'bg-[#1E293B]/60 border border-slate-700/80 hover:border-slate-600'
                          }`}
                        >
                          <div
                            onClick={() => toggleQuestionSelection(q.id)}
                            className="p-3.5 cursor-pointer flex items-start justify-between gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-indigo-500/30">
                                  {q.topic?.name || 'General'}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                                    q.difficulty === 'EASY'
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : q.difficulty === 'HARD'
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  }`}
                                >
                                  {q.difficulty}
                                </span>
                                {q.sourceType && (
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    {q.sourceType}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-white leading-relaxed font-semibold">
                                {q.questionText}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 pt-0.5">
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition ${
                                  isSelected
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                    : 'border-slate-500 bg-transparent hover:border-indigo-400'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>
                          </div>

                          {/* Options Preview Bar */}
                          {q.options && q.options.length > 0 && (
                            <div className="px-3.5 pb-3 pt-1 border-t border-slate-700/60 bg-[#0F172A]/60">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedQuestionId(isExpanded ? null : q.id);
                                }}
                                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
                              >
                                {isExpanded ? 'Hide Options ▲' : `Preview ${q.options.length} Options ▼`}
                              </button>

                              {isExpanded && (
                                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  {q.options.map((opt: any, idx: number) => (
                                    <div
                                      key={opt.id || idx}
                                      className={`p-2 rounded-xl border text-left ${
                                        opt.isCorrect
                                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200 font-bold'
                                          : 'bg-[#1E293B] border-slate-700 text-slate-300'
                                      }`}
                                    >
                                      <span className="font-mono text-indigo-400 font-bold mr-2">
                                        {String.fromCharCode(65 + idx)}.
                                      </span>
                                      <span>{opt.optionText}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-300">
                  Target: <strong className="text-white font-bold">{newDivision === 'DIV 1' ? 'Division A (24CS001-24CS065)' : newDivision === 'DIV 2' ? 'Division B (24CS066+)' : 'Both Divisions (All)'}</strong> • <strong className="text-indigo-400 font-bold">{selectedQuestionIds.length} Questions</strong>
                </span>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || selectedQuestionIds.length === 0}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Publish Assessment</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

