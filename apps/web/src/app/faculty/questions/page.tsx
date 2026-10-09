'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import { UserRole } from '@clias/shared-types';
import {
  BookOpen,
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  BrainCircuit,
  FileCheck,
  Printer,
  Download,
  RotateCcw,
  GraduationCap,
  ChevronDown,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

interface QuestionItem {
  id: string;
  questionText: string;
  topic: string;
  courseCode: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  bloomLevel: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE';
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    misconception?: string;
  }[];
  explanation: string;
  discrimination: number;
  difficultyParam: number;
}

interface CourseOption {
  id: string;
  code: string;
  name: string;
  topics?: { id: string; name: string }[];
  _count?: { questions: number };
}

export default function FacultyQuestionBankPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [currentCourse, setCurrentCourse] = useState<CourseOption | null>(null);

  const [allQuestions, setAllQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchTerm, setSearchTerm] = useState('');
  // Pending filter selection
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');
  // Applied filter - strictly controls what is visible on screen
  const [appliedTopic, setAppliedTopic] = useState<string>('ALL');

  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [bloomFilter, setBloomFilter] = useState('ALL');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== UserRole.FACULTY && user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.HOD))) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadCourses();
    }
  }, [user, authLoading]);

  // Load available courses
  const loadCourses = async () => {
    try {
      setLoading(true);
      const coursesRes: any = await api.get('/courses');
      if (Array.isArray(coursesRes) && coursesRes.length > 0) {
        setCourses(coursesRes);

        // Determine default course: assigned course if available, or first course
        const assignedId = user?.courseId || (user as any)?.assignedCourse?.id;
        const initialCourse = (assignedId && coursesRes.find((c: any) => c.id === assignedId)) || coursesRes[0];

        setSelectedCourseId(initialCourse.id);
        setCurrentCourse(initialCourse);
        await loadQuestionsForCourse(initialCourse.id, initialCourse.code);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
      setLoading(false);
    }
  };

  // Load real-time dynamic questions for a specific course
  const loadQuestionsForCourse = async (courseId: string, courseCode: string) => {
    setLoading(true);
    try {
      const qList: any = await api.get(`/courses/${courseId}/questions`);
      if (Array.isArray(qList)) {
        const mapped: QuestionItem[] = qList.map((q: any) => ({
          id: q.id,
          questionText: q.questionText,
          topic: q.topic?.name || 'General Curriculum',
          courseCode: courseCode,
          difficulty: (q.difficulty as any) || 'MEDIUM',
          bloomLevel: q.bloomLevel || 'APPLY',
          options: (q.options || []).map((opt: any) => ({
            id: opt.id,
            text: opt.optionText,
            isCorrect: opt.isCorrect,
            misconception: opt.misconception?.title,
          })),
          explanation: q.explanation || 'Curriculum aligned pedagogical explanation.',
          discrimination: q.discrimination || 1.45,
          difficultyParam:
            q.difficultyParam ||
            (q.difficulty === 'EASY' ? -0.45 : q.difficulty === 'HARD' ? 1.15 : 0.12),
        }));
        setAllQuestions(mapped);
      } else {
        setAllQuestions([]);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
      setAllQuestions([]);
    } finally {
      // Reset filter states for new course
      setSelectedTopic('ALL');
      setAppliedTopic('ALL');
      setLoading(false);
    }
  };

  const handleCourseChange = async (courseId: string) => {
    setSelectedCourseId(courseId);
    const target = courses.find((c) => c.id === courseId) || null;
    setCurrentCourse(target);
    if (target) {
      await loadQuestionsForCourse(target.id, target.code);
    }
  };

  // Extract unique topics dynamically from current loaded questions
  const uniqueTopics = Array.from(new Set(allQuestions.map((q) => q.topic).filter(Boolean)));

  // "Apply Filter" action
  const handleApplyFilter = () => {
    setAppliedTopic(selectedTopic);
  };

  // Reset filter back to all
  const handleResetFilter = () => {
    setSelectedTopic('ALL');
    setAppliedTopic('ALL');
  };

  // Filtered questions: strictly respects appliedTopic so non-matching topic questions are NOT displayed on screen
  const visibleQuestions = allQuestions.filter((q) => {
    // If a topic filter is applied, only show questions from that topic
    if (appliedTopic !== 'ALL' && q.topic !== appliedTopic) {
      return false;
    }

    const matchesSearch =
      searchTerm === '' ||
      q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.explanation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDiff = difficultyFilter === 'ALL' || q.difficulty === difficultyFilter;
    const matchesBloom = bloomFilter === 'ALL' || q.bloomLevel === bloomFilter;

    return matchesSearch && matchesDiff && matchesBloom;
  });

  // Export filtered topic questions as PDF
  const handleExportPdf = () => {
    window.print();
  };

  const avgDiscrimination =
    allQuestions.length > 0
      ? (allQuestions.reduce((acc, q) => acc + (q.discrimination || 0), 0) / allQuestions.length).toFixed(2)
      : '0.00';
  const bloomLevelsCount = new Set(allQuestions.map((q) => q.bloomLevel).filter(Boolean)).size;

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'EASY':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
      case 'MEDIUM':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
      default:
        return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
    }
  };

  const getBloomBadge = (b: string) => {
    return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <div className="print:hidden">
          <Navbar
            title="Institutional Question Bank & Item Repository"
            subtitle="Curriculum-aligned item bank with dynamic real-time data, topic filtering & PDF export"
          />
        </div>

        <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Printable Header - Visible only in Print/PDF Mode */}
          <div className="hidden print:block p-4 border-b-2 border-slate-900 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  AdaptIQ Academic Assessment Repository
                </h1>
                <p className="text-sm font-semibold text-slate-700">
                  Course: {currentCourse?.code} - {currentCourse?.name}
                </p>
                <p className="text-sm font-bold text-indigo-700 mt-1">
                  Topic: {appliedTopic === 'ALL' ? 'Complete Course Repository' : appliedTopic}
                </p>
              </div>
              <div className="text-right text-xs text-slate-600 space-y-1">
                <div>Export Date: {new Date().toLocaleDateString()}</div>
                <div>Total Questions: {visibleQuestions.length}</div>
                <div>Authorized Faculty: {user?.name || user?.email}</div>
              </div>
            </div>
          </div>

          {/* Action Header Banner */}
          <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Item Bank Repository
                </h2>
                {/* Course Switcher */}
                <select
                  value={selectedCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 focus:outline-none cursor-pointer"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Explore real-time calibrated questions, filter topic-wise with dedicated export view, and export topic questions directly as PDF.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/faculty/ai-generator"
                prefetch={false}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Sparkles className="w-4 h-4 text-blue-200" />
                <span>AI Question Studio</span>
              </Link>
            </div>
          </div>

          {/* Metric Overview (Dynamic from Database) */}
          <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Calibrated Questions"
              value={allQuestions.length}
              subtitle={`Across ${uniqueTopics.length || 0} Dynamic Topics`}
              icon={BookOpen}
              color="indigo"
            />
            <MetricCard
              title="Item Discrimination"
              value={`${avgDiscrimination} Avg`}
              subtitle="Psychometric IRT 3PL"
              icon={BrainCircuit}
              color="emerald"
            />
            <MetricCard
              title="Bloom Alignment"
              value={`${bloomLevelsCount} Levels`}
              subtitle="Cognitive Taxonomy"
              icon={Layers}
              color="purple"
            />
            <MetricCard
              title="Active Subject"
              value={currentCourse?.code || 'CS301'}
              subtitle={currentCourse?.name || 'Data Structures'}
              icon={FileCheck}
              color="blue"
            />
          </div>

          {/* Search, Topic Filter & PDF Export Bar */}
          <div className="print:hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Text Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search questions by concept, statement, explanation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-blue-600 transition"
                />
              </div>

              {/* Topic Filter Selection */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Topic:</span>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none py-1 cursor-pointer max-w-[180px] truncate"
                  >
                    <option value="ALL">All Topics ({allQuestions.length})</option>
                    {uniqueTopics.map((t) => {
                      const count = allQuestions.filter((q) => q.topic === t).length;
                      return (
                        <option key={t} value={t}>
                          {t} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Apply Filter Button */}
                <button
                  onClick={handleApplyFilter}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition"
                  title="Apply topic filter so only that topic questions are shown"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Apply Filter
                </button>

                {/* Reset Filter Button (if filtered) */}
                {appliedTopic !== 'ALL' && (
                  <button
                    onClick={handleResetFilter}
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}

                {/* Difficulty Filter */}
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl focus:outline-none font-semibold"
                >
                  <option value="ALL">All Difficulties</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>

                {/* Bloom Filter */}
                <select
                  value={bloomFilter}
                  onChange={(e) => setBloomFilter(e.target.value)}
                  className="px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl focus:outline-none font-semibold"
                >
                  <option value="ALL">All Bloom Levels</option>
                  <option value="REMEMBER">Remember</option>
                  <option value="UNDERSTAND">Understand</option>
                  <option value="APPLY">Apply</option>
                  <option value="ANALYZE">Analyze</option>
                  <option value="EVALUATE">Evaluate</option>
                </select>

                {/* Export Topic Questions as PDF Button */}
                <button
                  onClick={handleExportPdf}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition"
                  title="Export currently filtered topic questions as PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Export Topic as PDF</span>
                </button>
              </div>
            </div>

            {/* Active Topic Filter Notification Banner */}
            {appliedTopic !== 'ALL' && (
              <div className="flex items-center justify-between bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl px-3.5 py-2 text-xs text-blue-900 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold">Active Topic Filter:</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-semibold">
                    {appliedTopic}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    — Displaying strictly {visibleQuestions.length} questions for this topic (other questions hidden).
                  </span>
                </div>
                <button
                  onClick={handleResetFilter}
                  className="text-xs font-bold text-blue-700 dark:text-blue-300 underline hover:no-underline"
                >
                  Show All Topics
                </button>
              </div>
            )}
          </div>

          {/* Questions Container */}
          <div ref={printRef} className="space-y-4">
            <div className="print:hidden flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>
                Showing <strong>{visibleQuestions.length}</strong> of {allQuestions.length} calibrated questions
                {appliedTopic !== 'ALL' && ` in topic "${appliedTopic}"`}
              </span>
              {appliedTopic !== 'ALL' && (
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  Ready for PDF Export ({visibleQuestions.length} items)
                </span>
              )}
            </div>

            {loading ? (
              <div className="p-16 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <span className="text-sm font-medium">Loading real-time question bank data...</span>
              </div>
            ) : visibleQuestions.length === 0 ? (
              <div className="p-16 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <BookOpen className="w-10 h-10 mx-auto text-slate-400" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No Questions Found Matching Filter
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {appliedTopic !== 'ALL'
                    ? `No questions currently registered under topic "${appliedTopic}". Try resetting the topic filter or generating new questions.`
                    : 'No questions matching search parameters. Adjust filters or select a different subject.'}
                </p>
                {appliedTopic !== 'ALL' && (
                  <button
                    onClick={handleResetFilter}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            ) : (
              visibleQuestions.map((q, idx) => {
                const isExpanded = expandedQuestionId === q.id || idx === 0;
                return (
                  <div
                    key={q.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition print:border-b-2 print:border-slate-300 print:shadow-none print:break-inside-avoid print:p-4"
                  >
                    {/* Top Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          Q{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                          {q.topic}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${getDifficultyBadge(
                            q.difficulty,
                          )}`}
                        >
                          {q.difficulty}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${getBloomBadge(
                            q.bloomLevel,
                          )}`}
                        >
                          {q.bloomLevel}
                        </span>
                      </div>

                      <div className="print:hidden flex items-center gap-3 text-xs text-slate-500 font-mono">
                        <span>Discrimination a = {q.discrimination}</span>
                        <span>Difficulty b = {q.difficultyParam}</span>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                      {q.questionText}
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl border text-xs transition ${
                            opt.isCorrect
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200 font-medium'
                              : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                                opt.isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <div className="space-y-1">
                              <span>{opt.text}</span>
                              {opt.misconception && (
                                <p className="print:hidden text-[10px] text-rose-600 dark:text-rose-400 font-normal">
                                  Distractor trap: {opt.misconception}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Explanation Toggle */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 italic">
                        {currentCourse?.code || 'CS301'} — {q.topic}
                      </span>
                      <button
                        onClick={() =>
                          setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id)
                        }
                        className="print:hidden text-blue-600 dark:text-blue-400 font-bold hover:underline"
                      >
                        {expandedQuestionId === q.id ? 'Hide Explanation' : 'View Pedagogical Explanation'}
                      </button>
                    </div>

                    {/* Always visible in print mode, toggleable on web */}
                    <div
                      className={`${
                        expandedQuestionId === q.id ? 'block' : 'hidden print:block'
                      } p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs text-blue-950 dark:text-blue-200 animate-in fade-in duration-150`}
                    >
                      <span className="font-bold">Pedagogical Rationale: </span>
                      {q.explanation}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
