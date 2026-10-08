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
  Download,
  BarChart2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Terminal,
  Code,
  Sparkles,
  Trash2,
  Eye,
  Lock,
  Layers,
  Edit3,
  BookOpen,
  Cpu,
  Play,
  Copy,
} from 'lucide-react';

export default function FacultyAssessmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cohort Analytics & Export State
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [activeAnalytics, setActiveAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');
  const [filterDiv, setFilterDiv] = useState<'ALL' | 'DIV 1' | 'DIV 2'>('ALL');

  // Examination Mode & Coding Problem Engine State
  const [examMode, setExamMode] = useState<'OBJECTIVE' | 'CODING' | 'HYBRID'>('OBJECTIVE');
  const [authoredCodingProblems, setAuthoredCodingProblems] = useState<any[]>([]);
  const [isProblemAuthorModalOpen, setIsProblemAuthorModalOpen] = useState(false);
  const [editingProblemIdx, setEditingProblemIdx] = useState<number | null>(null);

  // Active Coding Problem Authoring Form Fields
  const [cpTitle, setCpTitle] = useState('');
  const [cpDifficulty, setCpDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [cpTags, setCpTags] = useState('Algorithms, Data Structures');
  const [cpDescription, setCpDescription] = useState('');
  const [cpConstraints, setCpConstraints] = useState('• 1 <= input.length <= 10^5\n• Time Limit: 2000ms\n• Memory Limit: 128MB');
  const [cpHints, setCpHints] = useState('Consider optimal time and space asymptotic bounds.');
  const [cpStarterPython, setCpStarterPython] = useState('');
  const [cpStarterJs, setCpStarterJs] = useState('');
  const [cpStarterCpp, setCpStarterCpp] = useState('');
  const [cpStarterJava, setCpStarterJava] = useState('');
  const [cpSampleTestCases, setCpSampleTestCases] = useState<Array<{ id: string; input: string; expectedOutput: string; explanation: string }>>([]);
  const [cpCheckTestCases, setCpCheckTestCases] = useState<Array<{ id: string; input: string; expectedOutput: string; timeLimitMs: number; memoryLimitMb: number; explanation: string }>>([]);
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState(false);
  const [aiPromptTopic, setAiPromptTopic] = useState('');

  // Problem Bank Selector State
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankProblems, setBankProblems] = useState<any[]>([]);
  const [bankLoading, setBankLoading] = useState(false);

  // Problem Inspector Modal State
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [inspectAssessment, setInspectAssessment] = useState<any | null>(null);

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

  const openAnalyticsModal = async (assessmentId: string) => {
    setAnalysisModalOpen(true);
    setAnalyticsLoading(true);
    setSearchStudent('');
    setFilterDiv('ALL');
    try {
      const data = await api.get(`/assessments/${assessmentId}/analytics`);
      setActiveAnalytics(data);
    } catch (err) {
      console.error('Failed to load assessment analytics', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const exportMarksCsv = (analyticsData?: any) => {
    const target = analyticsData || activeAnalytics;
    if (!target || !target.submissions || target.submissions.length === 0) {
      alert('No student submissions found to export.');
      return;
    }

    const headers = [
      'Student Name',
      'Enrollment Number',
      'Email',
      'Division',
      'Assessment Code',
      'Assessment Title',
      'Status',
      'Marks Obtained',
      'Total Marks',
      'Percentage (%)',
      'Outcome',
      'Proctoring Trust Score (%)',
      'Proctoring Status',
      'Integrity Violations',
      'Submitted At',
    ];

    const rows = target.submissions.map((s: any) => [
      `"${s.studentName || 'Student'}"`,
      `"${s.enrollmentNumber || 'N/A'}"`,
      `"${s.email || 'N/A'}"`,
      `"${s.division || target.division || 'DIV 1'}"`,
      `"${target.code}"`,
      `"${target.title}"`,
      `"${s.status}"`,
      s.score,
      s.totalMarks,
      `${s.percentage}%`,
      `"${s.passed ? 'PASSED' : 'RETAKE'}"`,
      `${s.trustScore}%`,
      `"${s.proctoringStatus}"`,
      s.violationsCount,
      `"${new Date(s.submittedAt).toLocaleString()}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${target.code}_Student_Marks_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportDirectCsv = async (assessmentId: string) => {
    try {
      const data = await api.get(`/assessments/${assessmentId}/analytics`);
      exportMarksCsv(data);
    } catch (err) {
      console.error('Failed to export marks CSV', err);
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

  const openAuthorModal = (editIdx?: number) => {
    if (typeof editIdx === 'number' && authoredCodingProblems[editIdx]) {
      const p = authoredCodingProblems[editIdx];
      setEditingProblemIdx(editIdx);
      setCpTitle(p.title);
      setCpDifficulty(p.difficulty);
      setCpTags(p.tags);
      setCpDescription(p.description);
      setCpConstraints(p.constraints);
      setCpHints(Array.isArray(p.hints) ? p.hints.join('\n') : (p.hints || ''));
      setCpStarterPython(p.starterCodes?.PYTHON || '');
      setCpStarterJs(p.starterCodes?.JAVASCRIPT || '');
      setCpStarterCpp(p.starterCodes?.CPP || '');
      setCpStarterJava(p.starterCodes?.JAVA || '');
      setCpSampleTestCases(
        (p.sampleTestCases || []).map((s: any, idx: number) => ({
          id: `sample-${idx}-${Date.now()}`,
          input: s.input,
          expectedOutput: s.expectedOutput,
          explanation: s.explanation || '',
        })),
      );
      setCpCheckTestCases(
        (p.testCasesToCheck || []).map((c: any, idx: number) => ({
          id: `check-${idx}-${Date.now()}`,
          input: c.input,
          expectedOutput: c.expectedOutput,
          timeLimitMs: c.timeLimitMs || 2000,
          memoryLimitMb: c.memoryLimitMb || 128,
          explanation: c.explanation || '',
        })),
      );
    } else {
      setEditingProblemIdx(null);
      setCpTitle('');
      setCpDifficulty('MEDIUM');
      setCpTags('Algorithms, Data Structures');
      setCpDescription('');
      setCpConstraints('• 1 <= input.length <= 10^5\n• Time Limit: 2000ms\n• Memory Limit: 128MB');
      setCpHints('Consider optimal time and space asymptotic bounds.');
      setCpStarterPython('def solution(nums):\n    # Write your algorithmic solution here\n    pass\n');
      setCpStarterJs('function solution(nums) {\n    // Write your algorithmic solution here\n}\n');
      setCpStarterCpp('#include <vector>\n\nint solution(std::vector<int>& nums) {\n    return 0;\n}\n');
      setCpStarterJava('class Solution {\n    public int solution(int[] nums) {\n        return 0;\n    }\n}\n');
      setCpSampleTestCases([
        {
          id: `sample-${Date.now()}-1`,
          input: 'nums = [2, 7, 11, 15], target = 9',
          expectedOutput: '[0, 1]',
          explanation: 'nums[0] + nums[1] == 9, so return [0, 1]',
        },
      ]);
      setCpCheckTestCases([
        {
          id: `check-${Date.now()}-1`,
          input: 'nums = [3, 2, 4], target = 6',
          expectedOutput: '[1, 2]',
          timeLimitMs: 2000,
          memoryLimitMb: 128,
          explanation: 'Hidden evaluation case with non-sorted indices',
        },
        {
          id: `check-${Date.now()}-2`,
          input: 'nums = [3, 3], target = 6',
          expectedOutput: '[0, 1]',
          timeLimitMs: 2000,
          memoryLimitMb: 128,
          explanation: 'Hidden evaluation case with duplicate elements',
        },
      ]);
      setAiPromptTopic('');
    }
    setIsProblemAuthorModalOpen(true);
  };

  const handleAddSampleTestCase = () => {
    setCpSampleTestCases((prev) => [
      ...prev,
      {
        id: `sample-${Date.now()}`,
        input: '',
        expectedOutput: '',
        explanation: '',
      },
    ]);
  };

  const handleRemoveSampleTestCase = (id: string) => {
    setCpSampleTestCases((prev) => prev.filter((tc) => tc.id !== id));
  };

  const handleAddCheckTestCase = () => {
    setCpCheckTestCases((prev) => [
      ...prev,
      {
        id: `check-${Date.now()}`,
        input: '',
        expectedOutput: '',
        timeLimitMs: 2000,
        memoryLimitMb: 128,
        explanation: '',
      },
    ]);
  };

  const handleRemoveCheckTestCase = (id: string) => {
    setCpCheckTestCases((prev) => prev.filter((tc) => tc.id !== id));
  };

  const handleAiGenerateProblem = async () => {
    const topic = aiPromptTopic.trim() || cpTitle.trim() || cpTags.trim() || 'Dynamic Programming';
    setIsGeneratingWithAi(true);
    try {
      const generated = await api.post('/coding/problems/generate-ai', {
        topic,
        difficulty: cpDifficulty,
        customPrompt: aiPromptTopic,
      });

      if (generated) {
        setCpTitle(generated.title || cpTitle);
        setCpDescription(generated.description || cpDescription);
        setCpDifficulty(generated.difficulty || cpDifficulty);
        setCpTags(generated.tags || cpTags);
        if (generated.constraints) setCpConstraints(generated.constraints);
        if (generated.hints) {
          setCpHints(Array.isArray(generated.hints) ? generated.hints.join('\n') : generated.hints);
        }
        if (generated.starterCodes) {
          const sc = typeof generated.starterCodes === 'string'
            ? JSON.parse(generated.starterCodes)
            : generated.starterCodes;
          if (sc.PYTHON) setCpStarterPython(sc.PYTHON);
          if (sc.JAVASCRIPT) setCpStarterJs(sc.JAVASCRIPT);
          if (sc.CPP) setCpStarterCpp(sc.CPP);
          if (sc.JAVA) setCpStarterJava(sc.JAVA);
        }

        if (generated.testCases && generated.testCases.length > 0) {
          const samples = generated.testCases
            .filter((tc: any) => !tc.isHidden)
            .map((tc: any, idx: number) => ({
              id: `sample-${idx}-${Date.now()}`,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              explanation: tc.explanation || `Sample test case ${idx + 1}`,
            }));

          const checks = generated.testCases
            .filter((tc: any) => tc.isHidden)
            .map((tc: any, idx: number) => ({
              id: `check-${idx}-${Date.now()}`,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              timeLimitMs: tc.timeLimitMs || 2000,
              memoryLimitMb: tc.memoryLimitMb || 128,
              explanation: tc.explanation || `Hidden evaluation case ${idx + 1}`,
            }));

          if (samples.length > 0) setCpSampleTestCases(samples);
          if (checks.length > 0) setCpCheckTestCases(checks);
        }
      }
    } catch (err: any) {
      alert(`AI Generation failed: ${err.message}`);
    } finally {
      setIsGeneratingWithAi(false);
    }
  };

  const handleSaveAuthoredProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpTitle.trim()) {
      alert('Please enter a problem title.');
      return;
    }
    if (!cpDescription.trim()) {
      alert('Please enter the full problem statement.');
      return;
    }
    if (cpSampleTestCases.length === 0) {
      alert('Please provide at least one sample testcase visible to students.');
      return;
    }
    if (cpCheckTestCases.length === 0) {
      alert('Please provide at least one hidden check testcase for automated evaluation.');
      return;
    }

    const problemItem = {
      title: cpTitle.trim(),
      difficulty: cpDifficulty,
      tags: cpTags.trim() || 'DSA, Algorithms',
      description: cpDescription.trim(),
      constraints: cpConstraints.trim() || '• Standard time & memory limits apply',
      hints: cpHints.split('\n').filter(Boolean),
      starterCodes: {
        PYTHON: cpStarterPython,
        JAVASCRIPT: cpStarterJs,
        CPP: cpStarterCpp,
        JAVA: cpStarterJava,
      },
      sampleTestCases: cpSampleTestCases.map((stc) => ({
        input: stc.input,
        expectedOutput: stc.expectedOutput,
        explanation: stc.explanation,
      })),
      testCasesToCheck: cpCheckTestCases.map((ctc) => ({
        input: ctc.input,
        expectedOutput: ctc.expectedOutput,
        timeLimitMs: Number(ctc.timeLimitMs) || 2000,
        memoryLimitMb: Number(ctc.memoryLimitMb) || 128,
        explanation: ctc.explanation,
      })),
    };

    if (editingProblemIdx !== null) {
      setAuthoredCodingProblems((prev) => {
        const next = [...prev];
        next[editingProblemIdx] = problemItem;
        return next;
      });
    } else {
      setAuthoredCodingProblems((prev) => [...prev, problemItem]);
    }

    setIsProblemAuthorModalOpen(false);
  };

  const handleRemoveAuthoredProblem = (idx: number) => {
    setAuthoredCodingProblems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleOpenBankModal = async () => {
    setIsBankModalOpen(true);
    setBankLoading(true);
    try {
      const data = await api.get('/coding/problems');
      setBankProblems(data || []);
    } catch (err: any) {
      console.error('Failed to load coding problem bank', err);
    } finally {
      setBankLoading(false);
    }
  };

  const handleImportProblemFromBank = async (prob: any) => {
    try {
      const detailed = await api.get(`/coding/problems/${prob.slug}`);
      if (detailed) {
        let starter = {
          PYTHON: 'def solution(*args):\n    pass\n',
          JAVASCRIPT: 'function solution(...args) {}\n',
          CPP: '#include <vector>\nint solution() {\n    return 0;\n}\n',
          JAVA: 'class Solution {\n    public int solution() {\n        return 0;\n    }\n}\n',
        };
        try {
          if (detailed.starterCodes) {
            starter = typeof detailed.starterCodes === 'string'
              ? JSON.parse(detailed.starterCodes)
              : detailed.starterCodes;
          }
        } catch (_) {}

        let hintsArr = ['Analyze asymptotic complexity bounds.'];
        try {
          if (detailed.hints) {
            hintsArr = typeof detailed.hints === 'string'
              ? JSON.parse(detailed.hints)
              : detailed.hints;
          }
        } catch (_) {}

        const sampleCases = (detailed.testCases || [])
          .filter((tc: any) => !tc.isHidden)
          .map((tc: any) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            explanation: tc.explanation || 'Sample test case',
          }));

        const checkCases = (detailed.testCases || [])
          .filter((tc: any) => tc.isHidden)
          .map((tc: any) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            timeLimitMs: tc.timeLimitMs || 2000,
            memoryLimitMb: tc.memoryLimitMb || 128,
            explanation: tc.explanation || 'Evaluation check case',
          }));

        if (checkCases.length === 0 && sampleCases.length > 0) {
          checkCases.push({
            input: sampleCases[0].input,
            expectedOutput: sampleCases[0].expectedOutput,
            timeLimitMs: 2000,
            memoryLimitMb: 128,
            explanation: 'Evaluation check case',
          });
        }

        const newProblem = {
          title: detailed.title,
          difficulty: detailed.difficulty,
          tags: detailed.tags || 'Algorithms',
          description: detailed.description,
          constraints: detailed.constraints || '• Time Limit: 2000ms\n• Memory Limit: 128MB',
          hints: hintsArr,
          starterCodes: starter,
          sampleTestCases: sampleCases.length > 0 ? sampleCases : [{ input: 'nums = [1, 2]', expectedOutput: '[1, 2]', explanation: 'Sample case' }],
          testCasesToCheck: checkCases.length > 0 ? checkCases : [{ input: 'nums = [100]', expectedOutput: '[100]', timeLimitMs: 2000, memoryLimitMb: 128, explanation: 'Hidden boundary test case' }],
        };

        setAuthoredCodingProblems((prev) => [...prev, newProblem]);
        setIsBankModalOpen(false);
      }
    } catch (err: any) {
      alert(`Failed to import problem: ${err.message}`);
    }
  };

  const handleInspectProblems = (assessment: any) => {
    setInspectAssessment(assessment);
    setIsInspectModalOpen(true);
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (examMode === 'OBJECTIVE' && selectedQuestionIds.length === 0) {
      alert('Please select at least one question from the question bank for the assessment.');
      return;
    }
    if (examMode === 'CODING' && authoredCodingProblems.length === 0) {
      alert('Please author or import at least one coding problem for the coding examination.');
      return;
    }
    if (examMode === 'HYBRID' && selectedQuestionIds.length === 0 && authoredCodingProblems.length === 0) {
      alert('Please add at least one question or coding problem for the hybrid examination.');
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
        examMode,
        questionIds: examMode === 'CODING' ? [] : selectedQuestionIds,
        codingProblems: examMode === 'OBJECTIVE' ? [] : authoredCodingProblems,
      });

      setIsModalOpen(false);
      setNewTitle('');
      setNewCode('');
      setAuthoredCodingProblems([]);
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {a.type} • {a.code}
                      </span>
                      { (a.isCodingExam || a.title?.includes('[CODING]') || a.description?.toLowerCase().includes('coding')) && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                          <Terminal className="w-3 h-3 text-cyan-400" />
                          Coding Exam
                        </span>
                      )}
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
                      <span className="text-[10px] text-slate-400 block font-medium">Items</span>
                      <strong className="text-white font-bold">{a.totalQuestions} items</strong>
                    </div>
                  </div>

                  {/* Assessment Card Action Buttons */}
                  <div className="pt-2 flex items-center gap-2 border-t border-slate-800 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openAnalyticsModal(a.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Cohort Analytics</span>
                    </button>
                    {(a.isCodingExam || a.title?.includes('[CODING]') || a.description?.toLowerCase().includes('coding')) && (
                      <button
                        type="button"
                        onClick={() => handleInspectProblems(a)}
                        className="py-2 px-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition flex items-center gap-1.5"
                        title="Inspect Coding Problems & Test Cases"
                      >
                        <Code className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Problem Spec</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => exportDirectCsv(a.id)}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                      title="Export Student Marks CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Export</span>
                    </button>
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

              {/* Examination Format & Engine Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    Examination Format & Evaluation Engine
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Select automated code judge or objective question bank
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Coding Exam Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setExamMode('CODING');
                      if (!newTitle.includes('Coding') && !newTitle.includes('💻')) {
                        setNewTitle(newTitle ? `${newTitle} (Coding)` : 'Data Structures Practical Coding Exam');
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      examMode === 'CODING'
                        ? 'bg-cyan-950/70 border-2 border-cyan-400 ring-2 ring-cyan-500/30 text-white shadow-lg shadow-cyan-950/50'
                        : 'bg-[#1E293B] border border-slate-700 hover:border-slate-500 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-cyan-400" />
                        Coding Exam
                      </span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-cyan-400 text-cyan-950">
                        JUDGE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium leading-snug">
                      Problem statements, sample test cases & hidden check test cases
                    </p>
                  </button>

                  {/* Objective MCQ Option */}
                  <button
                    type="button"
                    onClick={() => setExamMode('OBJECTIVE')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      examMode === 'OBJECTIVE'
                        ? 'bg-indigo-950/70 border-2 border-indigo-400 ring-2 ring-indigo-500/30 text-white shadow-lg shadow-indigo-950/50'
                        : 'bg-[#1E293B] border border-slate-700 hover:border-slate-500 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        Objective MCQ
                      </span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-400 text-indigo-950">
                        THEORY
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium leading-snug">
                      Select approved questions from curriculum question bank
                    </p>
                  </button>

                  {/* Hybrid Option */}
                  <button
                    type="button"
                    onClick={() => setExamMode('HYBRID')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      examMode === 'HYBRID'
                        ? 'bg-purple-950/70 border-2 border-purple-400 ring-2 ring-purple-500/30 text-white shadow-lg shadow-purple-950/50'
                        : 'bg-[#1E293B] border border-slate-700 hover:border-slate-500 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-purple-400" />
                        Hybrid Exam
                      </span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-400 text-purple-950">
                        MIXED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium leading-snug">
                      Both theoretical questions and practical coding problems
                    </p>
                  </button>
                </div>
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
                    placeholder={examMode === 'CODING' ? 'e.g. DSA In-Browser Practical Examination' : 'e.g. Trees & BST Mastery Exam'}
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
                    placeholder={examMode === 'CODING' ? 'e.g. CS301-CODE-LAB-01' : 'e.g. CS301-QUIZ-02'}
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
                    <option value="QUIZ">Quiz / Lab Quiz</option>
                    <option value="UNIT_TEST">Unit Test</option>
                    <option value="MID_TERM">Mid-Term Practical</option>
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

              {/* SECTION: Coding Problem Authoring & Management (For CODING and HYBRID modes) */}
              {(examMode === 'CODING' || examMode === 'HYBRID') && (
                <div className="space-y-4 pt-4 border-t border-slate-700/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111827] p-4 rounded-2xl border border-cyan-500/40">
                    <div>
                      <div className="flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-cyan-400" />
                        <h4 className="text-sm font-extrabold text-white">Coding Examination Problems & Code Judge</h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          {authoredCodingProblems.length} Added
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Add problem statements, sample test cases (visible to student), and evaluation test cases to check (hidden).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openAuthorModal()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-600/30 transition transform hover:-translate-y-0.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Author Problem</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenBankModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        <span>From Problem Bank</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Authored Coding Problems */}
                  {authoredCodingProblems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center bg-[#0B0F19]/50">
                      <Code className="w-10 h-10 text-cyan-500/50 mx-auto mb-2.5 animate-pulse" />
                      <p className="text-xs font-bold text-white">No Coding Problems Added Yet</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                        Click <strong className="text-cyan-300">Author Problem</strong> to compose a problem statement, sample test cases, and hidden check cases, or select from the pre-seeded DSA bank.
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => openAuthorModal()}
                          className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition"
                        >
                          + Author Problem
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenBankModal}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition"
                        >
                          📚 Browse Problem Bank
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {authoredCodingProblems.map((prob, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl border border-slate-700 bg-[#1E293B]/70 hover:border-slate-600 transition space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="w-5 h-5 rounded-md bg-cyan-600 text-white text-[11px] font-black flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <h5 className="text-xs sm:text-sm font-extrabold text-white">{prob.title}</h5>
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                                    prob.difficulty === 'EASY'
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : prob.difficulty === 'HARD'
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  }`}
                                >
                                  {prob.difficulty}
                                </span>
                                {prob.tags && (
                                  <span className="text-[10px] text-slate-400 font-medium bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                                    {prob.tags}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed pl-7">
                                {prob.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => openAuthorModal(idx)}
                                className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition"
                                title="Edit Problem"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveAuthoredProblem(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                                title="Remove Problem"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Testcase Badges */}
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60 pl-7 text-[11px] flex-wrap">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5">
                              <Eye className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{prob.sampleTestCases?.length || 0} Sample Test Cases (Visible)</span>
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 font-bold flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{prob.testCasesToCheck?.length || 0} Check Test Cases (Hidden Judge)</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: Objective MCQ Question Bank (For OBJECTIVE and HYBRID modes) */}
              {(examMode === 'OBJECTIVE' || examMode === 'HYBRID') && (
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
                  <div className="max-h-64 overflow-y-auto space-y-2.5 border border-slate-700 rounded-2xl p-3 bg-[#0F172A]/80">
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
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-300">
                  Target: <strong className="text-white font-bold">{newDivision === 'DIV 1' ? 'Division A (24CS001-24CS065)' : newDivision === 'DIV 2' ? 'Division B (24CS066+)' : 'Both Divisions (All)'}</strong> • {examMode === 'CODING' ? (
                    <strong className="text-cyan-400 font-bold">{authoredCodingProblems.length} Coding Problems</strong>
                  ) : examMode === 'HYBRID' ? (
                    <strong className="text-purple-400 font-bold">{selectedQuestionIds.length} MCQs + {authoredCodingProblems.length} Coding Problems</strong>
                  ) : (
                    <strong className="text-indigo-400 font-bold">{selectedQuestionIds.length} Questions</strong>
                  )}
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
                    disabled={creating || (examMode === 'CODING' ? authoredCodingProblems.length === 0 : examMode === 'HYBRID' ? (selectedQuestionIds.length === 0 && authoredCodingProblems.length === 0) : selectedQuestionIds.length === 0)}
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

      {/* MODAL 1: Interactive Coding Problem Authoring Drawer/Modal */}
      {isProblemAuthorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-4xl rounded-3xl shadow-2xl border border-cyan-500/40 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80 bg-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingProblemIdx !== null ? 'Edit Coding Problem Statement & Test Cases' : 'Author Coding Problem Statement & Test Cases'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Define algorithmic prompt, sample cases (visible to student), and check cases (hidden evaluation)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsProblemAuthorModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAuthoredProblem} className="p-6 overflow-y-auto space-y-6">
              {/* Quick AI Synthesizer Bar (Groq LPU) */}
              <div className="bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-slate-900 border border-cyan-500/40 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Ultra-Fast Problem Synthesizer (Groq LPU ~1.5s)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Generates full problem statement, constraints, starter codes & test cases
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPromptTopic}
                    onChange={(e) => setAiPromptTopic(e.target.value)}
                    placeholder="e.g. Search in Rotated Sorted Array, Dynamic Programming 0/1 Knapsack, Two Sum II..."
                    className="flex-1 px-3.5 py-2.5 text-xs bg-[#0F172A] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={handleAiGenerateProblem}
                    disabled={isGeneratingWithAi}
                    className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition disabled:opacity-50"
                  >
                    {isGeneratingWithAi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Generating (~1.5s)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Auto-Fill Problem</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Title, Difficulty, Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Problem Title *</label>
                  <input
                    type="text"
                    required
                    value={cpTitle}
                    onChange={(e) => setCpTitle(e.target.value)}
                    placeholder="e.g. Rotate Array by K Steps"
                    className="w-full p-3 text-xs bg-[#1E293B] border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 font-semibold"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Difficulty</label>
                  <select
                    value={cpDifficulty}
                    onChange={(e: any) => setCpDifficulty(e.target.value)}
                    className="w-full p-3 text-xs bg-[#1E293B] border border-slate-600 rounded-xl text-white font-semibold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Tags / Topic</label>
                  <input
                    type="text"
                    value={cpTags}
                    onChange={(e) => setCpTags(e.target.value)}
                    placeholder="e.g. Array, Two Pointers"
                    className="w-full p-3 text-xs bg-[#1E293B] border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Full Problem Description */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>Full Problem Statement & Requirements *</span>
                  <span className="text-[10px] text-slate-400">Detailed instructions, input specifications, and expectations</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={cpDescription}
                  onChange={(e) => setCpDescription(e.target.value)}
                  placeholder="Given an integer array nums, rotate the array to the right by k steps, where k is non-negative...&#10;&#10;Input Format:&#10;nums = [1,2,3,4,5,6,7], k = 3&#10;&#10;Output Format:&#10;[5,6,7,1,2,3,4]"
                  className="w-full p-3.5 text-xs bg-[#1E293B] border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono leading-relaxed"
                />
              </div>

              {/* Constraints & Hints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Constraints</label>
                  <textarea
                    rows={3}
                    value={cpConstraints}
                    onChange={(e) => setCpConstraints(e.target.value)}
                    placeholder="• 1 <= nums.length <= 10^5&#10;• -10^4 <= nums[i] <= 10^4&#10;• Time Limit: 2000ms"
                    className="w-full p-3 text-xs bg-[#1E293B] border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Hints (Optional)</label>
                  <textarea
                    rows={3}
                    value={cpHints}
                    onChange={(e) => setCpHints(e.target.value)}
                    placeholder="• Try reversing the whole array first, then reverse the sub-segments."
                    className="w-full p-3 text-xs bg-[#1E293B] border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Starter Codes (Python & JavaScript) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-amber-400" />
                      Python Starter Code
                    </span>
                    <span className="text-[10px] text-slate-400">Function Signature</span>
                  </label>
                  <textarea
                    rows={4}
                    value={cpStarterPython}
                    onChange={(e) => setCpStarterPython(e.target.value)}
                    placeholder="def solution(nums, k):&#10;    # Write your solution here&#10;    pass"
                    className="w-full p-3 text-xs bg-[#0F172A] border border-slate-700 rounded-xl text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-yellow-400" />
                      JavaScript Starter Code
                    </span>
                    <span className="text-[10px] text-slate-400">Function Signature</span>
                  </label>
                  <textarea
                    rows={4}
                    value={cpStarterJs}
                    onChange={(e) => setCpStarterJs(e.target.value)}
                    placeholder="function solution(nums, k) {&#10;    // Write your solution here&#10;}"
                    className="w-full p-3 text-xs bg-[#0F172A] border border-slate-700 rounded-xl text-yellow-300 placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>
              </div>

              {/* 1. SAMPLE TEST CASES (Visible to Student in Exam) */}
              <div className="space-y-3 pt-3 border-t border-slate-700/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-emerald-400" />
                      Sample Test Cases (Visible to Students in Exam)
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Students can execute code against these sample test cases during the exam.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSampleTestCase}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Sample Case</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {cpSampleTestCases.map((tc, idx) => (
                    <div
                      key={tc.id}
                      className="p-3.5 rounded-2xl border border-emerald-500/30 bg-[#0F172A] space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-emerald-300 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          Sample Case {idx + 1}
                        </span>
                        {cpSampleTestCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSampleTestCase(tc.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">
                            Sample Input (Python assignment format, e.g. nums = [1,2], k = 1)
                          </label>
                          <input
                            type="text"
                            required
                            value={tc.input}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCpSampleTestCases((prev) =>
                                prev.map((item) => (item.id === tc.id ? { ...item, input: val } : item)),
                              );
                            }}
                            placeholder="nums = [1, 2, 3, 4], target = 5"
                            className="w-full p-2.5 text-xs bg-[#1E293B] border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">
                            Sample Expected Output (Exact return value)
                          </label>
                          <input
                            type="text"
                            required
                            value={tc.expectedOutput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCpSampleTestCases((prev) =>
                                prev.map((item) => (item.id === tc.id ? { ...item, expectedOutput: val } : item)),
                              );
                            }}
                            placeholder="[0, 3]"
                            className="w-full p-2.5 text-xs bg-[#1E293B] border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={tc.explanation}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCpSampleTestCases((prev) =>
                              prev.map((item) => (item.id === tc.id ? { ...item, explanation: val } : item)),
                            );
                          }}
                          placeholder="Explanation: nums[0] + nums[3] == 5, so return indices [0, 3]."
                          className="w-full p-2 text-xs bg-[#1E293B]/70 border border-slate-700 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. TEST CASES TO CHECK (Hidden Evaluation Test Cases for Code Judge) */}
              <div className="space-y-3 pt-3 border-t border-slate-700/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-indigo-400" />
                      Test Cases to Check (Hidden Evaluation & Scoring Judge)
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Used by automated code judge upon exam submission. Hidden from students to prevent hardcoding.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCheckTestCase}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Check Case</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {cpCheckTestCases.map((tc, idx) => (
                    <div
                      key={tc.id}
                      className="p-3.5 rounded-2xl border border-indigo-500/30 bg-[#0F172A] space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-indigo-300 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          Evaluation Check Case {idx + 1} (Hidden)
                        </span>
                        {cpCheckTestCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCheckTestCase(tc.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">
                            Input to Check (Boundary, negative, large array values)
                          </label>
                          <input
                            type="text"
                            required
                            value={tc.input}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCpCheckTestCases((prev) =>
                                prev.map((item) => (item.id === tc.id ? { ...item, input: val } : item)),
                              );
                            }}
                            placeholder="nums = [-1, -2, -3], target = -5"
                            className="w-full p-2.5 text-xs bg-[#1E293B] border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-indigo-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">
                            Expected Output to Check
                          </label>
                          <input
                            type="text"
                            required
                            value={tc.expectedOutput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCpCheckTestCases((prev) =>
                                prev.map((item) => (item.id === tc.id ? { ...item, expectedOutput: val } : item)),
                              );
                            }}
                            placeholder="[1, 2]"
                            className="w-full p-2.5 text-xs bg-[#1E293B] border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-indigo-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={tc.explanation}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCpCheckTestCases((prev) =>
                                prev.map((item) => (item.id === tc.id ? { ...item, explanation: val } : item)),
                              );
                            }}
                            placeholder="Reason: Negative numbers edge case"
                            className="w-full p-2 text-xs bg-[#1E293B]/70 border border-slate-700 rounded-xl text-slate-300 focus:outline-none focus:border-indigo-400"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={tc.timeLimitMs}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setCpCheckTestCases((prev) =>
                                prev.map((item) => (item.id === tc.id ? { ...item, timeLimitMs: val } : item)),
                              );
                            }}
                            placeholder="Time Limit (ms)"
                            className="w-full p-2 text-xs bg-[#1E293B]/70 border border-slate-700 rounded-xl text-slate-300 focus:outline-none focus:border-indigo-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Author Modal Footer */}
              <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {cpSampleTestCases.length} Visible Cases • {cpCheckTestCases.length} Hidden Check Cases
                </span>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsProblemAuthorModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-600/30 transition"
                  >
                    {editingProblemIdx !== null ? 'Update Problem' : 'Add Problem to Exam'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Browse & Import from CLIAS Coding Problem Bank */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-3xl rounded-3xl shadow-2xl border border-indigo-500/40 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80 bg-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Import from CLIAS Coding Problem Bank</h3>
                  <p className="text-xs text-slate-400">
                    Select tested algorithms with verified starter codes and comprehensive test suites
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {bankLoading ? (
                <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <span>Loading coding problems from database...</span>
                </div>
              ) : bankProblems.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No coding problems found in bank.
                </div>
              ) : (
                bankProblems.map((bp) => (
                  <div
                    key={bp.id}
                    className="p-4 rounded-2xl border border-slate-700 bg-[#1E293B]/60 hover:border-slate-500 transition flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-white">{bp.title}</h4>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                            bp.difficulty === 'EASY'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : bp.difficulty === 'HARD'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {bp.difficulty}
                        </span>
                        {bp.tags && (
                          <span className="text-[10px] text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                            {bp.tags}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {bp._count?.testCases || 0} Testcases • Slug: <span className="font-mono text-cyan-400">{bp.slug}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleImportProblemFromBank(bp)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Import</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Inspect Coding Problems of Created Assessment */}
      {isInspectModalOpen && inspectAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-4xl rounded-3xl shadow-2xl border border-cyan-500/40 overflow-hidden flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80 bg-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {inspectAssessment.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Exam Code: <span className="font-mono text-cyan-300">{inspectAssessment.code}</span> • Duration: {inspectAssessment.durationMinutes}m • Total Marks: {inspectAssessment.totalMarks}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInspectModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200">
                This assessment is configured with the <strong>CLIAS Automated In-Browser Code Judge</strong>. Students will write code directly in the browser editor and evaluate against sample cases before submitting for final automated grading.
              </div>

              {inspectAssessment.questions && inspectAssessment.questions.length > 0 ? (
                <div className="space-y-4">
                  {inspectAssessment.questions.map((aq: any, idx: number) => {
                    let parsedMeta: any = null;
                    try {
                      parsedMeta = JSON.parse(aq.question?.explanation || '{}');
                    } catch (_) {}

                    return (
                      <div
                        key={aq.id || idx}
                        className="p-4 rounded-2xl border border-slate-700 bg-[#1E293B]/70 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-cyan-600 text-white text-[11px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <h4 className="text-sm font-bold text-white">
                              {aq.question?.questionText || `Problem ${idx + 1}`}
                            </h4>
                          </div>
                          <span className="text-xs font-bold text-cyan-400">
                            {aq.points || 20} Points
                          </span>
                        </div>

                        {parsedMeta?.description && (
                          <div className="p-3 bg-[#0F172A] rounded-xl border border-slate-700 text-xs text-slate-300 font-mono whitespace-pre-wrap">
                            {parsedMeta.description}
                          </div>
                        )}

                        {parsedMeta?.sampleTestCases && parsedMeta.sampleTestCases.length > 0 && (
                          <div>
                            <span className="text-[11px] font-bold text-emerald-400 block mb-1.5">
                              Sample Test Cases ({parsedMeta.sampleTestCases.length}):
                            </span>
                            <div className="space-y-2">
                              {parsedMeta.sampleTestCases.map((stc: any, sIdx: number) => (
                                <div
                                  key={sIdx}
                                  className="p-2.5 rounded-xl bg-[#0F172A] border border-emerald-500/30 text-xs font-mono space-y-1"
                                >
                                  <div><span className="text-slate-400">Input:</span> <span className="text-emerald-300">{stc.input}</span></div>
                                  <div><span className="text-slate-400">Expected:</span> <span className="text-white">{stc.expectedOutput}</span></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 border border-slate-800 rounded-2xl">
                  Questions are stored in the secure question bank for this assessment code.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cohort Analytics & Student Marks Modal */}
      {analysisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">Cohort Attempt Analytics & Marks</h3>
                    {activeAnalytics && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                        {activeAnalytics.code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeAnalytics ? activeAnalytics.title : 'Loading cohort performance metrics...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {activeAnalytics && activeAnalytics.submissions?.length > 0 && (
                  <button
                    onClick={() => exportMarksCsv(activeAnalytics)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Marks (.CSV)</span>
                  </button>
                )}
                <button
                  onClick={() => setAnalysisModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {analyticsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-sm">Compiling student attempt reports & integrity logs...</p>
                </div>
              ) : !activeAnalytics ? (
                <div className="py-16 text-center text-slate-400">
                  <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-white">Analytics Unavailable</p>
                  <p className="text-xs text-slate-400 mt-1">Unable to load analytics for this assessment.</p>
                </div>
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                      <span className="text-xs text-slate-400 font-medium">Total Attempts</span>
                      <p className="text-2xl font-black text-white mt-1">
                        {activeAnalytics.totalSubmissions}
                      </p>
                      <span className="text-[11px] text-slate-400">Enrolled submissions</span>
                    </div>

                    <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                      <span className="text-xs text-slate-400 font-medium">Class Average</span>
                      <p className="text-2xl font-black text-indigo-400 mt-1">
                        {activeAnalytics.averageScore}{' '}
                        <span className="text-xs font-normal text-slate-400">/ {activeAnalytics.totalMarks}</span>
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {activeAnalytics.totalMarks > 0
                          ? Math.round((activeAnalytics.averageScore / activeAnalytics.totalMarks) * 100)
                          : 0}
                        % cohort score
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                      <span className="text-xs text-slate-400 font-medium">Pass Rate</span>
                      <p className="text-2xl font-black text-emerald-400 mt-1">
                        {activeAnalytics.passRate}%
                      </p>
                      <span className="text-[11px] text-slate-400">Benchmark: {activeAnalytics.passingMarks} marks</span>
                    </div>

                    <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                      <span className="text-xs text-slate-400 font-medium">Score Range</span>
                      <p className="text-2xl font-black text-white mt-1">
                        {activeAnalytics.highestScore}{' '}
                        <span className="text-xs font-normal text-slate-400">high</span> •{' '}
                        <span className="text-amber-400">{activeAnalytics.lowestScore}</span>{' '}
                        <span className="text-xs font-normal text-slate-400">low</span>
                      </p>
                      <span className="text-[11px] text-slate-400">Max possible: {activeAnalytics.totalMarks}</span>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={searchStudent}
                          onChange={(e) => setSearchStudent(e.target.value)}
                          placeholder="Search student, enrollment, email..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <select
                        value={filterDiv}
                        onChange={(e) => setFilterDiv(e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="ALL">All Divisions</option>
                        <option value="DIV 1">Division A (DIV 1)</option>
                        <option value="DIV 2">Division B (DIV 2)</option>
                      </select>
                    </div>

                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                      Showing{' '}
                      {(activeAnalytics.submissions || []).filter((s: any) => {
                        const matchDiv = filterDiv === 'ALL' || (s.division || activeAnalytics.division) === filterDiv;
                        const matchSearch =
                          !searchStudent.trim() ||
                          (s.studentName || '').toLowerCase().includes(searchStudent.toLowerCase()) ||
                          (s.enrollmentNumber || '').toLowerCase().includes(searchStudent.toLowerCase()) ||
                          (s.email || '').toLowerCase().includes(searchStudent.toLowerCase());
                        return matchDiv && matchSearch;
                      }).length}{' '}
                      of {activeAnalytics.submissions?.length || 0} attempts
                    </span>
                  </div>

                  {/* Students Attempt List Table */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/30">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3.5">Student Details</th>
                            <th className="px-4 py-3.5">Division</th>
                            <th className="px-4 py-3.5">Marks Obtained</th>
                            <th className="px-4 py-3.5">Percentage</th>
                            <th className="px-4 py-3.5">Status</th>
                            <th className="px-4 py-3.5">AI Proctoring Trust</th>
                            <th className="px-4 py-3.5 text-right">Attempt Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-medium">
                          {(activeAnalytics.submissions || [])
                            .filter((s: any) => {
                              const matchDiv = filterDiv === 'ALL' || (s.division || activeAnalytics.division) === filterDiv;
                              const matchSearch =
                                !searchStudent.trim() ||
                                (s.studentName || '').toLowerCase().includes(searchStudent.toLowerCase()) ||
                                (s.enrollmentNumber || '').toLowerCase().includes(searchStudent.toLowerCase()) ||
                                (s.email || '').toLowerCase().includes(searchStudent.toLowerCase());
                              return matchDiv && matchSearch;
                            })
                            .map((sub: any) => (
                              <tr key={sub.submissionId || sub.id} className="hover:bg-slate-800/40 transition">
                                <td className="px-4 py-3.5">
                                  <div className="flex flex-col">
                                    <span className="text-white font-bold">{sub.studentName}</span>
                                    <span className="text-[11px] text-slate-400 font-mono">
                                      {sub.enrollmentNumber || sub.email}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px] font-mono">
                                    {sub.division || activeAnalytics.division || 'DIV 1'}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className="text-white font-bold text-sm">
                                    {sub.score}{' '}
                                    <span className="text-slate-500 font-normal text-xs">
                                      / {sub.totalMarks}
                                    </span>
                                  </span>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                      sub.percentage >= 60
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : sub.percentage >= 40
                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}
                                  >
                                    {sub.percentage}%
                                  </span>
                                </td>
                                <td className="px-4 py-3.5">
                                  {sub.passed ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      PASSED
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                      <XCircle className="w-3.5 h-3.5" />
                                      RETAKE
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                        sub.trustScore >= 80
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                          : sub.trustScore >= 50
                                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                                      }`}
                                    >
                                      {sub.trustScore}% Trust
                                    </span>
                                    {sub.violationsCount > 0 && (
                                      <span className="text-[11px] text-rose-400 font-semibold">
                                        ({sub.violationsCount} violations)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-right text-slate-400 font-mono text-[11px]">
                                  {new Date(sub.submittedAt).toLocaleDateString()} •{' '}
                                  {new Date(sub.submittedAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </td>
                              </tr>
                            ))}

                          {(!activeAnalytics.submissions || activeAnalytics.submissions.length === 0) && (
                            <tr>
                              <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                                No students have completed or submitted this assessment yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

