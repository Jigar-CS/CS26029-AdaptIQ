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
  Sliders,
  AlertCircle,
  Upload,
  FileUp,
  CheckSquare,
  Square,
  Trophy,
  BrainCircuit,
  Send,
  RotateCcw,
  GraduationCap,
  Shuffle,
  ShieldCheck,
} from 'lucide-react';
import { AssessmentLeaderboardModal } from '@/components/AssessmentLeaderboardModal';

interface DepartmentBatchMeta {
  instituteCode: string;
  instituteName: string;
  departmentCode: string;
  departmentName: string;
  rollPrefix: string;
  totalStudents: number;
  batches: Array<{
    id: string;
    name: string;
    semesterLabel: string;
    badge: string;
    gradYear: string;
    count: number;
    rollRange: string;
    description: string;
  }>;
}

function getDepartmentBatchConfig(course?: any): DepartmentBatchMeta {
  const instCode =
    course?.department?.institute?.code?.toUpperCase() ||
    (course?.code?.toUpperCase().startsWith('D') ? 'DEPSTAR' : 'CSPIT');
  const deptCode = course?.department?.code?.toUpperCase() || '';
  const courseCode = course?.code?.toUpperCase() || '';

  let rollPrefix = 'CS';
  let departmentName = 'Computer Science & Engineering';
  let instituteName = 'CSPIT';

  if (
    instCode === 'DEPSTAR' ||
    courseCode.startsWith('DCS') ||
    courseCode.startsWith('DCE') ||
    courseCode.startsWith('DIT') ||
    deptCode.startsWith('D_')
  ) {
    instituteName = 'DEPSTAR';
    if (deptCode.includes('CSE') || courseCode.startsWith('DCS')) {
      rollPrefix = 'DCS';
      departmentName = 'Computer Science & Engineering (DEPSTAR)';
    } else if (deptCode.includes('CE') || courseCode.startsWith('DCE')) {
      rollPrefix = 'DCE';
      departmentName = 'Computer Engineering (DEPSTAR)';
    } else if (deptCode.includes('IT') || courseCode.startsWith('DIT')) {
      rollPrefix = 'DIT';
      departmentName = 'Information Technology (DEPSTAR)';
    } else {
      rollPrefix = 'DCS';
      departmentName = 'Computer Science & Engineering (DEPSTAR)';
    }
  } else {
    instituteName = 'CSPIT';
    if (deptCode === 'AIML' || courseCode.startsWith('AI')) {
      rollPrefix = 'AIML';
      departmentName = 'Artificial Intelligence & Machine Learning';
    } else if (deptCode === 'IT' || courseCode.startsWith('IT')) {
      rollPrefix = 'IT';
      departmentName = 'Information Technology';
    } else if (deptCode === 'CE' || courseCode.startsWith('CE')) {
      rollPrefix = 'CE';
      departmentName = 'Computer Engineering';
    } else {
      rollPrefix = 'CS';
      departmentName = 'Computer Science & Engineering';
    }
  }

  return {
    instituteCode: instituteName,
    instituteName:
      instituteName === 'DEPSTAR'
        ? 'Devang Patel Institute of Advance Technology and Research (DEPSTAR)'
        : 'Chandubhai S Patel Institute of Technology (CSPIT)',
    departmentCode: deptCode || rollPrefix,
    departmentName,
    rollPrefix,
    totalStudents: 140,
    batches: [
      {
        id: 'ALL',
        name: 'All Batches',
        semesterLabel: 'All 4 Semesters',
        badge: 'ALL BATCHES',
        gradYear: 'Batches 2023 - 2026',
        count: 140,
        rollRange: `All 140 ${departmentName} Students`,
        description: `Open to all ${rollPrefix} students across 1st, 2nd, 4th, & 6th Semesters.`,
      },
      {
        id: '24',
        name: "Batch '24",
        semesterLabel: 'Semester 4',
        badge: 'SEM 4',
        gradYear: 'Class of 2028',
        count: 50,
        rollRange: `24${rollPrefix}001 – 24${rollPrefix}050`,
        description: `Core 4th Semester cohort (50 Students, Div A & B).`,
      },
      {
        id: '23',
        name: "Batch '23",
        semesterLabel: 'Semester 6',
        badge: 'SEM 6',
        gradYear: 'Class of 2027',
        count: 30,
        rollRange: `23${rollPrefix}001 – 23${rollPrefix}030`,
        description: `Senior 6th Semester cohort (30 Students).`,
      },
      {
        id: '25',
        name: "Batch '25",
        semesterLabel: 'Semester 2',
        badge: 'SEM 2',
        gradYear: 'Class of 2029',
        count: 30,
        rollRange: `25${rollPrefix}001 – 25${rollPrefix}030`,
        description: `Freshman 2nd Semester cohort (30 Students).`,
      },
      {
        id: '26',
        name: "Batch '26",
        semesterLabel: 'Semester 1',
        badge: 'SEM 1',
        gradYear: 'Class of 2030',
        count: 30,
        rollRange: `26${rollPrefix}001 – 26${rollPrefix}030`,
        description: `Incoming 1st Semester cohort (30 Students).`,
      },
    ],
  };
}

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
  const [leaderboardModalData, setLeaderboardModalData] = useState<{ id: string; title: string } | null>(null);

  // Examination Mode & Coding Problem Engine State
  const [examMode, setExamMode] = useState<'OBJECTIVE' | 'CODING' | 'DESCRIPTIVE' | 'HYBRID'>('OBJECTIVE');
  const [authoredCodingProblems, setAuthoredCodingProblems] = useState<any[]>([]);
  const [isProblemAuthorModalOpen, setIsProblemAuthorModalOpen] = useState(false);
  const [editingProblemIdx, setEditingProblemIdx] = useState<number | null>(null);

  // Authored Descriptive Questions State
  const [authoredDescriptiveQuestions, setAuthoredDescriptiveQuestions] = useState<
    Array<{ id: string; title: string; prompt: string; rubric: string; points: number }>
  >([
    {
      id: '1',
      title: 'Question 1: Explain ACID Properties in DBMS',
      prompt:
        'Explain the four ACID (Atomicity, Consistency, Isolation, Durability) properties in Database Management Systems (DBMS). Provide a comprehensive real-world banking transaction example illustrating how transaction rollback prevents data inconsistencies.',
      rubric: 'Atomicity (2.5M) • Consistency (2.5M) • Isolation (2.5M) • Durability (2.5M)',
      points: 10,
    },
    {
      id: '2',
      title: 'Question 2: Database Normalization (1NF to BCNF)',
      prompt:
        'Explain Database Normalization and anomalies (Insert, Update, Delete) in unnormalized relations. Illustrate progressive decomposition from 1NF, 2NF, 3NF, up to Boyce-Codd Normal Form (BCNF) using an Employee-Project schema.',
      rubric: 'Anomalies Explanation (2M) • 1NF & 2NF (3M) • 3NF & BCNF (3M) • Lossless Decomposition (2M)',
      points: 10,
    },
    {
      id: '3',
      title: 'Question 3: SQL vs NoSQL & CAP Theorem',
      prompt:
        'Compare Relational Databases (RDBMS) with NoSQL architectures (Document, Key-Value, Columnar, Graph). State the CAP Theorem (Consistency, Availability, Partition Tolerance) and discuss system design trade-offs in distributed clusters.',
      rubric: 'SQL vs NoSQL Comparison (3M) • 4 NoSQL Types (3M) • CAP Theorem Proof & Trade-offs (4M)',
      points: 10,
    },
    {
      id: '4',
      title: 'Question 4: Database Indexing & B+ Trees',
      prompt:
        'Explain how indexing improves query retrieval performance. Compare Clustered vs Non-Clustered Indexes, and describe the internal tree node structure of a B+ Tree index with an insertion and split example.',
      rubric: 'Clustered vs Non-Clustered (3M) • B+ Tree Architecture (4M) • Performance Impact & Overhead (3M)',
      points: 10,
    },
    {
      id: '5',
      title: 'Question 5: Concurrency Control & Two-Phase Locking',
      prompt:
        'Describe Concurrency Control in multi-user DBMS environments. Explain Strict Two-Phase Locking (Strict 2PL), Deadlock Detection vs Deadlock Prevention, and contrast 2PL with Timestamp-based Ordering protocols.',
      rubric: 'Serializability & Concurrency (2M) • Strict 2PL Protocol (4M) • Deadlock Handling (2M) • Timestamp Ordering (2M)',
      points: 10,
    },
  ]);

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

  // Handwritten Answer Sheet Review Modal & Manual Grading State
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [selectedSubForSheet, setSelectedSubForSheet] = useState<any | null>(null);
  const [sheetActiveQ, setSheetActiveQ] = useState<string>('Q1');
  const [sheetStrokes, setSheetStrokes] = useState<any[]>([]);
  const [sheetTypedText, setSheetTypedText] = useState<string>('');
  const [sheetLoading, setSheetLoading] = useState(false);
  const sheetCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const sheetScrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [sheetCurrentPage, setSheetCurrentPage] = useState<number>(1);
  const [sheetViewMode, setSheetViewMode] = useState<'fit' | '100'>('fit');

  const PAGE_HEIGHT = 750;
  const sheetTotalPages = React.useMemo(() => {
    if (sheetStrokes && sheetStrokes.length > 0) {
      let maxY = 0;
      for (const stroke of sheetStrokes) {
        const pts = stroke.points || stroke.pts || [];
        for (const p of pts) {
          const py = Number(p.y) || 0;
          if (py > maxY) maxY = py;
        }
      }
      return Math.max(1, Math.ceil((maxY > 0 ? maxY + 60 : 1) / PAGE_HEIGHT));
    }
    if (sheetTypedText && sheetTypedText.trim().length > 0) {
      const lines = sheetTypedText.split('\n');
      let estimatedLines = 0;
      for (const l of lines) {
        estimatedLines += Math.max(1, Math.ceil(l.length / 65));
      }
      return Math.max(1, Math.ceil((estimatedLines * 36 + 140) / PAGE_HEIGHT));
    }
    return 1;
  }, [sheetStrokes, sheetTypedText]);

  // Interactive Faculty Grading State
  const [gradingMarks, setGradingMarks] = useState<Record<string, number>>({});
  const [gradingFeedback, setGradingFeedback] = useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [savingGrades, setSavingGrades] = useState(false);
  const [gradeSuccessMsg, setGradeSuccessMsg] = useState('');

  // New assessment form state
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState('QUIZ');
  const [newDivision, setNewDivision] = useState<'ALL' | 'DIV 1' | 'DIV 2'>('ALL');
  const [newBatch, setNewBatch] = useState<string>('ALL');
  const [newRollFilter, setNewRollFilter] = useState<'ALL' | 'ODD' | 'EVEN'>('ALL');
  const [newDuration, setNewDuration] = useState(30);
  const [newTotalMarks, setNewTotalMarks] = useState(100);
  const [newPassingMarks, setNewPassingMarks] = useState(40);
  const [newStatus, setNewStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [newRandomizeQuestions, setNewRandomizeQuestions] = useState(true);
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [filterTopic, setFilterTopic] = useState('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');
  const [filterQuestionType, setFilterQuestionType] = useState('ALL');
  const [questionSearch, setQuestionSearch] = useState('');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [showDraftPreview, setShowDraftPreview] = useState(false);

  // Document AI / RAG Integration in Create Assessment
  const [questionSourceWorkflow, setQuestionSourceWorkflow] = useState<'BANK' | 'DOCUMENT'>('BANK');
  const [ragFile, setRagFile] = useState<File | null>(null);
  const [ragExtracting, setRagExtracting] = useState<boolean>(false);
  const [ragExtractProgress, setRagExtractProgress] = useState<string | null>(null);
  const [ragExtractError, setRagExtractError] = useState<string | null>(null);
  const [candidateQuestions, setCandidateQuestions] = useState<any[]>([]);
  const [selectedCandidateIndices, setSelectedCandidateIndices] = useState<number[]>([]);
  const [candidateTopicFilter, setCandidateTopicFilter] = useState<string>('ALL');
  const [candidateOnlyAmbiguous, setCandidateOnlyAmbiguous] = useState<boolean>(false);
  const [importingToAssessment, setImportingToAssessment] = useState<boolean>(false);
  const [sourceAttributionMap, setSourceAttributionMap] = useState<Record<string, 'RAG' | 'BANK'>>({});

  // Edit assessment modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDuration, setEditDuration] = useState(30);
  const [editPassingMarks, setEditPassingMarks] = useState(40);
  const [editTotalMarks, setEditTotalMarks] = useState(100);
  const [editDivision, setEditDivision] = useState<'ALL' | 'DIV 1' | 'DIV 2'>('ALL');
  const [editBatch, setEditBatch] = useState<string>('ALL');
  const [editRollFilter, setEditRollFilter] = useState<'ALL' | 'ODD' | 'EVEN'>('ALL');
  const [editAllowedAttempts, setEditAllowedAttempts] = useState(2);
  const [editStatus, setEditStatus] = useState<string>('PUBLISHED');
  const [editExtendMinutes, setEditExtendMinutes] = useState<number>(0);
  const [editRandomizeQuestions, setEditRandomizeQuestions] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const deptBatchConfig = getDepartmentBatchConfig(selectedCourse);

  const openEditModal = (assessment: any) => {
    setEditingAssessment(assessment);
    setEditTitle(assessment.title || '');
    setEditDescription(assessment.description || '');
    setEditDuration(assessment.durationMinutes || 30);
    setEditPassingMarks(assessment.passingMarks || 40);
    setEditTotalMarks(assessment.totalMarks || 100);
    setEditDivision(assessment.division || 'ALL');
    setEditBatch(assessment.batch || 'ALL');
    setEditRollFilter((assessment.rollFilter as any) || 'ALL');
    setEditAllowedAttempts(assessment.allowedAttempts || 2);
    setEditStatus(assessment.status || 'PUBLISHED');
    setEditExtendMinutes(0);
    setEditRandomizeQuestions(assessment.randomizeQuestions !== false);
    setIsEditModalOpen(true);
  };

  const handleSaveEditAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssessment) return;

    setSavingEdit(true);
    try {
      await api.patch(`/assessments/${editingAssessment.id}`, {
        title: editTitle,
        description: editDescription,
        durationMinutes: Number(editDuration),
        passingMarks: Number(editPassingMarks),
        totalMarks: Number(editTotalMarks),
        division: editDivision,
        batch: editBatch,
        rollFilter: editRollFilter,
        allowedAttempts: Number(editAllowedAttempts),
        status: editStatus,
        extendMinutes: editExtendMinutes > 0 ? Number(editExtendMinutes) : undefined,
        randomizeQuestions: editRandomizeQuestions,
      });

      setIsEditModalOpen(false);
      setEditingAssessment(null);
      await loadCourseAssessments(selectedCourseId);
    } catch (err: any) {
      alert(err.message || 'Failed to update assessment');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleReopenAssessmentNow = async () => {
    if (!editingAssessment) return;
    setSavingEdit(true);
    try {
      await api.patch(`/assessments/${editingAssessment.id}`, {
        reopen: true,
        durationMinutes: Number(editDuration),
        status: 'PUBLISHED',
      });
      setIsEditModalOpen(false);
      setEditingAssessment(null);
      await loadCourseAssessments(selectedCourseId);
    } catch (err: any) {
      alert(err.message || 'Failed to reopen assessment');
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePublishAssessment = async (assessment: any) => {
    try {
      await api.patch(`/assessments/${assessment.id}`, {
        status: 'PUBLISHED',
        reopen: true,
      });
      await loadCourseAssessments(selectedCourseId);
    } catch (err: any) {
      alert(err.message || 'Failed to publish assessment');
    }
  };

  const handleUnpublishAssessment = async (assessment: any) => {
    try {
      await api.patch(`/assessments/${assessment.id}/status`, {
        status: 'DRAFT',
      });
      await loadCourseAssessments(selectedCourseId);
    } catch (err: any) {
      alert(err.message || 'Failed to revert assessment to draft');
    }
  };

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

  const openAnswerSheetModal = (sub: any) => {
    setSelectedSubForSheet(sub);
    setSheetActiveQ('Q1');
    setSheetModalOpen(true);
    setGradeSuccessMsg('');
    setSheetStrokes([]);
    setSheetTypedText('');

    // Prepopulate grading marks and feedback from previous evaluation if available
    const initialMarks: Record<string, number> = {};
    const initialFeedback: Record<string, string> = {};

    if (sub.answers && Array.isArray(sub.answers)) {
      sub.answers.forEach((ans: any, idx: number) => {
        const qKey = `Q${idx + 1}`;
        initialMarks[qKey] = ans.pointsAwarded ?? 0;
        initialFeedback[qKey] = ans.feedback || '';
        if (ans.questionId) {
          initialMarks[ans.questionId] = ans.pointsAwarded ?? 0;
          initialFeedback[ans.questionId] = ans.feedback || '';
        }
      });
    }

    setGradingMarks(initialMarks);
    setGradingFeedback(initialFeedback);
    setOverallFeedback(sub.feedback || '');

    const firstAns = sub?.answers?.[0];
    const targetQId = firstAns?.questionId || 'Q1';
    loadSheetStrokes(sub, 'Q1', targetQId);
  };

  const handleSaveStudentGrades = async () => {
    if (!selectedSubForSheet) return;
    setSavingGrades(true);
    setGradeSuccessMsg('');

    try {
      const answersList = selectedSubForSheet?.answers || [];
      const answersPayload = answersList.map((ans: any, idx: number) => {
        const qKey = `Q${idx + 1}`;
        const qId = ans.questionId || ans.id || `q-${qKey}`;
        const awarded = gradingMarks[qKey] !== undefined 
          ? gradingMarks[qKey] 
          : (gradingMarks[qId] !== undefined ? gradingMarks[qId] : (ans?.pointsAwarded ?? 0));
        const fb = gradingFeedback[qKey] || gradingFeedback[qId] || ans?.feedback || '';
        return {
          questionId: qId,
          pointsAwarded: Number(awarded) || 0,
          feedback: fb,
        };
      });

      const res: any = await api.post(`/assessments/submissions/${selectedSubForSheet.submissionId}/grade`, {
        answers: answersPayload,
        overallFeedback,
        status: 'EVALUATED',
      });

      setGradeSuccessMsg('Evaluation finalized successfully! Total score and grade updated in cohort records.');

      if (res?.submission) {
        setSelectedSubForSheet((prev: any) => ({
          ...prev,
          score: res.submission.totalScore,
          percentage: res.submission.percentage,
          status: res.submission.status,
          feedback: res.submission.feedback,
        }));
      }

      // Refresh active analytics modal data
      if (activeAnalytics?.assessmentId) {
        const refreshed = await api.get(`/assessments/${activeAnalytics.assessmentId}/analytics`);
        setActiveAnalytics(refreshed);
      }
    } catch (err: any) {
      console.error('Failed to save grades', err);
      alert(err.message || 'Failed to submit grade evaluation');
    } finally {
      setSavingGrades(false);
    }
  };

  const loadSheetStrokes = async (subOrSession: any, qId: string, targetQuestionId?: string) => {
    setSheetLoading(true);
    setSheetCurrentPage(1);
    setSheetTypedText('');
    setSheetStrokes([]);
    if (sheetScrollContainerRef.current) {
      sheetScrollContainerRef.current.scrollTo({ top: 0 });
    }

    const subObj = typeof subOrSession === 'object' ? subOrSession : selectedSubForSheet;
    const qIndex = Math.max(0, Number(qId.replace('Q', '')) - 1);

    // 1. Strict Question Resolution: Find the answer specifically belonging to this question
    let ans = null;
    if (subObj?.answers && Array.isArray(subObj.answers)) {
      if (targetQuestionId) {
        ans = subObj.answers.find((a: any) =>
          a.questionId === targetQuestionId ||
          a.question?.id === targetQuestionId ||
          a.id === targetQuestionId
        ) || null;
      }
      if (!ans) {
        ans = subObj.answers.find((a: any) => a.order === (qIndex + 1)) || subObj.answers[qIndex] || null;
      }
    }

    let foundStrokes: any[] = [];
    let foundText = '';

    const isSystemBoilerplate = (str: any) => {
      if (!str || typeof str !== 'string') return true;
      const lower = str.toLowerCase().trim();
      return (
        lower === 'digital ink ruled sheet submission' ||
        lower === 'automated code submission' ||
        lower.startsWith('graded according to marking rubric') ||
        lower.startsWith('opt-') ||
        lower.startsWith('ans-')
      );
    };

    const parseAnswerPayload = (rawPayload: any) => {
      if (!rawPayload) return;
      if (typeof rawPayload === 'object' && rawPayload !== null) {
        if (Array.isArray(rawPayload.strokes)) foundStrokes = rawPayload.strokes;
        else if (Array.isArray(rawPayload.allStrokes)) foundStrokes = rawPayload.allStrokes;
        const textCandidate =
          rawPayload.typedText ||
          rawPayload.text ||
          rawPayload.answer ||
          rawPayload.answerText ||
          rawPayload.descriptiveAnswer ||
          rawPayload.studentAnswer ||
          rawPayload.studentResponse ||
          rawPayload.content ||
          rawPayload.solution;
        if (textCandidate && typeof textCandidate === 'string' && !isSystemBoilerplate(textCandidate)) {
          foundText = textCandidate;
        }
        return;
      }

      const raw = String(rawPayload).trim();
      if (!raw || isSystemBoilerplate(raw)) return;

      if (raw.startsWith('{') || raw.startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            if (parsed.length > 0 && (parsed[0].pts || parsed[0].points || parsed[0].x !== undefined)) {
              if (parsed[0].x !== undefined) {
                foundStrokes = [{ id: 'stroke-1', pts: parsed }];
              } else {
                foundStrokes = parsed;
              }
            } else if (parsed.length > 0 && typeof parsed[0] === 'string') {
              foundText = parsed.join('\n');
            }
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.strokes)) foundStrokes = parsed.strokes;
            else if (Array.isArray(parsed.allStrokes)) foundStrokes = parsed.allStrokes;

            const textCandidate =
              parsed.typedText ||
              parsed.text ||
              parsed.answerText ||
              parsed.answer ||
              parsed.descriptiveAnswer ||
              parsed.studentAnswer ||
              parsed.studentResponse ||
              parsed.content ||
              parsed.solution;

            if (textCandidate && typeof textCandidate === 'string' && !isSystemBoilerplate(textCandidate)) {
              foundText = textCandidate;
            } else if (textCandidate && typeof textCandidate === 'object') {
              foundText = JSON.stringify(textCandidate, null, 2);
            }
          }
          return;
        } catch (_) {}
      }

      if (!isSystemBoilerplate(raw)) {
        foundText = raw;
      }
    };

    if (ans) {
      if (ans.answerText) parseAnswerPayload(ans.answerText);
      if (!foundText && ans.typedText) parseAnswerPayload(ans.typedText);
      if (!foundText && ans.studentAnswer) parseAnswerPayload(ans.studentAnswer);
      if (!foundText && ans.sourceCode) parseAnswerPayload(ans.sourceCode);
      if (!foundText && ans.text && !isSystemBoilerplate(ans.text)) parseAnswerPayload(ans.text);
      if (!foundText && ans.selectedOptionId && !String(ans.selectedOptionId).startsWith('opt-')) {
        parseAnswerPayload(ans.selectedOptionId);
      }
    }

    // 2. Fallback to companion sync buffer if digital ink strokes were not packaged in DB record
    if (foundStrokes.length === 0 && subObj) {
      const candidates = [
        subObj.submissionId,
        subObj.id,
        subObj.pairingPin,
        subObj.pin,
        subObj.enrollmentNumber ? `CLIAS-${subObj.enrollmentNumber}` : null,
      ].filter(Boolean);

      for (const sId of candidates) {
        try {
          const res = await fetch(`/api/v1/companion/strokes?sessionId=${encodeURIComponent(sId!)}&questionId=${qId}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.strokes && Array.isArray(data.strokes) && data.strokes.length > 0) {
              foundStrokes = data.strokes;
              break;
            }
          }
        } catch (_) {}
      }
    }

    setSheetStrokes(foundStrokes);
    setSheetTypedText(foundText);
    setSheetLoading(false);
  };

  const handleSheetQuestionChange = (qId: string, targetQuestionId?: string) => {
    setSheetActiveQ(qId);
    if (selectedSubForSheet) {
      loadSheetStrokes(selectedSubForSheet, qId, targetQuestionId);
    }
  };

  useEffect(() => {
    if (!sheetModalOpen) return;
    const canvas = sheetCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const totalPages = Math.max(1, sheetTotalPages);
    const totalHeight = totalPages * PAGE_HEIGHT;
    if (canvas.width !== 900 || canvas.height !== totalHeight) {
      canvas.width = 900;
      canvas.height = totalHeight;
    }

    // 1. Draw clean white ruled notebook paper background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 900, totalHeight);

    // 2. Subtle horizontal notebook ruled guidelines (starting at y=48 with 36px spacing)
    const lineSpacing = 36;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.0;
    for (let y = 48; y < totalHeight; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(900, y);
      ctx.stroke();
    }

    // 3. Vertical red margin rule at x = 60
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(60, totalHeight);
    ctx.stroke();

    // 4. Page Break Dividers between pages (at y = 750, 1500, etc.)
    for (let p = 1; p < totalPages; p++) {
      const py = p * PAGE_HEIGHT;

      // Distinct page break line
      ctx.save();
      ctx.strokeStyle = '#6366F1';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(900, py);
      ctx.stroke();
      ctx.setLineDash([]);

      // Page marker badge: e.g. "— PAGE 2 OF 3 • Q1 —"
      ctx.fillStyle = '#EEF2FF';
      ctx.fillRect(280, py - 13, 340, 26);
      ctx.strokeStyle = '#C7D2FE';
      ctx.lineWidth = 1;
      ctx.strokeRect(280, py - 13, 340, 26);

      ctx.fillStyle = '#4F46E5';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`— PAGE ${p + 1} OF ${totalPages} • ${sheetActiveQ} —`, 450, py);
      ctx.restore();
    }

    // 5. Render handwritten strokes if available
    if (sheetStrokes && sheetStrokes.length > 0) {
      // Analyze coordinate bounds
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const stroke of sheetStrokes) {
        const pts = stroke.points || stroke.pts || [];
        for (const p of pts) {
          const px = Number(p.x) || 0;
          const py = Number(p.y) || 0;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      }

      const isNormalized = maxX > 0 && maxX <= 1.0 && maxY <= 1.0;
      const isMobileScale = maxX > 1.0 && maxX < 480;

      const transformPoint = (px: number, py: number) => {
        if (isNormalized) {
          return {
            x: 75 + px * 780,
            y: 48 + py * (totalHeight - 80),
          };
        }
        if (isMobileScale) {
          // Proportionally scale phone coordinates so natural writing fits across ruled notebook lines
          const scale = Math.min(1.7, 780 / Math.max(320, maxX));
          return {
            x: 75 + (px - Math.min(minX, 20)) * scale,
            y: Math.max(25, py * scale),
          };
        }
        return { x: px, y: py };
      };

      for (const stroke of sheetStrokes) {
        const rawPts = stroke.points || stroke.pts || [];
        if (rawPts.length === 0) continue;

        const pts = rawPts.map((p: any) => transformPoint(Number(p.x) || 0, Number(p.y) || 0));

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const toolType = (stroke.toolType || stroke.tool || 'PEN').toUpperCase();
        if (toolType === 'HIGHLIGHTER') {
          ctx.globalAlpha = 0.4;
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = (stroke.strokeWidth || stroke.w || 20) * (isMobileScale ? 1.3 : 1.0);
        } else if (toolType === 'ERASER') {
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = (stroke.strokeWidth || stroke.w || 24) * (isMobileScale ? 1.3 : 1.0);
        } else {
          ctx.globalAlpha = 1.0;
          let color = '#0F172A';
          if (stroke.color) {
            if (typeof stroke.color === 'number') {
              const hex = (stroke.color >>> 0).toString(16).padStart(8, '0');
              const r = parseInt(hex.substring(2, 4), 16);
              const g = parseInt(hex.substring(4, 6), 16);
              const b = parseInt(hex.substring(6, 8), 16);
              color = `rgb(${r},${g},${b})`;
            } else if (typeof stroke.color === 'string') {
              color = stroke.color;
            }
          }
          ctx.strokeStyle = color;
          ctx.lineWidth = (stroke.strokeWidth || stroke.w || 3.0) * (isMobileScale ? 1.25 : 1.0);
        }

        // Handle single point (dots on 'i', periods, commas)
        if (pts.length === 1) {
          ctx.beginPath();
          const r = Math.max(1.5, (ctx.lineWidth || 3.0) / 2);
          ctx.arc(pts[0].x, pts[0].y, r, 0, Math.PI * 2);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fill();
          ctx.restore();
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);

        for (let i = 1; i < pts.length; i++) {
          const p0 = pts[i - 1];
          const p1 = pts[i];
          const midX = (p0.x + p1.x) / 2;
          const midY = (p0.y + p1.y) / 2;
          ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
        }

        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
        ctx.restore();
      }
    } else if (sheetTypedText && sheetTypedText.trim().length > 0) {
      // 6. Typeset student typed descriptive response cleanly onto the ruled lines
      ctx.save();
      ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.textBaseline = 'alphabetic';

      const leftMargin = 76;
      const maxWidth = 780;
      const startY = 48; // starts at first ruled line
      let currentY = startY + lineSpacing - 8;

      const paragraphs = sheetTypedText.split('\n');
      for (const para of paragraphs) {
        if (!para.trim()) {
          currentY += lineSpacing;
          continue;
        }

        const words = para.split(' ');
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);

          if (metrics.width > maxWidth && currentLine) {
            ctx.fillText(currentLine, leftMargin, currentY);
            currentLine = word;
            currentY += lineSpacing;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          ctx.fillText(currentLine, leftMargin, currentY);
          currentY += lineSpacing;
        }
      }
      ctx.restore();
    } else {
      // 7. Watermark / Clean Placeholder when no response was recorded
      ctx.save();
      ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('— NO WRITTEN RESPONSE RECORDED FOR THIS QUESTION —', 450, 360);
      ctx.font = '12px sans-serif';
      ctx.fillText('The candidate did not submit handwritten strokes or typed responses.', 450, 390);
      ctx.restore();
    }
  }, [sheetModalOpen, sheetStrokes, sheetTypedText, sheetTotalPages, sheetActiveQ, sheetViewMode]);

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
    setFilterQuestionType('ALL');
    setQuestionSearch('');
    setQuestionSourceWorkflow('BANK');
    setNewStatus('DRAFT');
    setRagFile(null);
    setRagExtractError(null);
    setRagExtractProgress(null);
    setCandidateQuestions([]);
    setSelectedCandidateIndices([]);
    setShowDraftPreview(false);
    let activeCourseId = selectedCourseId;
    if (!activeCourseId) {
      activeCourseId = (courses && courses.length > 0 ? courses[0].id : '') || user?.courseId || user?.assignedCourse?.id || '';
      if (activeCourseId) {
        setSelectedCourseId(activeCourseId);
      }
    }
    try {
      // Fetch approved questions directly for the selected course
      if (activeCourseId) {
        const questions = await api.get(`/courses/${activeCourseId}/questions`);
        setAvailableQuestions(questions || []);
      }
    } catch (err) {
      console.error('Failed to load question bank', err);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleSelectRagFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 25 MB)
    if (file.size > 25 * 1024 * 1024) {
      setRagExtractError(
        `File exceeds maximum size limit of 25 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please upload a smaller document.`,
      );
      setRagFile(null);
      return;
    }

    // Validate file format
    const allowed = ['.pdf', '.txt', '.doc', '.docx'];
    const nameLower = file.name.toLowerCase();
    if (!allowed.some((ext) => nameLower.endsWith(ext))) {
      setRagExtractError('Unsupported file format. Please upload a PDF, TXT, or DOCX document.');
      setRagFile(null);
      return;
    }

    setRagFile(file);
    setRagExtractError(null);
    setRagExtractProgress(null);
  };

  const handleExtractFromDocument = async () => {
    if (!ragFile) return;

    setRagExtracting(true);
    setRagExtractError(null);
    setRagExtractProgress(`Reading ${ragFile.name} (${(ragFile.size / 1024).toFixed(1)} KB)...`);

    try {
      let fileBase64 = '';
      let textContent = '';

      if (ragFile.type === 'text/plain' || ragFile.name.endsWith('.txt')) {
        textContent = await ragFile.text();
      } else {
        setRagExtractProgress(`Encoding ${ragFile.name} for Document AI...`);
        fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(ragFile);
        });
      }

      setRagExtractProgress(
        'Document AI & RAG Pipeline processing: extracting questions, choices, answers & Bloom taxonomy...',
      );

      const response: any = await api.post(
        '/rag/extract-questions',
        {
          fileBase64,
          text: textContent,
          fileName: ragFile.name,
          courseId: user?.courseId || selectedCourseId || undefined,
        },
        { timeout: 90000 } as any,
      );

      if (Array.isArray(response) && response.length > 0) {
        setCandidateQuestions(response);
        // Pre-select all extracted candidate questions by default
        setSelectedCandidateIndices(response.map((_, i) => i));
        const ambiguousCount = response.filter((q) => q.isAmbiguous).length;
        setRagExtractProgress(
          `Extracted ${response.length} candidate questions!${
            ambiguousCount > 0 ? ` (${ambiguousCount} flagged with ambiguous answers for review)` : ''
          }`,
        );

        if (!newTitle.trim()) {
          setNewTitle(`Assessment on ${ragFile.name.replace(/\.[^/.]+$/, '')}`);
        }
        if (!newCode.trim()) {
          setNewCode(`EXAM-${Date.now().toString().slice(-4)}`);
        }
      } else {
        setRagExtractError('No valid questions could be detected in this document. Please check the document format.');
      }
    } catch (err: any) {
      console.error('Error extracting questions:', err);
      const errMsg =
        typeof err?.message === 'string'
          ? err.message
          : Array.isArray(err?.message)
          ? err.message.join('; ')
          : 'Failed to extract questions from uploaded document.';
      setRagExtractError(errMsg);
      setRagExtractProgress(null);
    } finally {
      setRagExtracting(false);
    }
  };

  const handleSetCandidateCorrectOption = (candidateIdx: number, optionIdx: number) => {
    setCandidateQuestions((prev) => {
      const copy = [...prev];
      const targetQ = { ...copy[candidateIdx] };
      targetQ.options = targetQ.options.map((opt: any, idx: number) => ({
        ...opt,
        isCorrect: idx === optionIdx,
      }));
      targetQ.isAmbiguous = false;
      targetQ.explanation = targetQ.explanation?.replace(/\[Ambiguous Answer\]/i, '[Faculty Verified Answer]');
      copy[candidateIdx] = targetQ;
      return copy;
    });
  };

  const toggleCandidateSelection = (candidateIdx: number) => {
    setSelectedCandidateIndices((prev) =>
      prev.includes(candidateIdx) ? prev.filter((i) => i !== candidateIdx) : [...prev, candidateIdx],
    );
  };

  const handleImportCandidatesToAssessment = async () => {
    if (candidateQuestions.length === 0 || selectedCandidateIndices.length === 0) {
      alert('Please select at least one candidate question to import into the assessment.');
      return;
    }

    let targetCourseId =
      selectedCourseId ||
      (courses && courses.length > 0 ? courses[0].id : '') ||
      user?.courseId ||
      user?.assignedCourse?.id ||
      '';

    if (!selectedCourseId && targetCourseId) {
      setSelectedCourseId(targetCourseId);
    }

    setImportingToAssessment(true);
    try {
      const questionsToImport = selectedCandidateIndices.map((idx) => candidateQuestions[idx]);

      const endpoint = targetCourseId
        ? `/rag/courses/${targetCourseId}/import-questions`
        : '/rag/import-questions';

      const res: any = await api.post(endpoint, {
        questions: questionsToImport,
        courseId: targetCourseId || undefined,
      });

      const imported = res?.questions || [];
      if (imported.length > 0) {
        const mapped = imported.map((q: any) => ({
          id: q.id,
          questionText: q.questionText,
          difficulty: q.difficulty || 'MEDIUM',
          bloomLevel: q.bloomLevel || 'APPLY',
          topic: q.topic || { name: q.topic?.name || 'Document AI' },
          options: (q.options || []).map((o: any) => ({
            id: o.id,
            text: o.optionText || o.text,
            isCorrect: o.isCorrect,
            misconception: o.misconception?.title || o.misconception,
          })),
          explanation: q.explanation || 'Extracted via Document AI.',
          sourceType: 'DOCUMENT_AI',
        }));

        // Merge into available questions without duplicates
        setAvailableQuestions((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const newItems = mapped.filter((item: any) => !existingIds.has(item.id));
          return [...newItems, ...prev];
        });

        // Add newly imported question IDs to selectedQuestionIds
        const newIds = mapped.map((item: any) => item.id);
        setSelectedQuestionIds((prev) => Array.from(new Set([...prev, ...newIds])));

        // Update attribution map
        setSourceAttributionMap((prev) => {
          const next = { ...prev };
          newIds.forEach((id: string) => {
            next[id] = 'RAG';
          });
          return next;
        });

        alert(`✓ Added ${newIds.length} Document AI questions to your assessment draft!`);
        // Switch to Question Bank view so faculty can inspect the combined draft
        setQuestionSourceWorkflow('BANK');
      }
    } catch (err: any) {
      console.error('Failed to import candidate questions:', err);
      alert(err.message || 'Failed to import questions to assessment draft.');
    } finally {
      setImportingToAssessment(false);
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
    if (examMode === 'DESCRIPTIVE' && authoredDescriptiveQuestions.length === 0) {
      alert('Please author at least one descriptive question for the examination.');
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
        batch: newBatch,
        rollFilter: newRollFilter,
        durationMinutes: Number(newDuration),
        totalMarks:
          examMode === 'DESCRIPTIVE'
            ? authoredDescriptiveQuestions.reduce((acc, q) => acc + (Number(q.points) || 0), 0)
            : Number(newTotalMarks),
        passingMarks: Number(newPassingMarks),
        examMode,
        status: newStatus,
        randomizeQuestions: newRandomizeQuestions,
        questionIds: (examMode === 'CODING' || examMode === 'DESCRIPTIVE') ? [] : selectedQuestionIds,
        codingProblems: (examMode === 'CODING' || examMode === 'HYBRID') ? authoredCodingProblems : [],
        descriptiveQuestions: examMode === 'DESCRIPTIVE' ? authoredDescriptiveQuestions : [],
      });

      setIsModalOpen(false);
      setNewTitle('');
      setNewCode('');
      setNewBatch('ALL');
      setNewDivision('ALL');
      setNewRollFilter('ALL');
      setAuthoredCodingProblems([]);
      setSelectedQuestionIds([]);
      setRagFile(null);
      setCandidateQuestions([]);
      await loadCourseAssessments(selectedCourseId);
    } catch (err: any) {
      alert(err.message || 'Failed to create assessment');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#1a2540] dark:text-[#e8edf5] flex relative z-10">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Assessment & Examination Studio"
          subtitle="Author formal quizzes, scheduled mid-terms, and evaluate class performance"
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Gleam-Spark Page Intro */}
          <div className="page-intro">
            <div>
              <h1 className="page-title font-display text-5xl sm:text-6xl text-[#1a2540] dark:text-[#f5f0e8] uppercase tracking-tight">
                ASSESSMENT STUDIO
              </h1>
            </div>
            <div className="readiness">
              <p className="mono text-[8px] uppercase tracking-wider text-[#6b7fa3]">EXAM ENGINE</p>
              <strong className="font-display text-4xl text-[#1a2540] dark:text-[#f5f0e8]">
                {assessments.filter((a) => a.status === 'PUBLISHED').length}<span className="font-mono text-sm text-[#e05033]">/{assessments.length}</span>
              </strong>
              <p className="mono text-[8px] text-[#4a6fa5] dark:text-[#6a90c5] uppercase tracking-wider">PUBLISHED ASSESSMENTS</p>
            </div>
          </div>

          {/* Gleam-Spark 4-Column Metric Band */}
          <div className="metrics">
            <div className="metric">
              <div className="metric-top mono"><span>01</span><span className="text-[#e05033]">ACTIVE</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{assessments.length}</div>
              <div className="metric-label mono">TOTAL ASSESSMENTS</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>02</span><span className="text-[#4a6fa5]">COURSES</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{courses.length}</div>
              <div className="metric-label mono">ALLOCATED COURSES</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>03</span><span>SECURITY</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">SECURE</div>
              <div className="metric-label mono">PROCTORED EVALUATION</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>04</span><span className="text-[#4a6fa5]">STATUS</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">ONLINE</div>
              <div className="metric-label mono">ACADEMIC NETWORK</div>
            </div>
          </div>

          {/* Gleam-Spark Priority Band with Create Button and Course Selector */}
          <div className="priority-band">
            <div className="priority-symbol">!</div>
            <div className="priority-content">
              
              <h2 className="font-display text-xl uppercase tracking-wide">CONFIGURE & DISPATCH ASSESSMENTS</h2>
              <p className="text-xs text-[#8ba0c0] font-sans">
                Author formal quizzes, scheduled mid-terms, and evaluate class performance with automated proctoring.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {courses.length > 1 && (
                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    setSelectedCourseId(e.target.value);
                    loadCourseAssessments(e.target.value);
                  }}
                  className="bg-[#1a2540] text-white border border-[rgba(106,144,197,0.3)] text-xs font-mono px-3 py-2 uppercase"
                  style={{ borderRadius: 0 }}
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
                className="action-button bg-[#e05033] hover:bg-[#c93f24] text-white shrink-0"
                style={{ borderRadius: 0 }}
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>CREATE ASSESSMENT</span>
              </button>
            </div>
          </div>

          {/* Assessment Cards */}
          {loading ? (
            <div className="p-16 text-center text-xs font-mono font-semibold text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#e05033]" />
              <span>Loading assessments...</span>
            </div>
          ) : assessments.length === 0 ? (
            <div className="border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] bg-[#faf7f2] dark:bg-[#121b30] p-12 text-center text-slate-500 dark:text-slate-400" style={{ borderRadius: 0 }}>
              <FileText className="w-12 h-12 text-[#4a6fa5] mx-auto mb-3" />
              <p className="text-base font-bold text-slate-900 dark:text-white">No Assessments Created</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Click Create Assessment to launch your first exam.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assessments.map((a) => (
                <div
                  key={a.id}
                  className="panel bg-[var(--surface)] text-[var(--foreground)] border border-[var(--strong-border)] p-6 shadow-xs hover:border-[#4a6fa5] transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Tags row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#4a6fa5]/10 text-[#4a6fa5] dark:text-[#6a90c5] border border-[#4a6fa5]/30">
                          {a.type} • {a.code}
                        </span>
                        {(a.isCodingExam || a.title?.includes('[CODING]') || a.description?.toLowerCase().includes('coding')) && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                            <Terminal className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                            Coding Exam
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                            a.batch && a.batch !== 'ALL'
                              ? 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/30'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <GraduationCap className="w-3 h-3" />
                          {a.batch && a.batch !== 'ALL' ? `Batch '${a.batch}` : 'All Batches'}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
                            a.division === 'CS Div 1' || a.division === 'DIV 1'
                              ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                              : a.division === 'CS Div 2' || a.division === 'DIV 2'
                              ? 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/30'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {a.division === 'CS Div 1' || a.division === 'DIV 1'
                            ? 'CS Div 1'
                            : a.division === 'CS Div 2' || a.division === 'DIV 2'
                            ? 'CS Div 2'
                            : 'Both Divisions (All)'}
                        </span>
                        {a.rollFilter && a.rollFilter !== 'ALL' && (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
                              a.rollFilter === 'ODD'
                                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40'
                                : 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/40'
                            }`}
                          >
                            {a.rollFilter === 'ODD' ? 'Odd IDs Only' : 'Even IDs Only'}
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                          a.status === 'DRAFT'
                            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                            : a.isExpired || a.status === 'COMPLETED'
                            ? 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          a.status === 'DRAFT'
                            ? 'bg-amber-500'
                            : a.isExpired || a.status === 'COMPLETED'
                            ? 'bg-rose-500'
                            : 'bg-emerald-500 animate-pulse'
                        }`} />
                        <span>{a.status === 'DRAFT' ? 'DRAFT' : a.isExpired || a.status === 'COMPLETED' ? 'ENDED' : 'PUBLISHED'}</span>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-display font-bold uppercase tracking-wide text-slate-900 dark:text-white leading-snug">
                        {a.title}
                      </h3>
                      {a.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed font-sans">
                          {a.description}
                        </p>
                      )}
                    </div>

                    {/* Gleam-Spark Technical Metric Tri-Grid */}
                    <div className="grid grid-cols-3 gap-px bg-[var(--border)] border border-[var(--border)]">
                      <div className="bg-[var(--surface-muted)] p-3 text-center">
                        <span className="font-mono text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Duration
                        </span>
                        <strong className="font-display text-xl sm:text-2xl text-slate-900 dark:text-white block mt-0.5">
                          {a.durationMinutes}m
                        </strong>
                        <span className="font-mono text-[9px] text-[#4a6fa5] dark:text-[#6a90c5] block mt-0.5">
                          BUFFER: +5M
                        </span>
                      </div>
                      <div className="bg-[var(--surface-muted)] p-3 text-center">
                        <span className="font-mono text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Total Marks
                        </span>
                        <strong className="font-display text-xl sm:text-2xl text-[#e05033] block mt-0.5">
                          {a.totalMarks} <span className="font-mono text-xs text-slate-500 dark:text-slate-400">PTS</span>
                        </strong>
                        <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          BENCHMARK
                        </span>
                      </div>
                      <div className="bg-[var(--surface-muted)] p-3 text-center">
                        <span className="font-mono text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Questions
                        </span>
                        <strong className="font-display text-xl sm:text-2xl text-slate-900 dark:text-white block mt-0.5">
                          {a.totalQuestions}
                        </strong>
                        <span className="font-mono text-[9px] text-[#4a6fa5] dark:text-[#6a90c5] block mt-0.5">
                          ITEMS
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Assessment Card Action Buttons */}
                  <div className="pt-3 flex items-center gap-2 border-t border-[var(--border)] flex-wrap">
                    {a.status === 'DRAFT' ? (
                      <button
                        type="button"
                        onClick={() => handlePublishAssessment(a)}
                        className="py-1.5 px-3 bg-[#059669] hover:bg-[#047857] text-white text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition shadow-xs"
                        title="Publish assessment now so it reflects immediately in student panels"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Publish Test</span>
                      </button>
                    ) : a.status === 'PUBLISHED' && !a.isExpired ? (
                      <button
                        type="button"
                        onClick={() => handleUnpublishAssessment(a)}
                        className="py-1.5 px-3 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
                        title="Revert to draft (hide from student panels)"
                      >
                        <span>Move to Draft</span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => openEditModal(a)}
                      className="py-1.5 px-3 border border-[var(--border)] bg-[var(--surface-muted)] hover:bg-[#1a2540] hover:text-white text-slate-800 dark:text-slate-200 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
                      title="Edit assessment time limit, title, status and window"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#4a6fa5]" />
                      <span>Edit Test</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openAnalyticsModal(a.id)}
                      className="py-1.5 px-3 border border-[var(--border)] bg-[var(--surface-muted)] hover:bg-[#1a2540] hover:text-white text-slate-800 dark:text-slate-200 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-[#4a6fa5]" />
                      <span>Cohort Analytics</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaderboardModalData({ id: a.id, title: a.title })}
                      className="py-1.5 px-3 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
                      title="View dynamic live ranking leaderboard"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Leaderboard</span>
                    </button>
                    {(a.isCodingExam || a.title?.includes('[CODING]') || a.description?.toLowerCase().includes('coding')) && (
                      <button
                        type="button"
                        onClick={() => handleInspectProblems(a)}
                        className="py-1.5 px-3 border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
                        title="Inspect Coding Problems & Test Cases"
                      >
                        <Code className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>Problem Spec</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => exportDirectCsv(a.id)}
                      className="py-1.5 px-3 border border-[var(--border)] bg-[var(--surface-muted)] hover:bg-[#1a2540] hover:text-white text-slate-800 dark:text-slate-200 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
                      title="Export Student Marks CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="panel bg-[var(--surface)] text-[var(--foreground)] border border-[var(--strong-border)] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-muted)]">
              <div>
                <p className="mono text-[#4a6fa5] dark:text-[#6a90c5] tracking-widest text-[9px] uppercase mb-0.5">
                  ASSESSMENT AUTHORING / WIZARD
                </p>
                <h3 className="font-display text-2xl uppercase tracking-tight text-slate-900 dark:text-white">
                  Create New Course Assessment
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-0.5">
                  Allocate to target student division and select approved questions from question bank
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 border border-[var(--border)] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="p-6 overflow-y-auto space-y-5">
              {/* Assigned Course Header / Selector */}
              <div className="p-3.5 bg-[var(--surface-muted)] border border-[var(--border)] text-xs flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <span className="font-mono text-[9px] font-bold text-[#4a6fa5] dark:text-[#6a90c5] uppercase tracking-wider block">
                    Assigned Teaching Subject
                  </span>
                  {courses.length > 1 ? (
                    <select
                      value={selectedCourseId || (courses[0]?.id ?? '')}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSelectedCourseId(newId);
                        api.get(`/courses/${newId}/questions`).then((q) => setAvailableQuestions(q || [])).catch(() => {});
                      }}
                      className="mt-1 bg-transparent border border-[var(--border)] px-2 py-1 text-sm font-bold text-slate-900 dark:text-white rounded focus:outline-none focus:border-[#4a6fa5]"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                          {c.code} - {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {courses.find((c) => c.id === selectedCourseId)?.code || courses[0]?.code || 'CORE'} - {courses.find((c) => c.id === selectedCourseId)?.name || courses[0]?.name || 'Course'}
                    </span>
                  )}
                </div>
                <span className="font-mono text-[9px] font-bold px-2 py-0.5 uppercase bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                  {courses.length > 1 ? 'Selectable' : 'Fixed For Faculty'}
                </span>
              </div>

              {/* Examination Format & Engine Selector */}
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-[#4a6fa5] dark:text-cyan-400" />
                    Examination Format & Evaluation Engine
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                    Select automated code judge or objective question bank
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Coding Exam Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setExamMode('CODING');
                      if (!newTitle.includes('Coding') && !newTitle.includes('💻')) {
                        setNewTitle(newTitle ? `${newTitle} (Coding)` : 'Data Structures Practical Coding Exam');
                      }
                    }}
                    className={`p-3.5 border text-left transition-all ${
                      examMode === 'CODING'
                        ? 'bg-[var(--surface-muted)] border-2 border-[#e05033] shadow-xs'
                        : 'bg-[var(--surface)] border border-[var(--border)] hover:border-[#4a6fa5]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-display text-sm uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-[#e05033]" />
                        Coding Exam
                      </span>
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                        JUDGE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-snug">
                      Problem statements, sample test cases & hidden check test cases
                    </p>
                  </button>

                  {/* Objective MCQ Option */}
                  <button
                    type="button"
                    onClick={() => setExamMode('OBJECTIVE')}
                    className={`p-3.5 border text-left transition-all ${
                      examMode === 'OBJECTIVE'
                        ? 'bg-[var(--surface-muted)] border-2 border-[#4a6fa5] shadow-xs'
                        : 'bg-[var(--surface)] border border-[var(--border)] hover:border-[#4a6fa5]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-display text-sm uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#4a6fa5]" />
                        Objective MCQ
                      </span>
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30">
                        THEORY
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-snug">
                      Select approved questions from curriculum question bank
                    </p>
                  </button>

                  {/* Hybrid Option */}
                  <button
                    type="button"
                    onClick={() => setExamMode('HYBRID')}
                    className={`p-3.5 border text-left transition-all ${
                      examMode === 'HYBRID'
                        ? 'bg-[var(--surface-muted)] border-2 border-purple-500 shadow-xs'
                        : 'bg-[var(--surface)] border border-[var(--border)] hover:border-[#4a6fa5]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-display text-sm uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        Hybrid Exam
                      </span>
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/30">
                        MIXED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-snug">
                      Both theoretical questions and practical coding problems
                    </p>
                  </button>

                  {/* Descriptive Ink Exam Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setExamMode('DESCRIPTIVE');
                      if (!newTitle.includes('Descriptive') && !newTitle.includes('✍️')) {
                        setNewTitle(newTitle ? `${newTitle} (Descriptive)` : 'Database Systems Descriptive Mid-Term Examination');
                      }
                    }}
                    className={`p-3.5 border text-left transition-all ${
                      examMode === 'DESCRIPTIVE'
                        ? 'bg-[var(--surface-muted)] border-2 border-emerald-500 shadow-xs'
                        : 'bg-[var(--surface)] border border-[var(--border)] hover:border-[#4a6fa5]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-display text-sm uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Edit3 className="w-4 h-4 text-emerald-500" />
                        Descriptive Ink
                      </span>
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                        MANUAL GRADE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-snug">
                      Digital ink tablet answers with custom rubrics and manual faculty grading
                    </p>
                  </button>
                </div>
              </div>

              {/* Title & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Assessment Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={examMode === 'CODING' ? 'e.g. DSA In-Browser Practical Examination' : 'e.g. Trees & BST Mastery Exam'}
                    className="w-full p-2.5 text-xs bg-[var(--surface-muted)] border border-[var(--border)] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#4a6fa5] focus:ring-1 focus:ring-[#4a6fa5] font-sans font-medium"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Assessment Code
                  </label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder={examMode === 'CODING' ? 'e.g. CS301-CODE-LAB-01' : 'e.g. CS301-QUIZ-02'}
                    className="w-full p-2.5 text-xs bg-[var(--surface-muted)] border border-[var(--border)] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#4a6fa5] focus:ring-1 focus:ring-[#4a6fa5] font-sans font-medium"
                  />
                </div>
              </div>

              {/* Target Student Batch Allocation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-[#4a6fa5] dark:text-[#6a90c5]" />
                    Target Student Batch Allocation ({deptBatchConfig.instituteCode} • {deptBatchConfig.departmentName})
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                    Roll Prefix: <strong className="font-mono text-[#4a6fa5] dark:text-[#6a90c5]">{deptBatchConfig.rollPrefix}</strong> • {deptBatchConfig.totalStudents} Department Students
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {deptBatchConfig.batches.map((b) => {
                    const isSelected = newBatch === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setNewBatch(b.id)}
                        className={`p-3 border text-left transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[var(--surface-muted)] border-2 border-[#4a6fa5] shadow-xs'
                            : 'bg-[var(--surface)] border border-[var(--border)] hover:border-[#4a6fa5]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-display text-xs font-bold uppercase text-slate-900 dark:text-white">
                              {b.name}
                            </span>
                            <span
                              className={`font-mono text-[8px] font-bold px-1.5 py-0.5 border ${
                                isSelected
                                  ? 'bg-[#4a6fa5]/20 text-[#4a6fa5] dark:text-[#6a90c5] border-[#4a6fa5]/40'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {b.badge}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 font-semibold mb-1 truncate">
                            {b.rollRange}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-[var(--border)] mt-1 text-[9px]">
                          <span className="text-slate-500 dark:text-slate-400">{b.semesterLabel}</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{b.count} Stud.</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Division Allocation */}
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Users className="w-4 h-4 text-[#4a6fa5]" />
                    Target Section / Division ({deptBatchConfig.rollPrefix})
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                    Reflected directly in assigned students' portals
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Division A */}
                  <button
                    type="button"
                    onClick={() => setNewDivision('DIV 1')}
                    className={`p-3.5 border text-left transition-all ${
                      newDivision === 'DIV 1'
                        ? 'bg-[var(--surface-muted)] border-2 border-amber-500 shadow-xs'
                        : 'bg-[var(--surface)] border border-[var(--border)] hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-display text-xs uppercase text-slate-900 dark:text-white">Division A</span>
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        DIV 1
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-snug">
                      {newBatch === '24'
                        ? `Roll 24${deptBatchConfig.rollPrefix}001 – 24${deptBatchConfig.rollPrefix}025`
                        : newBatch !== 'ALL'
                        ? `Roll ${newBatch}${deptBatchConfig.rollPrefix}001 – ${newBatch}${deptBatchConfig.rollPrefix}015`
                        : `Division A (${deptBatchConfig.rollPrefix} Cohort)`}
                    </p>
                  </button>

                  {/* Division B */}
                  <button
                    type="button"
                    onClick={() => setNewDivision('DIV 2')}
                    className={`p-3.5 border text-left transition-all ${
                      newDivision === 'DIV 2'
                        ? 'bg-[var(--surface-muted)] border-2 border-purple-500 shadow-xs'
                        : 'bg-[var(--surface)] border border-[var(--border)] hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-display text-xs uppercase text-slate-900 dark:text-white">Division B</span>
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/30">
                        DIV 2
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-snug">
                      {newBatch === '24'
                        ? `Roll 24${deptBatchConfig.rollPrefix}026 – 24${deptBatchConfig.rollPrefix}050`
                        : newBatch !== 'ALL'
                        ? `Roll ${newBatch}${deptBatchConfig.rollPrefix}016 – ${newBatch}${deptBatchConfig.rollPrefix}030`
                        : `Division B (${deptBatchConfig.rollPrefix} Cohort)`}
                    </p>
                  </button>

                  {/* Both Divisions */}
                  <button
                    type="button"
                    onClick={() => setNewDivision('ALL')}
                    className={`p-3.5 border text-left transition-all ${
                      newDivision === 'ALL'
                        ? 'bg-[var(--surface-muted)] border-2 border-[#4a6fa5] shadow-xs'
                        : 'bg-[var(--surface)] border border-[var(--border)] hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-display text-xs uppercase text-slate-900 dark:text-white">Both Divisions</span>
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-[#4a6fa5]/10 text-[#4a6fa5] dark:text-[#6a90c5] border border-[#4a6fa5]/30">
                        ALL
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-snug">
                      {newBatch === 'ALL'
                        ? `All 140 ${deptBatchConfig.departmentName} students`
                        : `Entire Batch '${newBatch} (${deptBatchConfig.batches.find((b) => b.id === newBatch)?.count || 0} students)`}
                    </p>
                  </button>
                </div>
              </div>

              {/* Optional Odd / Even Roll ID Filter */}
              <div className="p-3.5 bg-[var(--surface-muted)] border border-[var(--border)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4a6fa5] inline-block"></span>
                    Student ID / Roll Allocation (Odd / Even)
                  </label>
                  <span className="text-[10px] font-mono font-bold text-[#4a6fa5] dark:text-[#6a90c5]">
                    {newRollFilter === 'ALL'
                      ? 'All Student IDs Eligible'
                      : newRollFilter === 'ODD'
                      ? 'Odd IDs Only (...001, ...003)'
                      : 'Even IDs Only (...002, ...004)'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewRollFilter('ALL')}
                    className={`py-2 px-3 border text-center transition-all ${
                      newRollFilter === 'ALL'
                        ? 'bg-[var(--surface)] border-2 border-[#4a6fa5] shadow-xs'
                        : 'bg-[var(--surface)] border border-[var(--border)] hover:border-slate-400 opacity-70'
                    }`}
                  >
                    <div className="font-display text-xs uppercase text-slate-900 dark:text-white font-bold">
                      All Roll IDs
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      Both Odd & Even
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRollFilter('ODD')}
                    className={`py-2 px-3 border text-center transition-all ${
                      newRollFilter === 'ODD'
                        ? 'bg-amber-500/15 border-2 border-amber-500 shadow-xs text-amber-900 dark:text-amber-200'
                        : 'bg-[var(--surface)] border border-[var(--border)] hover:border-slate-400 opacity-70'
                    }`}
                  >
                    <div className="font-display text-xs uppercase text-slate-900 dark:text-white font-bold flex items-center justify-center gap-1">
                      <span>Odd IDs Only</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">ODD</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      Ending in 1, 3, 5, 7, 9
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRollFilter('EVEN')}
                    className={`py-2 px-3 border text-center transition-all ${
                      newRollFilter === 'EVEN'
                        ? 'bg-purple-500/15 border-2 border-purple-500 shadow-xs text-purple-900 dark:text-purple-200'
                        : 'bg-[var(--surface)] border border-[var(--border)] hover:border-slate-400 opacity-70'
                    }`}
                  >
                    <div className="font-display text-xs uppercase text-slate-900 dark:text-white font-bold flex items-center justify-center gap-1">
                      <span>Even IDs Only</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold">EVEN</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      Ending in 0, 2, 4, 6, 8
                    </div>
                  </button>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                  {newRollFilter === 'ODD'
                    ? `🎯 Only students with Odd enrollment numbers in ${newDivision === 'DIV 1' ? 'Division A (DIV 1)' : newDivision === 'DIV 2' ? 'Division B (DIV 2)' : 'All Divisions'} will see and be allowed to attempt this test.`
                    : newRollFilter === 'EVEN'
                    ? `🎯 Only students with Even enrollment numbers in ${newDivision === 'DIV 1' ? 'Division A (DIV 1)' : newDivision === 'DIV 2' ? 'Division B (DIV 2)' : 'All Divisions'} will see and be allowed to attempt this test.`
                    : `ℹ️ All students in ${newDivision === 'DIV 1' ? 'Division A (DIV 1)' : newDivision === 'DIV 2' ? 'Division B (DIV 2)' : 'All Divisions'} can view and attempt this test.`}
                </p>
              </div>

              {/* Assessment Type, Duration, Passing */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[var(--surface-muted)] border border-[var(--border)] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#4a6fa5]"
                  >
                    <option value="QUIZ">Quiz / Lab Quiz</option>
                    <option value="UNIT_TEST">Unit Test</option>
                    <option value="MID_TERM">Mid-Term Practical</option>
                    <option value="FINAL_EXAM">Final Exam</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Duration (Min)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full p-2.5 text-xs bg-[var(--surface-muted)] border border-[var(--border)] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#4a6fa5]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Passing %</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={newPassingMarks}
                    onChange={(e) => setNewPassingMarks(Number(e.target.value))}
                    className="w-full p-2.5 text-xs bg-[var(--surface-muted)] border border-[var(--border)] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#4a6fa5]"
                  />
                </div>
              </div>

              {/* Anti-Cheating Question & Option Jumbling Setting */}
              <div className="p-3.5 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-display text-xs uppercase tracking-wider text-slate-900 dark:text-white font-bold">
                      Anti-Cheating: Randomize Question &amp; Option Order
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-500/30">
                      ANTI-CHEAT ON
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRandomizeQuestions}
                      onChange={(e) => setNewRandomizeQuestions(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                  Questions (Objective, Coding, and Hybrid) and MCQ options are jumbled into unique deterministic sequences for each student. Two students sitting adjacent to each other will never see questions in the same order.
                </p>
              </div>

              {/* SECTION: Coding Problem Authoring & Management (For CODING and HYBRID modes) */}
              {(examMode === 'CODING' || examMode === 'HYBRID') && (
                <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface-muted)] p-4 border border-[var(--border)]">
                    <div>
                      <div className="flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-[#e05033]" />
                        <h4 className="font-display text-sm uppercase text-slate-900 dark:text-white">Coding Examination Problems & Code Judge</h4>
                        <span className="font-mono text-[9px] font-bold px-2 py-0.5 bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                          {authoredCodingProblems.length} Added
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-1">
                        Add problem statements, sample test cases (visible to student), and evaluation test cases to check (hidden).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openAuthorModal()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e05033] hover:bg-[#c93f24] text-white text-xs font-mono font-bold uppercase tracking-wider transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Author Problem</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenBankModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-slate-800 dark:text-slate-200 text-xs font-mono font-bold uppercase tracking-wider transition"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#4a6fa5]" />
                        <span>From Problem Bank</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Authored Coding Problems */}
                  {authoredCodingProblems.length === 0 ? (
                    <div className="border border-dashed border-[var(--border)] p-8 text-center bg-[var(--surface-muted)]">
                      <Code className="w-10 h-10 text-[#4a6fa5]/60 mx-auto mb-2.5 animate-pulse" />
                      <p className="font-display text-sm uppercase text-slate-900 dark:text-white">No Coding Problems Added Yet</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-1 max-w-md mx-auto">
                        Click <strong className="text-[#e05033]">Author Problem</strong> to compose a problem statement, sample test cases, and hidden check cases, or select from the pre-seeded DSA bank.
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => openAuthorModal()}
                          className="px-3.5 py-1.5 bg-[#e05033] hover:bg-[#c93f24] text-white font-mono text-xs font-bold uppercase tracking-wider transition"
                        >
                          + Author Problem
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenBankModal}
                          className="px-3.5 py-1.5 border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-slate-800 dark:text-slate-200 font-mono text-xs font-bold uppercase tracking-wider transition"
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
                          className="p-4 border border-[var(--border)] bg-[var(--surface-muted)] hover:border-[#4a6fa5] transition space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="w-5 h-5 bg-[#1a2540] dark:bg-[#4a6fa5] text-white text-[11px] font-mono font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{prob.title}</h5>
                                <span
                                  className={`font-mono text-[9px] font-bold px-2 py-0.5 uppercase border ${
                                    prob.difficulty === 'EASY'
                                      ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                                      : prob.difficulty === 'HARD'
                                      ? 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30'
                                      : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  {prob.difficulty}
                                </span>
                                {prob.tags && (
                                  <span className="font-mono text-[9px] text-slate-600 dark:text-slate-400 bg-[var(--surface)] px-2 py-0.5 border border-[var(--border)]">
                                    {prob.tags}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans line-clamp-2 leading-relaxed pl-7">
                                {prob.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => openAuthorModal(idx)}
                                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                                title="Edit Problem"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveAuthoredProblem(idx)}
                                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                                title="Remove Problem"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Testcase Badges */}
                          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)] pl-7 text-[11px] flex-wrap">
                            <span className="font-mono text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5">
                              <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>{prob.sampleTestCases?.length || 0} Sample Test Cases (Visible)</span>
                            </span>
                            <span className="font-mono text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30 font-bold flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>{prob.testCasesToCheck?.length || 0} Check Test Cases (Hidden Judge)</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: Descriptive Questions Authoring & Rubric (For DESCRIPTIVE mode) */}
              {examMode === 'DESCRIPTIVE' && (
                <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface-muted)] p-4 border border-[var(--border)]">
                    <div>
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-emerald-500" />
                        <h4 className="font-display text-sm uppercase text-slate-900 dark:text-white">Descriptive Examination Questions & Evaluation Rubrics</h4>
                        <span className="font-mono text-[9px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                          {authoredDescriptiveQuestions.length} Questions • {authoredDescriptiveQuestions.reduce((acc, q) => acc + (q.points || 0), 0)} Total Marks
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-1">
                        Students write descriptive answers on mobile companion canvas in real-time. Submissions require manual faculty grading.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newQNum = authoredDescriptiveQuestions.length + 1;
                        setAuthoredDescriptiveQuestions([
                          ...authoredDescriptiveQuestions,
                          {
                            id: String(newQNum),
                            title: `Question ${newQNum}: Custom Descriptive Problem`,
                            prompt: 'Describe the core concept, provide system diagrams, and analyze constraints.',
                            rubric: 'Conceptual Definition (3M) • Architecture Diagram (4M) • Practical Application (3M)',
                            points: 10,
                          },
                        ]);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider transition shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Question</span>
                    </button>
                  </div>

                  {/* List of Descriptive Questions */}
                  <div className="space-y-3">
                    {authoredDescriptiveQuestions.map((q, idx) => (
                      <div key={idx} className="p-4 border border-[var(--border)] bg-[var(--surface)] space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-display text-xs font-bold uppercase text-slate-900 dark:text-white">
                              Question #{idx + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <label className="font-mono text-[10px] text-slate-500 font-bold uppercase">Marks:</label>
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={q.points}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setAuthoredDescriptiveQuestions((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, points: val } : item))
                                  );
                                }}
                                className="w-16 p-1 text-xs font-mono font-bold text-center bg-[var(--surface-muted)] border border-[var(--border)] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            {authoredDescriptiveQuestions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAuthoredDescriptiveQuestions((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded transition"
                                title="Remove question"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title input */}
                        <div>
                          <label className="block font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Question Title
                          </label>
                          <input
                            type="text"
                            value={q.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAuthoredDescriptiveQuestions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, title: val } : item))
                              );
                            }}
                            className="w-full p-2 text-xs bg-[var(--surface-muted)] border border-[var(--border)] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
                            placeholder="e.g. Question 1: Explain ACID Properties in DBMS"
                          />
                        </div>

                        {/* Prompt textarea */}
                        <div>
                          <label className="block font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Question Prompt (Displayed to Student)
                          </label>
                          <textarea
                            rows={3}
                            value={q.prompt}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAuthoredDescriptiveQuestions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, prompt: val } : item))
                              );
                            }}
                            className="w-full p-2.5 text-xs bg-[var(--surface-muted)] border border-[var(--border)] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
                            placeholder="Type the comprehensive theoretical prompt or problem statement..."
                          />
                        </div>

                        {/* Rubric input */}
                        <div>
                          <label className="block font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <Sparkles className="w-3 h-3" />
                              Evaluation Rubric / Marks Breakdown (Displayed during Manual Grading)
                            </span>
                          </label>
                          <input
                            type="text"
                            value={q.rubric}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAuthoredDescriptiveQuestions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, rubric: val } : item))
                              );
                            }}
                            className="w-full p-2 text-xs bg-[var(--surface-muted)] border border-[var(--border)] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500"
                            placeholder="e.g. Concept (3M) • Architecture diagram (3M) • Proof & Analysis (4M)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: Objective MCQ Selection & Document AI / RAG Engine (For OBJECTIVE and HYBRID modes) */}
              {(examMode === 'OBJECTIVE' || examMode === 'HYBRID') && (
                <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                  {/* Workflow Mode Selector Header */}
                  <div className="panel bg-[var(--surface)] border border-[var(--border)] p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-5 h-5 text-[#4a6fa5]" />
                          <h4 className="font-display text-sm uppercase text-slate-900 dark:text-white">Objective Question Composition Engine</h4>
                          <span className="font-mono text-[9px] font-bold px-2 py-0.5 bg-[#4a6fa5]/10 text-[#4a6fa5] dark:text-[#6a90c5] border border-[#4a6fa5]/30">
                            {selectedQuestionIds.length} in Draft
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-0.5">
                          Choose how to compose questions: extract grounded candidate questions from course documents or browse the existing repository.
                        </p>
                      </div>

                      {/* Source Toggle Pills */}
                      <div className="flex items-center p-0.5 bg-[var(--surface-muted)] border border-[var(--border)] shrink-0">
                        <button
                          type="button"
                          onClick={() => setQuestionSourceWorkflow('DOCUMENT')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition ${
                            questionSourceWorkflow === 'DOCUMENT'
                              ? 'bg-[#1a2540] dark:bg-[#4a6fa5] text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Document (RAG)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestionSourceWorkflow('BANK')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition ${
                            questionSourceWorkflow === 'BANK'
                              ? 'bg-[#1a2540] dark:bg-[#4a6fa5] text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Select from Question Bank</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Source Explanatory Banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div
                        onClick={() => setQuestionSourceWorkflow('DOCUMENT')}
                        className={`p-3 border cursor-pointer transition ${
                          questionSourceWorkflow === 'DOCUMENT'
                            ? 'bg-[var(--surface-muted)] border-2 border-[#4a6fa5]'
                            : 'bg-[var(--surface)] border border-[var(--border)] hover:border-slate-400'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                          <Sparkles className="w-3.5 h-3.5 text-[#4a6fa5]" />
                          <span>Option A: Document AI & RAG Extraction</span>
                        </div>
                        <p className="mt-1 text-slate-600 dark:text-slate-400 font-sans leading-snug">
                          Upload syllabus notes, question banks, or Viva PDFs up to 25 MB. Review candidate questions and import them directly.
                        </p>
                      </div>

                      <div
                        onClick={() => setQuestionSourceWorkflow('BANK')}
                        className={`p-3 border cursor-pointer transition ${
                          questionSourceWorkflow === 'BANK'
                            ? 'bg-[var(--surface-muted)] border-2 border-[#4a6fa5]'
                            : 'bg-[var(--surface)] border border-[var(--border)] hover:border-slate-400'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                          <Layers className="w-3.5 h-3.5 text-[#4a6fa5]" />
                          <span>Option B: Course Question Bank</span>
                        </div>
                        <p className="mt-1 text-slate-600 dark:text-slate-400 font-sans leading-snug">
                          Select from previously approved questions for this course with topic, difficulty, and type filtering.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* WORKFLOW VIEW 1: Document AI & RAG Upload and Candidate Review */}
                  {questionSourceWorkflow === 'DOCUMENT' && (
                    <div className="space-y-3 p-4 bg-[var(--surface-muted)] border border-[var(--border)]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
                        <div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Upload className="w-4 h-4 text-[#4a6fa5]" />
                            <span>Document AI Question Extractor & RAG Ingestion</span>
                          </h5>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                            Upload a course document (PDF, TXT, DOCX up to 25 MB) to parse candidate questions grounded in the content.
                          </span>
                        </div>
                        {ragFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setRagFile(null);
                              setRagExtractError(null);
                              setRagExtractProgress(null);
                              setCandidateQuestions([]);
                              setSelectedCandidateIndices([]);
                            }}
                            className="text-[11px] font-mono text-slate-600 dark:text-slate-400 hover:text-rose-500 flex items-center gap-1 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Clear File</span>
                          </button>
                        )}
                      </div>

                      {/* File Dropzone / Picker */}
                      {!ragFile ? (
                        <div className="relative border-2 border-dashed border-[var(--border)] hover:border-[#4a6fa5] p-6 text-center bg-[var(--surface)] transition group cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain"
                            onChange={handleSelectRagFile}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <FileUp className="w-9 h-9 text-[#4a6fa5] group-hover:scale-105 mx-auto mb-2 transition" />
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Click or drag and drop your course PDF or question document
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-sans">
                            Supports <strong className="text-[#4a6fa5]">PDF, TXT, DOCX</strong> files up to <strong className="text-[#4a6fa5]">25 MB</strong>
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[var(--surface)] border border-[var(--border)]">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2.5 bg-[#4a6fa5]/10 text-[#4a6fa5] border border-[#4a6fa5]/30 shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{ragFile.name}</p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                                {ragFile.size > 1024 * 1024
                                  ? `${(ragFile.size / (1024 * 1024)).toFixed(2)} MB`
                                  : `${(ragFile.size / 1024).toFixed(1)} KB`} • {ragFile.type || 'Document'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={handleExtractFromDocument}
                              disabled={ragExtracting}
                              className="px-4 py-2 bg-[#4a6fa5] hover:bg-[#3d5d8a] text-white font-mono text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {ragExtracting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Extracting...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Extract Candidate Questions</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Status / Error feedback */}
                      {ragExtractError && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 font-mono">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                          <span>{ragExtractError}</span>
                        </div>
                      )}

                      {ragExtractProgress && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2 font-mono">
                          {ragExtracting ? (
                            <Loader2 className="w-4 h-4 shrink-0 animate-spin text-blue-500" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                          )}
                          <span>{ragExtractProgress}</span>
                        </div>
                      )}

                      {/* Candidate Questions Review List */}
                      {candidateQuestions.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[var(--surface)] border border-[var(--border)]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                                Candidate Questions ({candidateQuestions.length})
                              </span>
                              <span className="font-mono px-2 py-0.5 text-[10px] font-bold bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                                {selectedCandidateIndices.length} Selected
                              </span>
                              {candidateQuestions.some((q) => q.isAmbiguous) && (
                                <button
                                  type="button"
                                  onClick={() => setCandidateOnlyAmbiguous((prev) => !prev)}
                                  className={`px-2 py-0.5 text-[10px] font-mono font-bold border transition ${
                                    candidateOnlyAmbiguous
                                      ? 'bg-amber-500 text-white border-amber-500'
                                      : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  ⚠️ {candidateQuestions.filter((q) => q.isAmbiguous).length} Ambiguous Keys
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedCandidateIndices(candidateQuestions.map((_, i) => i))}
                                className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase text-[#4a6fa5] hover:underline transition"
                              >
                                Select All ({candidateQuestions.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedCandidateIndices([])}
                                className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                              >
                                Deselect All
                              </button>
                              <button
                                type="button"
                                onClick={handleImportCandidatesToAssessment}
                                disabled={importingToAssessment || selectedCandidateIndices.length === 0}
                                className="px-3.5 py-1.5 bg-[#059669] hover:bg-[#047857] text-white font-mono text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {importingToAssessment ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                                <span>Add {selectedCandidateIndices.length} to Draft</span>
                              </button>
                            </div>
                          </div>

                          {/* Candidate List Scroll */}
                          <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                            {candidateQuestions
                              .map((q, candidateIdx) => ({ q, candidateIdx }))
                              .filter(({ q }) => (candidateOnlyAmbiguous ? q.isAmbiguous : true))
                              .map(({ q, candidateIdx }) => {
                                const isSelected = selectedCandidateIndices.includes(candidateIdx);

                                return (
                                  <div
                                    key={candidateIdx}
                                    className={`p-3.5 border transition-all space-y-2.5 ${
                                      isSelected
                                        ? 'bg-[var(--surface-muted)] border-2 border-[#4a6fa5]'
                                        : 'bg-[var(--surface)] border border-[var(--border)] hover:border-slate-400'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[#4a6fa5]/10 text-[#4a6fa5] dark:text-[#6a90c5] border border-[#4a6fa5]/30">
                                            #{candidateIdx + 1}
                                          </span>
                                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                            {q.topic || 'Document Concepts'}
                                          </span>
                                          <span
                                            className={`font-mono text-[9px] font-bold px-2 py-0.5 uppercase border ${
                                              q.difficulty === 'EASY'
                                                ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                                                : q.difficulty === 'HARD'
                                                ? 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30'
                                                : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
                                            }`}
                                          >
                                            {q.difficulty || 'MEDIUM'}
                                          </span>
                                          <span className="font-mono text-[9px] font-bold px-2 py-0.5 uppercase bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/30">
                                            {q.bloomLevel || 'APPLY'}
                                          </span>
                                        </div>

                                        <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed font-sans">
                                          {q.questionText}
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => toggleCandidateSelection(candidateIdx)}
                                        className={`w-5 h-5 flex items-center justify-center border-2 transition shrink-0 ${
                                          isSelected
                                            ? 'bg-[#4a6fa5] border-[#4a6fa5] text-white shadow-xs'
                                            : 'border-slate-400 bg-transparent hover:border-[#4a6fa5]'
                                        }`}
                                      >
                                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                      </button>
                                    </div>

                                    {/* Ambiguity Alert Notice if answer was flagged */}
                                    {q.isAmbiguous && (
                                      <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-mono flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                        <span>
                                          Ambiguous source key: click any option below to confirm the intended correct answer.
                                        </span>
                                      </div>
                                    )}

                                    {/* 4 Options Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                      {(q.options || []).map((opt: any, optIdx: number) => {
                                        const letter = String.fromCharCode(65 + optIdx);
                                        return (
                                          <div
                                            key={optIdx}
                                            onClick={() => handleSetCandidateCorrectOption(candidateIdx, optIdx)}
                                            className={`p-2 border text-left cursor-pointer transition flex items-start gap-2 ${
                                              opt.isCorrect
                                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                                                : 'bg-[var(--surface)] border-[var(--border)] hover:border-slate-400 text-slate-800 dark:text-slate-200'
                                            }`}
                                          >
                                            <span
                                              className={`w-4 h-4 text-[10px] font-mono font-black flex items-center justify-center shrink-0 ${
                                                opt.isCorrect
                                                  ? 'bg-emerald-600 text-white'
                                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                              }`}
                                            >
                                              {letter}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                              <p className="text-[11px] leading-tight break-words font-sans">{opt.text}</p>
                                              {opt.isCorrect && (
                                                <span className="font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide block mt-0.5">
                                                  ✓ Correct Answer
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {q.explanation && (
                                      <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-[var(--surface-muted)] p-2 border border-[var(--border)] leading-snug font-sans">
                                        <strong className="text-slate-800 dark:text-slate-200">Explanation:</strong> {q.explanation}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* WORKFLOW VIEW 2: Select from Existing Course Question Bank */}
                  {questionSourceWorkflow === 'BANK' && (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <label className="block font-display text-sm uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-[#4a6fa5]" />
                            <span>Course Question Bank Repository</span>
                          </label>
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-sans">
                            Approved curriculum questions for {courses.find((c) => c.id === selectedCourseId)?.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-[#4a6fa5]/10 border border-[#4a6fa5]/30 text-[#4a6fa5] dark:text-[#6a90c5]">
                            {selectedQuestionIds.length} Selected
                          </span>
                          <button
                            type="button"
                            onClick={selectAllFiltered}
                            className="px-2.5 py-1 text-xs font-mono font-bold uppercase text-[#4a6fa5] hover:underline transition"
                          >
                            Select All Filtered
                          </button>
                          <button
                            type="button"
                            onClick={deselectAllFiltered}
                            className="px-2.5 py-1 text-xs font-mono font-bold uppercase text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                          >
                            Deselect
                          </button>
                        </div>
                      </div>

                      {/* Filters Row: Topic, Search, Difficulty */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-[var(--surface-muted)] p-3 border border-[var(--border)]">
                        {/* Topic Filter */}
                        <div className="sm:col-span-5">
                          <select
                            value={filterTopic}
                            onChange={(e) => setFilterTopic(e.target.value)}
                            className="w-full p-2 text-xs bg-[var(--surface)] border border-[var(--border)] text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-[#4a6fa5]"
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
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={questionSearch}
                            onChange={(e) => setQuestionSearch(e.target.value)}
                            placeholder="Search questions..."
                            className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--surface)] border border-[var(--border)] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#4a6fa5]"
                          />
                        </div>

                        {/* Difficulty Filter */}
                        <div className="sm:col-span-3">
                          <select
                            value={filterDifficulty}
                            onChange={(e) => setFilterDifficulty(e.target.value)}
                            className="w-full p-2 text-xs bg-[var(--surface)] border border-[var(--border)] text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-[#4a6fa5]"
                          >
                            <option value="ALL">All Levels</option>
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                          </select>
                        </div>
                      </div>

                      {/* Question List */}
                      <div className="max-h-64 overflow-y-auto space-y-2 border border-[var(--border)] p-2.5 bg-[var(--surface)]">
                        {questionsLoading ? (
                          <div className="p-10 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-[#4a6fa5]" />
                            <span>Loading approved questions...</span>
                          </div>
                        ) : filteredQuestions.length === 0 ? (
                          <div className="p-10 text-center text-xs font-mono text-slate-500">
                            No questions found matching the selected criteria.
                          </div>
                        ) : (
                          filteredQuestions.map((q) => {
                            const isSelected = selectedQuestionIds.includes(q.id);
                            const isRAG = sourceAttributionMap[q.id] === 'RAG' || q.sourceType === 'DOCUMENT_AI';

                            return (
                              <div
                                key={q.id}
                                className={`border transition-all overflow-hidden ${
                                  isSelected
                                    ? 'bg-[var(--surface-muted)] border-2 border-[#4a6fa5] shadow-xs'
                                    : 'bg-[var(--surface)] border border-[var(--border)] hover:border-slate-400'
                                }`}
                              >
                                <div
                                  onClick={() => toggleQuestionSelection(q.id)}
                                  className="p-3.5 cursor-pointer flex items-start justify-between gap-3"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                      {isRAG && (
                                        <span className="font-mono text-[9px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/30">
                                          📄 Document AI
                                        </span>
                                      )}
                                      <span className="font-mono text-[9px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                        {q.topic?.name || 'General'}
                                      </span>
                                      <span
                                        className={`font-mono text-[9px] font-bold px-2 py-0.5 uppercase border ${
                                          q.difficulty === 'EASY'
                                            ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                                            : q.difficulty === 'HARD'
                                            ? 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30'
                                            : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
                                        }`}
                                      >
                                        {q.difficulty}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-900 dark:text-white leading-relaxed font-sans font-medium">
                                      {q.questionText}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                                    <div
                                      className={`w-5 h-5 flex items-center justify-center border-2 transition ${
                                        isSelected
                                          ? 'bg-[#4a6fa5] border-[#4a6fa5] text-white shadow-xs'
                                          : 'border-slate-400 bg-transparent hover:border-[#4a6fa5]'
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

                  {/* UNIFIED DRAFT INSPECTION DRAWER: Displays combined questions from both sources */}
                  {selectedQuestionIds.length > 0 && (
                    <div className="p-3.5 bg-[var(--surface-muted)] border border-[var(--border)] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                            Current Assessment Draft: {selectedQuestionIds.length} Questions Selected
                          </span>
                          <span className="font-mono text-[10px] text-[#4a6fa5] dark:text-[#6a90c5] bg-[#4a6fa5]/10 px-2 py-0.5 border border-[#4a6fa5]/30">
                            ~{(Number(newTotalMarks) / selectedQuestionIds.length).toFixed(1)} marks each ({newTotalMarks} marks total)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowDraftPreview((prev) => !prev)}
                          className="text-xs font-mono font-bold uppercase text-[#4a6fa5] hover:underline transition"
                        >
                          {showDraftPreview ? 'Hide Draft Preview' : 'Review Drafted Questions'}
                        </button>
                      </div>

                      {showDraftPreview && (
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pt-2 border-t border-[var(--border)]">
                          {selectedQuestionIds.map((qId, orderIdx) => {
                            const foundQ = availableQuestions.find((item) => item.id === qId);
                            if (!foundQ) return null;
                            const isRag = sourceAttributionMap[qId] === 'RAG' || foundQ.sourceType === 'DOCUMENT_AI';

                            return (
                              <div
                                key={qId}
                                className="flex items-center justify-between gap-2 p-2 bg-[var(--surface)] border border-[var(--border)] text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {orderIdx + 1}
                                  </span>
                                  {isRag && (
                                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/30 shrink-0">
                                      RAG
                                    </span>
                                  )}
                                  <span className="text-slate-900 dark:text-white truncate font-medium font-sans">{foundQ.questionText}</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleQuestionSelection(qId)}
                                  className="text-slate-500 hover:text-rose-500 p-1 transition shrink-0"
                                  title="Remove from draft"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons & Publish Status Selection */}
              <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    Target: <strong className="text-slate-900 dark:text-white font-bold">{newDivision === 'DIV 1' ? 'Division A' : newDivision === 'DIV 2' ? 'Division B' : 'All Divisions'}</strong>{newRollFilter !== 'ALL' && <strong className="text-amber-700 dark:text-amber-300 font-bold ml-1">({newRollFilter === 'ODD' ? 'Odd IDs Only' : 'Even IDs Only'})</strong>} • {examMode === 'CODING' ? (
                      <strong className="text-[#e05033] font-bold">{authoredCodingProblems.length} Problems</strong>
                    ) : examMode === 'DESCRIPTIVE' ? (
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{authoredDescriptiveQuestions.length} Descriptive Questions ({authoredDescriptiveQuestions.reduce((acc, q) => acc + (Number(q.points) || 0), 0)} Marks)</strong>
                    ) : examMode === 'HYBRID' ? (
                      <strong className="text-purple-600 dark:text-purple-400 font-bold">{selectedQuestionIds.length} MCQs + {authoredCodingProblems.length} Problems</strong>
                    ) : (
                      <strong className="text-[#4a6fa5] font-bold">{selectedQuestionIds.length} MCQs</strong>
                    )}
                  </span>

                  {/* Draft vs Published Selector */}
                  <div className="flex items-center p-0.5 bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-[10px] font-bold uppercase">
                    <button
                      type="button"
                      onClick={() => setNewStatus('DRAFT')}
                      className={`px-3 py-1 transition ${
                        newStatus === 'DRAFT'
                          ? 'bg-[#1a2540] dark:bg-[#4a6fa5] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Draft Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewStatus('PUBLISHED')}
                      className={`px-3 py-1 transition ${
                        newStatus === 'PUBLISHED'
                          ? 'bg-[#059669] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Publish Now
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-slate-800 dark:text-slate-200 font-mono text-xs font-bold uppercase tracking-wider transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      creating ||
                      (examMode === 'CODING'
                        ? authoredCodingProblems.length === 0
                        : examMode === 'DESCRIPTIVE'
                        ? authoredDescriptiveQuestions.length === 0
                        : examMode === 'HYBRID'
                        ? selectedQuestionIds.length === 0 && authoredCodingProblems.length === 0
                        : selectedQuestionIds.length === 0)
                    }
                    className="action-button bg-[#e05033] hover:bg-[#c93f24] text-white font-mono text-xs font-bold uppercase tracking-wider px-6 py-2 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{newStatus === 'DRAFT' ? 'Save Assessment Draft' : 'Publish Assessment'}</span>
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
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Problem Title *</label>
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
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Difficulty</label>
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
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Tags / Topic</label>
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
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
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
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Constraints</label>
                  <textarea
                    rows={3}
                    value={cpConstraints}
                    onChange={(e) => setCpConstraints(e.target.value)}
                    placeholder="• 1 <= nums.length <= 10^5&#10;• -10^4 <= nums[i] <= 10^4&#10;• Time Limit: 2000ms"
                    className="w-full p-3 text-xs bg-[#1E293B] border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Hints (Optional)</label>
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
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
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
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
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
                {inspectAssessment.examMode === 'DESCRIPTIVE' || inspectAssessment.questions?.some((q: any) => q.question?.type === 'DESCRIPTIVE' || q.question?.type === 'SHORT_ANSWER' || !q.question?.options?.length)
                  ? 'This assessment is configured with descriptive problems. Candidates submit answers via handwritten digital companion strokes or typed submissions for manual faculty grading.'
                  : 'This assessment is configured with the CLIAS Automated In-Browser Code Judge. Students will write code directly in the browser editor and evaluate against sample cases before submitting for final automated grading.'}
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

                        {(!parsedMeta?.sampleTestCases || parsedMeta.sampleTestCases.length === 0) && aq.question?.explanation && (
                          <div className="p-3.5 bg-[#0F172A] rounded-xl border border-emerald-500/30 text-xs space-y-1">
                            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                              Descriptive Model Solution & Grading Rubric:
                            </span>
                            <div className="text-slate-200 font-sans leading-relaxed whitespace-pre-wrap">
                              {aq.question.explanation}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#faf7f2] dark:bg-[#0c1220] border border-[rgba(74,111,165,0.3)] dark:border-[rgba(106,144,197,0.25)] text-[#1a2540] dark:text-[#e8edf5] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[rgba(74,111,165,0.22)] dark:border-[rgba(106,144,197,0.2)] bg-[#ede8df] dark:bg-[#121b30] flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#4a6fa5]/15 text-[#4a6fa5] dark:text-[#6a90c5] border border-[#4a6fa5]/30">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-mono text-[#4a6fa5] dark:text-[#6a90c5] tracking-widest text-[9px] uppercase font-bold mb-0.5">
                    COHORT PERFORMANCE &amp; MARKS
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-2xl uppercase tracking-tight text-[#1a2540] dark:text-white">
                      Cohort Attempt Analytics &amp; Marks
                    </h3>
                    {activeAnalytics && (
                      <span className="px-2.5 py-0.5 font-mono text-xs font-bold bg-[#faf7f2] dark:bg-[#1a2540] text-[#e05033] dark:text-[#e8604a] border border-[#e05033]/30">
                        {activeAnalytics.code}
                      </span>
                    )}
                  </div>
                  {activeAnalytics ? (
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-sans mt-0.5 flex-wrap">
                      <FileText className="w-3.5 h-3.5 text-[#4a6fa5] shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {activeAnalytics.title.replace(/^[^\w\s]+/, '').trim() || activeAnalytics.title}
                      </span>
                      {activeAnalytics.courseCode && (
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          ({activeAnalytics.courseCode} - {activeAnalytics.courseName})
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                      Loading cohort performance metrics...
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {activeAnalytics && (
                  <button
                    type="button"
                    onClick={() =>
                      setLeaderboardModalData({
                        id: activeAnalytics.assessmentId,
                        title: activeAnalytics.title,
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-mono text-xs font-bold uppercase tracking-wider transition shadow-2xs"
                    title="Open full dynamic live ranking leaderboard"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Live Leaderboard</span>
                  </button>
                )}
                {activeAnalytics && activeAnalytics.submissions?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => exportMarksCsv(activeAnalytics)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#4a6fa5] hover:bg-[#3b5d8f] text-white border border-[#4a6fa5] font-mono text-xs font-bold uppercase tracking-wider transition shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Marks (.CSV)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAnalysisModalOpen(false)}
                  className="p-1.5 border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-slate-800 transition"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#faf7f2] dark:bg-[#0c1220]">
              {analyticsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-[#4a6fa5]" />
                  <p className="text-sm font-sans">Compiling student attempt reports &amp; integrity logs...</p>
                </div>
              ) : !activeAnalytics ? (
                <div className="py-16 text-center text-slate-500 dark:text-slate-400">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-slate-900 dark:text-white">Analytics Unavailable</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Unable to load analytics for this assessment.</p>
                </div>
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-[#ede8df]/60 dark:bg-[#121b30] p-4 border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] shadow-2xs flex flex-col justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">
                        Total Attempts
                      </span>
                      <p className="font-display text-3xl font-normal text-[#1a2540] dark:text-white my-1">
                        {activeAnalytics.totalSubmissions}
                      </p>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Enrolled submissions
                      </span>
                    </div>

                    <div className="bg-[#ede8df]/60 dark:bg-[#121b30] p-4 border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] shadow-2xs flex flex-col justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">
                        Class Average
                      </span>
                      <p className="font-display text-3xl font-normal text-[#4a6fa5] dark:text-[#6a90c5] my-1">
                        {activeAnalytics.averageScore}{' '}
                        <span className="font-sans text-xs font-normal text-slate-500 dark:text-slate-400">
                          / {activeAnalytics.totalMarks}
                        </span>
                      </p>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {activeAnalytics.totalMarks > 0
                          ? Math.round((activeAnalytics.averageScore / activeAnalytics.totalMarks) * 100)
                          : 0}
                        % cohort score
                      </span>
                    </div>

                    <div className="bg-[#ede8df]/60 dark:bg-[#121b30] p-4 border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] shadow-2xs flex flex-col justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">
                        Pass Rate
                      </span>
                      <p className="font-display text-3xl font-normal text-emerald-600 dark:text-emerald-400 my-1">
                        {activeAnalytics.passRate}%
                      </p>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Benchmark: {activeAnalytics.passingMarks} marks
                      </span>
                    </div>

                    <div className="bg-[#ede8df]/60 dark:bg-[#121b30] p-4 border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] shadow-2xs flex flex-col justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">
                        Score Range
                      </span>
                      <p className="font-display text-3xl font-normal text-[#1a2540] dark:text-white my-1">
                        {activeAnalytics.highestScore}{' '}
                        <span className="font-mono text-[10px] text-slate-500 uppercase">HIGH</span>{' '}
                        <span className="text-slate-300 dark:text-slate-600 font-sans font-light">•</span>{' '}
                        <span className="text-[#e05033] dark:text-[#e8604a]">{activeAnalytics.lowestScore}</span>{' '}
                        <span className="font-mono text-[10px] text-slate-500 uppercase">LOW</span>
                      </p>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Max possible: {activeAnalytics.totalMarks}
                      </span>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#ede8df]/70 dark:bg-[#121b30] p-3 border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)]">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={searchStudent}
                          onChange={(e) => setSearchStudent(e.target.value)}
                          placeholder="Search student, enrollment, email..."
                          className="w-full bg-[#faf7f2] dark:bg-[#0c1220] border border-[rgba(74,111,165,0.3)] dark:border-[rgba(106,144,197,0.25)] pl-9 pr-3 py-2 text-xs font-sans text-[#1a2540] dark:text-[#e8edf5] placeholder:text-slate-400 focus:outline-none focus:border-[#4a6fa5]"
                        />
                      </div>

                      <select
                        value={filterDiv}
                        onChange={(e) => setFilterDiv(e.target.value as any)}
                        className="bg-[#faf7f2] dark:bg-[#0c1220] border border-[rgba(74,111,165,0.3)] dark:border-[rgba(106,144,197,0.25)] px-3 py-2 text-xs font-mono font-semibold text-[#1a2540] dark:text-[#e8edf5] focus:outline-none focus:border-[#4a6fa5]"
                      >
                        <option value="ALL">All Divisions</option>
                        <option value="DIV 1">Division A (DIV 1)</option>
                        <option value="DIV 2">Division B (DIV 2)</option>
                      </select>
                    </div>

                    <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
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
                  <div className="border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] overflow-hidden bg-[#faf7f2] dark:bg-[#0c1220] shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#ede8df] dark:bg-[#121b30] border-b border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)]">
                          <tr>
                            <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">
                              Student Details
                            </th>
                            <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">
                              Division
                            </th>
                            <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">
                              Marks Obtained
                            </th>
                            <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">
                              Percentage
                            </th>
                            <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">
                              Status
                            </th>
                            <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">
                              AI Proctoring Trust
                            </th>
                            <th className="px-4 py-3 text-right font-mono text-[10px] font-bold uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">
                              Attempt Date
                            </th>
                            <th className="px-4 py-3 text-right font-mono text-[10px] font-bold uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">
                              Evaluation
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(74,111,165,0.15)] dark:divide-[rgba(106,144,197,0.15)] font-sans">
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
                              <tr key={sub.submissionId || sub.id} className="hover:bg-[#ede8df]/50 dark:hover:bg-[#121b30]/60 transition">
                                <td className="px-4 py-3.5">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-sm text-[#1a2540] dark:text-[#e8edf5]">
                                      {sub.studentName}
                                    </span>
                                    <span className="font-mono text-[11px] text-[#4a6fa5] dark:text-[#6a90c5]">
                                      {sub.enrollmentNumber || sub.email}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  <span className="inline-block px-2.5 py-1 rounded bg-[#ede8df] dark:bg-[#1a2540] text-[#1a2540] dark:text-[#e8edf5] border border-[rgba(74,111,165,0.25)] font-mono text-xs font-bold whitespace-nowrap">
                                    {sub.division || activeAnalytics.division || 'DIV 1'}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  <span className="font-bold text-sm text-[#1a2540] dark:text-[#e8edf5]">
                                    {sub.score}{' '}
                                    <span className="font-mono text-xs font-normal text-slate-500 dark:text-slate-400">
                                      / {sub.totalMarks}
                                    </span>
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-bold ${
                                      sub.percentage >= 60
                                        ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                                        : sub.percentage >= 40
                                        ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                                        : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/30'
                                    }`}
                                  >
                                    {sub.percentage}%
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  {sub.status === 'SUBMITTED' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                      PENDING REVIEW
                                    </span>
                                  ) : sub.passed ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                      PASSED
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] font-bold bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30">
                                      <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                      RETAKE
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[11px] font-bold ${
                                        sub.trustScore >= 80
                                          ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                                          : sub.trustScore >= 50
                                          ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                                          : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/30'
                                      }`}
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                      {sub.trustScore}% Trust
                                    </span>
                                    {sub.violationsCount > 0 && (
                                      <span className="font-mono text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                                        ({sub.violationsCount} violations)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  {new Date(sub.submittedAt).toLocaleDateString()} •{' '}
                                  {new Date(sub.submittedAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </td>
                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => openAnswerSheetModal(sub)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4a6fa5] hover:bg-[#3b5d8f] text-white border border-[#4a6fa5] rounded font-mono text-xs font-bold tracking-wider uppercase transition shadow-2xs"
                                    title="Inspect digital ink handwritten answer sheets"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Answer Sheet</span>
                                  </button>
                                </td>
                              </tr>
                            ))}

                          {(!activeAnalytics.submissions || activeAnalytics.submissions.length === 0) && (
                            <tr>
                              <td colSpan={8} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">
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

      {/* Student Handwritten Answer Sheet Inspection Modal */}
      {sheetModalOpen && selectedSubForSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0F172A] border border-slate-700 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-white">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-[#1E293B] flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      Candidate Handwritten Answer Sheet: {selectedSubForSheet.studentName}
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedSubForSheet.enrollmentNumber || selectedSubForSheet.email}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Score: <strong className="text-emerald-400">{selectedSubForSheet.score}/{selectedSubForSheet.totalMarks} ({selectedSubForSheet.percentage}%)</strong> • AI Proctoring Trust: <strong className="text-indigo-400">{selectedSubForSheet.trustScore}%</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const canvas = sheetCanvasRef.current;
                    if (!canvas) return;
                    const link = document.createElement('a');
                    link.download = `${selectedSubForSheet.studentName || 'Student'}_${sheetActiveQ}_Answer_Sheet_${sheetTotalPages}Page.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sheet (.PNG)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSheetModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dynamic Question Selector Tabs */}
            {(() => {
              const answersList = selectedSubForSheet?.answers || [];
              const questionsCount = answersList.length > 0 ? answersList.length : 5;
              const tabs = answersList.map((ans: any, idx: number) => {
                const qKey = `Q${idx + 1}`;
                const rawTitle = ans?.question?.title || ans?.questionText || `Question ${idx + 1}`;
                const cleanTitle = rawTitle.replace(/^Question \d+:\s*/, '');
                return {
                  id: qKey,
                  qIndex: idx,
                  questionId: ans?.questionId,
                  title: `${qKey}: ${cleanTitle.slice(0, 22)}${cleanTitle.length > 22 ? '...' : ''}`,
                  question: ans?.question || {
                    questionText: ans?.questionText,
                    explanation: ans?.explanation,
                    points: ans?.points || 10,
                  },
                  ansObj: ans,
                };
              });

              const activeQIndex = Math.max(0, Number(sheetActiveQ.replace('Q', '')) - 1);
              const activeTab = tabs.find((t: any) => t.id === sheetActiveQ) || tabs[activeQIndex] || tabs[0];
              const activeAns = activeTab?.ansObj;
              const activeQuestion = activeTab?.question;
              const activeMaxPoints = activeQuestion?.points || activeAns?.points || 10;
              const totalPossibleMarks = selectedSubForSheet?.totalMarks || (questionsCount * 10);
              const currentTotalAwarded = tabs.reduce((sum: number, t: any) => {
                const val = gradingMarks[t.id] !== undefined
                  ? gradingMarks[t.id]
                  : (t.questionId && gradingMarks[t.questionId] !== undefined ? gradingMarks[t.questionId] : (t.ansObj?.pointsAwarded ?? 0));
                return sum + Number(val || 0);
              }, 0);
              const totalPercentage = totalPossibleMarks > 0 ? ((currentTotalAwarded / totalPossibleMarks) * 100).toFixed(1) : '0.0';

              return (
                <>
                  <div className="flex items-center gap-2 px-6 py-2.5 bg-[#111827] border-b border-slate-800 overflow-x-auto text-xs font-bold">
                    {tabs.map((q: any) => {
                      const isActive = sheetActiveQ === q.id;
                      const awarded = gradingMarks[q.id] !== undefined
                        ? gradingMarks[q.id]
                        : (q.questionId && gradingMarks[q.questionId] !== undefined ? gradingMarks[q.questionId] : q.ansObj?.pointsAwarded);
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => handleSheetQuestionChange(q.id, q.questionId)}
                          className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-2 shrink-0 ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <span>{q.title}</span>
                          {awarded !== undefined && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-emerald-400'
                            }`}>
                              {awarded}M
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Content Body: Left question prompt & evaluation, Right ruled canvas */}
                  <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Prompt & Evaluation Rubric */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="p-5 rounded-2xl bg-[#1E293B] border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800 text-xs font-bold">
                            {sheetActiveQ} • {activeQuestion?.title || activeQuestion?.type || 'Descriptive Theory'}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold">
                            {activeMaxPoints} Marks
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white leading-relaxed">
                          {(() => {
                            const full = activeQuestion?.questionText || activeAns?.questionText || '';
                            const parts = full.split('\n\n[Marking Rubric:');
                            return parts[0] || (full ?? `Question ${sheetActiveQ}`);
                          })()}
                        </h4>

                        <div className="p-3.5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-1">
                          <span className="text-[11px] font-bold text-amber-400 block uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Grading Rubric
                          </span>
                          <p className="text-xs text-slate-300 leading-normal">
                            {(() => {
                              const full = activeQuestion?.questionText || activeAns?.questionText || '';
                              const parts = full.split('\n\n[Marking Rubric:');
                              return parts[1] ? parts[1].replace(']', '').trim() : (activeQuestion?.explanation || activeAns?.explanation || 'Evaluated manually based on accuracy and technical depth.');
                            })()}
                          </p>
                        </div>
                      </div>

                      {/* Manual Faculty Grading Card */}
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#111827] border-2 border-emerald-500/40 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-emerald-400" />
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                              Manual Evaluation • {sheetActiveQ}
                            </h4>
                          </div>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Non-Automated
                          </span>
                        </div>

                        {/* Marks input and Quick Pills */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-300">
                            Award Marks for {sheetActiveQ} (Max {activeMaxPoints} Marks):
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min={0}
                              max={activeMaxPoints}
                              step={0.5}
                              value={gradingMarks[sheetActiveQ] ?? ''}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setGradingMarks((prev) => ({ ...prev, [sheetActiveQ]: val }));
                              }}
                              placeholder="0.0"
                              className="w-24 p-2.5 rounded-xl bg-[#0F172A] border border-slate-700 text-white font-mono text-base font-bold text-center focus:outline-none focus:border-emerald-500"
                            />
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[0, activeMaxPoints * 0.25, activeMaxPoints * 0.5, activeMaxPoints * 0.75, activeMaxPoints].map((mk) => (
                                <button
                                  key={mk}
                                  type="button"
                                  onClick={() => setGradingMarks((prev) => ({ ...prev, [sheetActiveQ]: mk }))}
                                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold border transition ${
                                    gradingMarks[sheetActiveQ] === mk
                                      ? 'bg-emerald-600 border-emerald-500 text-white'
                                      : 'bg-[#0F172A] border-slate-700 text-slate-300 hover:bg-slate-800'
                                  }`}
                                >
                                  +{mk}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Question Feedback Textarea */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-300">
                            Evaluator Remarks for {sheetActiveQ}:
                          </label>
                          <textarea
                            rows={2}
                            value={gradingFeedback[sheetActiveQ] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGradingFeedback((prev) => ({ ...prev, [sheetActiveQ]: val }));
                            }}
                            placeholder="e.g. Accurate derivation and clear diagrams. Points awarded."
                            className="w-full p-2.5 rounded-xl bg-[#0F172A] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
                          />
                        </div>

                        {/* Overall Submission Score Summary & Evaluation Finalization */}
                        <div className="pt-3 border-t border-slate-800 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-bold uppercase tracking-wider">
                              Running Total Evaluated:
                            </span>
                            <span className="font-mono text-sm font-black text-emerald-400">
                              {currentTotalAwarded} / {totalPossibleMarks} Marks ({totalPercentage}%)
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-300">
                              Overall Exam Feedback & Summary:
                            </label>
                            <textarea
                              rows={2}
                              value={overallFeedback}
                              onChange={(e) => setOverallFeedback(e.target.value)}
                              placeholder="Comprehensive feedback reflected in candidate learning portal..."
                              className="w-full p-2.5 rounded-xl bg-[#0F172A] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
                            />
                          </div>

                          {gradeSuccessMsg && (
                            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>{gradeSuccessMsg}</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleSaveStudentGrades}
                            disabled={savingGrades}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
                          >
                            {savingGrades ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Finalizing Grades & Syncing Analytics...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Finalize & Save Grades</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#1E293B] border border-slate-800 space-y-2">
                        <span className="text-xs font-bold text-slate-300 block">Inspection Summary</span>
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Stroke Count:</span>
                          <strong className="text-emerald-400 font-mono">
                            {sheetStrokes.length > 0 ? `${sheetStrokes.length} digital ink strokes` : (sheetTypedText ? 'Typed text response' : '0 strokes')}
                          </strong>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Pages Written:</span>
                          <strong className="text-indigo-400 font-mono font-bold">
                            {sheetTotalPages} {sheetTotalPages === 1 ? 'Page' : 'Pages'}
                          </strong>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Submission Format:</span>
                          <strong className="text-slate-200 font-mono text-[11px]">
                            {sheetStrokes.length > 0 && sheetTypedText
                              ? 'Hybrid (Digital Ink + Typed)'
                              : sheetStrokes.length > 0
                              ? 'Digital Ink (Companion Pad)'
                              : sheetTypedText
                              ? 'Typed Descriptive Answer'
                              : 'No Submission'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Right: Answer Sheet Ruled Paper Canvas Pages & Typed Text */}
                    <div className="lg:col-span-7 space-y-4">
                      {sheetTypedText && (
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#111827] border-2 border-emerald-500/50 shadow-xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-emerald-400" />
                              Student Submitted Descriptive Response
                            </span>
                            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                              TYPED / TEXT SUBMISSION
                            </span>
                          </div>
                          <div className="text-xs text-slate-100 whitespace-pre-wrap leading-relaxed font-sans bg-[#0F172A] p-4 rounded-xl border border-slate-700/80 max-h-80 overflow-y-auto select-text shadow-inner">
                            {sheetTypedText}
                          </div>
                        </div>
                      )}

                      {(sheetStrokes.length > 0 || sheetTypedText) && (
                        <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-300">
                              {sheetStrokes.length > 0 ? 'Student Submitted Answer Sheet' : 'Ruled Examination Answer Sheet'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {sheetTotalPages} {sheetTotalPages === 1 ? 'Page' : 'Pages'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {sheetStrokes.length > 0 ? 'Digital Ink' : 'Typeset Paper'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Page Jump Switcher if student wrote more than 1 page */}
                            {sheetTotalPages > 1 && (
                              <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                                {Array.from({ length: sheetTotalPages }, (_, i) => i + 1).map((pNum) => (
                                  <button
                                    key={pNum}
                                    type="button"
                                    onClick={() => {
                                      if (sheetScrollContainerRef.current) {
                                        sheetScrollContainerRef.current.scrollTo({
                                          top: (pNum - 1) * PAGE_HEIGHT,
                                          behavior: 'smooth',
                                        });
                                        setSheetCurrentPage(pNum);
                                      }
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                                      sheetCurrentPage === pNum ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    Page {pNum}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* View sizing mode: Fit width vs 100% natural */}
                            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                              <button
                                type="button"
                                onClick={() => setSheetViewMode('fit')}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                                  sheetViewMode === 'fit' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                Fit Width
                              </button>
                              <button
                                type="button"
                                onClick={() => setSheetViewMode('100')}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                                  sheetViewMode === '100' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                100% Size
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div
                        ref={sheetScrollContainerRef}
                        onScroll={(e) => {
                          const top = e.currentTarget.scrollTop;
                          const currentP = Math.min(
                            Math.max(1, sheetTotalPages),
                            Math.floor(top / PAGE_HEIGHT) + 1
                          );
                          setSheetCurrentPage(currentP);
                        }}
                        className="relative border-2 border-slate-700 rounded-2xl overflow-y-auto p-3.5 bg-slate-900/90 shadow-2xl max-h-[660px] space-y-4"
                      >
                        {/* Unified Multi-Page Answer Sheet Card - Always visible with proper rendering */}
                        <div
                          className={`bg-white rounded-2xl shadow-xl border-2 border-slate-600/70 overflow-hidden relative transition-all block ${
                            sheetViewMode === '100' ? 'w-[900px] mx-auto' : 'w-full'
                          }`}
                        >
                          {/* Page Header Bar */}
                          <div className="flex items-center justify-between px-5 py-2.5 bg-slate-100 border-b border-slate-200 text-xs font-mono font-bold text-slate-700">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                              <span>PAGE {sheetCurrentPage} OF {Math.max(1, sheetTotalPages)}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                                {sheetActiveQ}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                              CLIAS OFFICIAL EXAM ANSWER SHEET ({Math.max(1, sheetTotalPages)} {sheetTotalPages <= 1 ? 'PAGE' : 'PAGES'})
                            </span>
                          </div>

                          {/* Ruled Continuous Multi-Page Canvas */}
                          <canvas
                            ref={sheetCanvasRef}
                            className="w-full h-auto block select-none bg-white"
                          />

                          {/* Page Footer */}
                          <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] font-mono text-slate-500">
                            <span>{selectedSubForSheet.studentName} ({selectedSubForSheet.enrollmentNumber || selectedSubForSheet.email})</span>
                            <span>
                              {sheetStrokes.length > 0
                                ? `Total Exam Writing: ${sheetTotalPages} ${sheetTotalPages === 1 ? 'Page' : 'Pages'} • ${sheetStrokes.length} Strokes Recorded`
                                : sheetTypedText
                                ? `Typeset Submission: ${sheetTotalPages} ${sheetTotalPages === 1 ? 'Page' : 'Pages'} • Verified Response`
                                : 'Empty Sheet'}
                            </span>
                          </div>
                        </div>

                        {sheetStrokes.length === 0 && !sheetLoading && !sheetTypedText && (
                          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-slate-950/80 rounded-2xl border border-slate-800">
                            <FileText className="w-12 h-12 text-slate-500 mb-2" />
                            <p className="font-bold text-sm text-slate-200">No response recorded for {sheetActiveQ}</p>
                            <p className="text-xs text-slate-400 mt-1">The student did not submit written digital ink strokes or typed text for this question.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Edit Assessment & Time Limit Modal */}
      {isEditModalOpen && editingAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#faf7f2] dark:bg-[#0F172A] text-slate-900 dark:text-white w-full max-w-xl rounded-3xl shadow-2xl border border-[rgba(74,111,165,0.25)] dark:border-slate-700 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(74,111,165,0.2)] dark:border-slate-700/80 bg-[#ede8df] dark:bg-[#1E293B]/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Edit Assessment &amp; Time Limit</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {editingAssessment.code} • {courses.find((c) => c.id === selectedCourseId)?.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAssessment} className="p-6 overflow-y-auto space-y-5">
              {/* Expiration Status Indicator */}
              <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                editingAssessment.isExpired || editingAssessment.status === 'COMPLETED'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <Clock className={`w-4 h-4 shrink-0 ${editingAssessment.isExpired || editingAssessment.status === 'COMPLETED' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                  <div>
                    <span className="font-bold block">
                      {editingAssessment.isExpired || editingAssessment.status === 'COMPLETED'
                        ? 'Test is currently ENDED / EXPIRED'
                        : 'Test is currently ACTIVE'}
                    </span>
                    <span className="text-[11px] opacity-90 block mt-0.5">
                      {editingAssessment.isExpired || editingAssessment.status === 'COMPLETED'
                        ? 'Students cannot take or resume this test. Extend duration or reopen below to allow access.'
                        : 'Students can access this test. Will automatically close 5 mins after duration.'}
                    </span>
                  </div>
                </div>

                {(editingAssessment.isExpired || editingAssessment.status === 'COMPLETED') && (
                  <button
                    type="button"
                    onClick={handleReopenAssessmentNow}
                    disabled={savingEdit}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 shadow-md transition"
                  >
                    Reopen Now
                  </button>
                )}
              </div>

              {/* Assessment Title */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Assessment Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-3 text-xs bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 shadow-xs"
                />
              </div>

              {/* Core Feature: Entire Test Time Limit / Duration */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-[#1E293B]/70 border border-indigo-200 dark:border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Entire Test Time Limit / Duration (Minutes)
                    </label>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      The total exam countdown timer for participating students.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-200 dark:border-indigo-500/30">
                    {editDuration} Mins
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                    className="w-32 p-3 text-xs bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold text-center focus:outline-none focus:border-indigo-500 shadow-xs"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[15, 30, 45, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setEditDuration(mins)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                          editDuration === mins
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expiration Buffer Notice */}
                <div className="p-3 rounded-xl bg-indigo-100/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-[11px] text-indigo-950 dark:text-indigo-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Automatic Expiration:</strong> The test window will automatically expire after{' '}
                    <strong>{editDuration + 5} minutes</strong> ({editDuration} mins + 5 mins grace period). Once expired, students will see &quot;Test Ended&quot; and will not be able to start or resume.
                  </span>
                </div>

                {/* Quick Extend Window */}
                <div className="pt-2 border-t border-[rgba(74,111,165,0.15)] dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Quick Time Extension from Now:</span>
                  <div className="flex items-center gap-1.5">
                    {[10, 15, 30].map((ext) => (
                      <button
                        key={ext}
                        type="button"
                        onClick={() => setEditExtendMinutes(ext)}
                        className={`px-2.5 py-1 rounded-lg font-bold border text-[11px] transition ${
                          editExtendMinutes === ext
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        +{ext}m
                      </button>
                    ))}
                    {editExtendMinutes > 0 && (
                      <button
                        type="button"
                        onClick={() => setEditExtendMinutes(0)}
                        className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-1"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Status, Batch, Division & Odd/Even ID Allocation */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full p-3 text-xs bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 shadow-xs"
                  >
                    <option value="DRAFT">DRAFT (Hidden from students)</option>
                    <option value="PUBLISHED">PUBLISHED (Visible to cohort)</option>
                    <option value="ACTIVE">ACTIVE (Open for submissions)</option>
                    <option value="COMPLETED">COMPLETED (Test Ended)</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Target Batch ({deptBatchConfig.rollPrefix})
                  </label>
                  <select
                    value={editBatch}
                    onChange={(e) => setEditBatch(e.target.value)}
                    className="w-full p-3 text-xs bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 shadow-xs"
                  >
                    {deptBatchConfig.batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.count} Stud. • {b.semesterLabel})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Section / Division
                  </label>
                  <select
                    value={editDivision}
                    onChange={(e) => setEditDivision(e.target.value as any)}
                    className="w-full p-3 text-xs bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 shadow-xs"
                  >
                    <option value="ALL">Both Divisions (All)</option>
                    <option value="DIV 1">Division A (DIV 1)</option>
                    <option value="DIV 2">Division B (DIV 2)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                    ID Allocation
                  </label>
                  <select
                    value={editRollFilter}
                    onChange={(e) => setEditRollFilter(e.target.value as any)}
                    className="w-full p-3 text-xs bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 shadow-xs"
                  >
                    <option value="ALL">All Roll IDs (Both)</option>
                    <option value="ODD">Odd IDs Only (...001, ...003)</option>
                    <option value="EVEN">Even IDs Only (...002, ...004)</option>
                  </select>
                </div>
              </div>

              {/* Passing Marks & Allowed Attempts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Passing %</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={editPassingMarks}
                    onChange={(e) => setEditPassingMarks(Number(e.target.value))}
                    className="w-full p-3 text-xs bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Allowed Attempts</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editAllowedAttempts}
                    onChange={(e) => setEditAllowedAttempts(Number(e.target.value))}
                    className="w-full p-3 text-xs bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Anti-Cheating Question & Option Jumbling Setting */}
              <div className="p-3.5 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Anti-Cheating: Randomize Question &amp; Option Order
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-500/30">
                      ANTI-CHEAT ON
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRandomizeQuestions}
                      onChange={(e) => setEditRandomizeQuestions(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                  When enabled, questions (Objective, Coding, and Hybrid) and MCQ options are jumbled into unique deterministic sequences for each student. Adjacent students will not receive questions in the same sequence.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[rgba(74,111,165,0.2)] dark:border-slate-700/80 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Assessment Leaderboard Modal for Faculty */}
      {leaderboardModalData && (
        <AssessmentLeaderboardModal
          assessmentId={leaderboardModalData.id}
          assessmentTitle={leaderboardModalData.title}
          isOpen={!!leaderboardModalData}
          onClose={() => setLeaderboardModalData(null)}
          isFacultyView={true}
        />
      )}
    </div>
  );
}

