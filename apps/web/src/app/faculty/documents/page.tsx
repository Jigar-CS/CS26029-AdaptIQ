'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Upload,
  Search,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  Database,
  ChevronRight,
  ArrowRight,
  FileCheck,
  Tag,
  AlertCircle,
  HelpCircle,
  Hash,
  FileUp,
  PlusCircle,
  CheckSquare,
  Square,
  ListPlus,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';

interface DocumentChunk {
  id: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  topicKeywords?: string;
  document?: {
    title: string;
    documentType: string;
  };
}

interface CourseDocument {
  id: string;
  title: string;
  fileName: string;
  documentType: string;
  fileSizeKb: number;
  status: string;
  chunkCount: number;
  createdAt: string;
  chunks?: DocumentChunk[];
}

interface ExtractedQuestion {
  id: string;
  questionText: string;
  topic?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  bloomLevel?: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE';
  options: {
    text: string;
    isCorrect: boolean;
    misconception?: string;
  }[];
  explanation?: string;
  citation?: string;
}

export default function FacultyDocumentsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<CourseDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'documents' | 'extract-questions' | 'query' | 'grounded-quiz'>('documents');

  // Query state
  const [ragQuery, setRagQuery] = useState('What is the AVL tree balancing invariant and rotation rule?');
  const [queryResults, setQueryResults] = useState<any>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  // Ingestion form state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('SYLLABUS');
  const [docContent, setDocContent] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);

  // Grounded quiz generator state
  const [quizTopic, setQuizTopic] = useState('Trees & Hierarchical Structures');
  const [quizCount, setQuizCount] = useState(2);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [groundedQuestions, setGroundedQuestions] = useState<any[]>([]);
  const [approvedQuestions, setApprovedQuestions] = useState<number[]>([]);

  // Question PDF/Document Upload & Extraction State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [extractStatus, setExtractStatus] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Create Assessment Modal State
  const [showCreateAssessmentModal, setShowCreateAssessmentModal] = useState(false);
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentCode, setAssessmentCode] = useState('');
  const [assessmentDuration, setAssessmentDuration] = useState(45);
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);
  const [createdAssessmentResult, setCreatedAssessmentResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const courseId = user?.courseId || 'CS301';
      const data: any = await api.get(`/rag/courses/${courseId}/documents`);
      if (Array.isArray(data)) {
        setDocuments(data);
        if (data.length > 0) setSelectedDoc(data[0]);
        else setSelectedDoc(null);
      } else {
        setDocuments([]);
        setSelectedDoc(null);
      }
    } catch {
      setDocuments([]);
      setSelectedDoc(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRunRagQuery = async () => {
    if (!ragQuery.trim()) return;
    setIsQuerying(true);
    try {
      const courseId = user?.courseId || 'CS301';
      const data: any = await api.post(`/rag/courses/${courseId}/query`, {
        query: ragQuery,
        topK: 3,
      });
      setQueryResults(data);
    } catch {
      setQueryResults({
        query: ragQuery,
        course_code: 'CS301',
        grounded_answer: 'No matching excerpts or semantic context found for this query in the ingested syllabus.',
        chunks: [],
      });
    } finally {
      setIsQuerying(false);
    }
  };

  const handleGenerateGroundedQuiz = async () => {
    setIsGeneratingQuiz(true);
    setApprovedQuestions([]);
    try {
      const courseId = user?.courseId || 'CS301';
      const data: any = await api.post(`/rag/courses/${courseId}/grounded-quiz`, {
        topic: quizTopic,
        count: quizCount,
      });
      setGroundedQuestions(data.questions || []);
    } catch {
      setGroundedQuestions([]);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !docContent) return;
    setIsIngesting(true);
    const courseId = user?.courseId || 'CS301';
    try {
      const newDoc: any = await api.post(`/rag/courses/${courseId}/documents`, {
        title: docTitle,
        docType: docType,
        extractedText: docContent,
      });
      if (newDoc && newDoc.id) {
        setDocuments((prev) => [newDoc, ...prev]);
        setSelectedDoc(newDoc);
        setShowUploadModal(false);
        setDocTitle('');
        setDocContent('');
      }
    } catch (err) {
      console.error('Failed to ingest document:', err);
    } finally {
      setIsIngesting(false);
    }
  };

  // Handle PDF/Document File Selection for Question Extraction
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setExtractError(null);
    }
  };

  // Upload and Extract Questions from PDF / Document
  const handleUploadAndExtract = async () => {
    if (!uploadFile) return;

    setIsExtracting(true);
    setExtractError(null);
    setExtractStatus(`Reading ${uploadFile.name}...`);

    try {
      let fileBase64 = '';
      let textContent = '';

      // If text/doc file, read as text; for PDF read as Base64 Data URL
      if (uploadFile.type === 'text/plain' || uploadFile.name.endsWith('.txt')) {
        textContent = await uploadFile.text();
      } else {
        fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(uploadFile);
        });
      }

      setExtractStatus('Sending to Document AI question parser & multimodal extractor...');

      const courseId = user?.courseId || 'CS301';
      const response: any = await api.post('/rag/extract-questions', {
        fileBase64,
        text: textContent,
        fileName: uploadFile.name,
        courseId,
      });

      if (Array.isArray(response) && response.length > 0) {
        setExtractedQuestions(response);
        // Pre-select all extracted questions
        setSelectedQuestionIds(response.map((q) => q.id));
        setExtractStatus(`Successfully extracted ${response.length} assessment questions!`);
        setActiveTab('extract-questions');
        setAssessmentTitle(
          `Assessment from ${uploadFile.name.replace(/\.[^/.]+$/, '')}`
        );
        setAssessmentCode(
          `EXAM-${Date.now().toString().slice(-4)}`
        );
      } else {
        setExtractError('No valid questions could be detected in this document. Please check the file formatting.');
      }
    } catch (err: any) {
      console.error('Error extracting questions:', err);
      setExtractError(err.message || 'Failed to extract questions from uploaded PDF.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Toggle selection of an extracted question
  const toggleQuestionSelect = (qId: string) => {
    if (selectedQuestionIds.includes(qId)) {
      setSelectedQuestionIds(selectedQuestionIds.filter((id) => id !== qId));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, qId]);
    }
  };

  // Select or Deselect All
  const toggleSelectAll = () => {
    if (selectedQuestionIds.length === extractedQuestions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(extractedQuestions.map((q) => q.id));
    }
  };

  // Save selected questions directly to Course Question Bank
  const handleImportToQuestionBank = async () => {
    const selected = extractedQuestions.filter((q) => selectedQuestionIds.includes(q.id));
    if (selected.length === 0) return;

    try {
      const courseId = user?.courseId || 'CS301';
      const res: any = await api.post(`/rag/courses/${courseId}/import-questions`, {
        questions: selected,
      });

      setExtractStatus(`Successfully saved ${selected.length} questions into Question Bank!`);
      setTimeout(() => {
        router.push('/faculty/questions');
      }, 1200);
    } catch (err: any) {
      setExtractError(`Failed to save to Question Bank: ${err.message}`);
    }
  };

  // Submit and Create Assessment with selected questions
  const handleCreateAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selected = extractedQuestions.filter((q) => selectedQuestionIds.includes(q.id));
    if (selected.length === 0) return;

    setIsCreatingAssessment(true);
    try {
      const courseId = user?.courseId || 'CS301';
      const res: any = await api.post(`/rag/courses/${courseId}/create-assessment`, {
        title: assessmentTitle || `Document Assessment`,
        code: assessmentCode || `EXAM-${Date.now().toString().slice(-4)}`,
        durationMinutes: assessmentDuration,
        totalMarks: selected.length * 10,
        passingMarks: Math.round(selected.length * 10 * 0.4),
        questions: selected,
      });

      setCreatedAssessmentResult(res);
      setExtractStatus(`Assessment "${res.title}" created successfully!`);
      setShowCreateAssessmentModal(false);
    } catch (err: any) {
      console.error('Failed to create assessment:', err);
      setExtractError(`Failed to create assessment: ${err.message}`);
    } finally {
      setIsCreatingAssessment(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-100 font-sans">
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <Navbar
          title="Document AI & Course RAG Studio"
          subtitle="Upload question papers, extract dynamic MCQs with Document AI & create instant assessments"
        />
        <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 w-full">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-lg shadow-cyan-500/20">
                  <Database className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">
                  Document AI & Course RAG Studio
                </h1>
                {user?.courseCode ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Assigned Subject: {user.courseCode} - {user.courseName} (Fixed)</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Semantic RAG Live
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm max-w-3xl">
                Upload Question PDFs or syllabi to automatically extract structured questions using Document AI, review answers with Bloom levels, and create assessments instantly.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* PRIMARY ACTION: Upload Question PDF */}
              <button
                onClick={() => {
                  setActiveTab('extract-questions');
                  fileInputRef.current?.click();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all"
              >
                <FileUp className="w-4 h-4" />
                <span>Upload Question PDF</span>
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                Ingest Syllabus
              </button>
            </div>
          </div>

          {/* Hidden File Input for PDF Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.txt,.docx"
            className="hidden"
          />

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{documents.length}</div>
                <div className="text-xs text-slate-400 font-medium">Ingested Documents</div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-400">{extractedQuestions.length}</div>
                <div className="text-xs text-slate-400 font-medium">Fetched PDF Questions</div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0)}
                </div>
                <div className="text-xs text-slate-400 font-medium">Semantic Chunks</div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">Gemini Multimodal</div>
                <div className="text-xs text-slate-400 font-medium">PDF Layout & MCQ Parser</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap border-b border-slate-800 gap-6">
            <button
              onClick={() => setActiveTab('extract-questions')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'extract-questions'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileUp className="w-4 h-4" />
              PDF Question Extractor & Assessment Studio
              {extractedQuestions.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 font-bold">
                  {extractedQuestions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'documents'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Course Knowledge Base ({documents.length})
            </button>

            <button
              onClick={() => setActiveTab('query')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'query'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-4 h-4" />
              Semantic RAG Playground
            </button>

            <button
              onClick={() => setActiveTab('grounded-quiz')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'grounded-quiz'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Grounded Quiz Generator
            </button>
          </div>

          {/* TAB: PDF Question Extractor & Assessment Studio */}
          {activeTab === 'extract-questions' && (
            <div className="space-y-6">
              {/* Upload Drop Zone & Action Bar */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <FileUp className="w-5 h-5 text-emerald-400" />
                      Upload Question Paper (PDF / Document)
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Upload an existing examination paper, question bank, or unit test PDF. The Document AI engine will fetch each question, options, answers, and explanations.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{uploadFile ? 'Choose Different File' : 'Select PDF / Document'}</span>
                    </button>

                    {uploadFile && (
                      <button
                        onClick={handleUploadAndExtract}
                        disabled={isExtracting}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition"
                      >
                        {isExtracting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Fetching Questions...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            Extract Questions from Document
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Upload File Preview Indicator */}
                {uploadFile && (
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-white">{uploadFile.name}</span>
                      <span className="text-slate-500 font-mono">
                        ({(uploadFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    {!isExtracting && (
                      <button
                        onClick={() => setUploadFile(null)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Status or Error Notifications */}
                {extractStatus && (
                  <div className="px-4 py-2.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{extractStatus}</span>
                  </div>
                )}
                {extractError && (
                  <div className="px-4 py-2.5 bg-rose-950/60 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{extractError}</span>
                  </div>
                )}
              </div>

              {/* Assessment Creation Success Card */}
              {createdAssessmentResult && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Assessment Live & Published
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Code: {createdAssessmentResult.code}
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-white">
                      {createdAssessmentResult.title}
                    </h3>
                    <p className="text-xs text-slate-300">
                      Successfully populated with {createdAssessmentResult.questions?.length || selectedQuestionIds.length} questions from the uploaded PDF document.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/faculty/assessments"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition"
                    >
                      <span>View in Assessments Panel</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Fetched Questions Review & Selection List */}
              {extractedQuestions.length > 0 && (
                <div className="space-y-4">
                  {/* Bulk Selection and Action Toolbar */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleSelectAll}
                        className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800"
                      >
                        {selectedQuestionIds.length === extractedQuestions.length ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                        <span>
                          {selectedQuestionIds.length === extractedQuestions.length
                            ? 'Deselect All'
                            : 'Select All Questions'}
                        </span>
                      </button>

                      <span className="text-xs text-slate-400">
                        Selected <strong>{selectedQuestionIds.length}</strong> of{' '}
                        {extractedQuestions.length} questions
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleImportToQuestionBank}
                        disabled={selectedQuestionIds.length === 0}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                        <span>Save to Question Bank</span>
                      </button>

                      {/* PRIMARY TARGET: Add Those Questions to Create Assessments */}
                      <button
                        onClick={() => setShowCreateAssessmentModal(true)}
                        disabled={selectedQuestionIds.length === 0}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition"
                      >
                        <ListPlus className="w-4 h-4" />
                        <span>Add Questions to Create Assessment ({selectedQuestionIds.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Cards */}
                  {extractedQuestions.map((q, idx) => {
                    const isSelected = selectedQuestionIds.includes(q.id);
                    return (
                      <div
                        key={q.id || idx}
                        onClick={() => toggleQuestionSelect(q.id)}
                        className={`p-6 rounded-2xl border transition-all cursor-pointer space-y-4 ${
                          isSelected
                            ? 'bg-slate-900/90 border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                            : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Top Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500" />
                              )}
                            </span>
                            <span className="text-xs font-bold font-mono text-slate-400">
                              Q{idx + 1}
                            </span>
                            {q.topic && (
                              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300">
                                {q.topic}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              {q.difficulty || 'MEDIUM'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {q.bloomLevel || 'APPLY'}
                            </span>
                          </div>

                          {q.citation && (
                            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-cyan-400" />
                              {q.citation}
                            </span>
                          )}
                        </div>

                        {/* Question Text */}
                        <h3 className="text-sm font-bold text-white leading-relaxed">
                          {q.questionText}
                        </h3>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                                opt.isCorrect
                                  ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200 font-semibold'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-300'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                                  opt.isCorrect
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <div className="space-y-0.5">
                                <div>{opt.text}</div>
                                {opt.misconception && (
                                  <div className="text-[10px] text-rose-400">
                                    Trap: {opt.misconception}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300">
                            <span className="font-bold text-slate-200">Pedagogical Explanation: </span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: Document Repository & Chunks */}
          {activeTab === 'documents' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Document list */}
              <div className="lg:col-span-5 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Course Documents</h2>
                <div className="space-y-3">
                  {loading ? (
                    <div className="p-8 text-center text-slate-500 text-sm rounded-xl bg-slate-900/40 border border-slate-800">
                      Loading course knowledge base documents...
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                      <div className="font-semibold text-slate-400">No Documents Ingested Yet</div>
                      <div className="text-xs text-slate-500">
                        Click &quot;Upload Question PDF&quot; or &quot;Ingest Syllabus&quot; above.
                      </div>
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          selectedDoc?.id === doc.id
                            ? 'bg-slate-800/90 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="font-semibold text-white text-sm leading-snug">{doc.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
                            {doc.documentType}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            {doc.chunkCount} chunks
                          </span>
                          <span>•</span>
                          <span>{doc.fileSizeKb ? `${doc.fileSizeKb} KB` : 'Indexed'}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {doc.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Selected Document Chunk Inspector */}
              <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                {selectedDoc ? (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">{selectedDoc.title}</h3>
                        <p className="text-xs text-slate-400">{selectedDoc.fileName} • {selectedDoc.chunkCount} Vectorized Chunks</p>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Vector Indexed
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Extracted Semantic Chunks
                      </h4>
                      {selectedDoc.chunks && selectedDoc.chunks.length > 0 ? (
                        selectedDoc.chunks.map((chunk) => (
                          <div
                            key={chunk.id}
                            className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-cyan-400 flex items-center gap-1">
                                <Hash className="w-3 h-3" /> Chunk #{chunk.chunkIndex}
                              </span>
                              <span className="text-slate-500">{chunk.tokenCount} Tokens</span>
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed font-sans">{chunk.content}</p>
                            {chunk.topicKeywords && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 pt-1">
                                <Tag className="w-3 h-3 text-slate-500" />
                                <span>Keywords: {chunk.topicKeywords}</span>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-slate-500 text-sm">
                          Document chunks are indexed in the primary embedding store.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-slate-500">Select a document to inspect chunks</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Semantic RAG Playground */}
          {activeTab === 'query' && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-cyan-400" />
                  Course Syllabus Semantic Retrieval
                </h2>
                <p className="text-xs text-slate-400">
                  Test semantic queries against all indexed CS301 syllabus units and lecture slide chunks.
                </p>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    placeholder="Ask about syllabus topics, invariants, time complexity, or rotation conditions..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleRunRagQuery}
                    disabled={isQuerying}
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-2 shadow-lg shadow-cyan-600/20"
                  >
                    {isQuerying ? 'Searching...' : 'Run Query'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Results Display */}
              {queryResults && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
                  <div className="lg:col-span-7 bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> Grounded Academic Synthesis
                      </span>
                      <span className="text-xs text-slate-400">Course Code: {queryResults.course_code}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-sm text-slate-200 leading-relaxed">
                      {queryResults.grounded_answer}
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Retrieved Chunks & Cosine Rank
                    </h3>
                    {queryResults.chunks.map((ch: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">{ch.doc_title}</span>
                          <span className="px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {Math.round(ch.similarity * 100)}% Match
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{ch.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Grounded Assessment Generator */}
          {activeTab === 'grounded-quiz' && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                      RAG Grounded Assessment Generator
                    </h2>
                    <p className="text-xs text-slate-400">
                      Generate exam items directly grounded in uploaded documents with explicit citation tags.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={quizTopic}
                      onChange={(e) => setQuizTopic(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Linear Data Structures & Arrays">Unit 1: Linear Arrays & Queues</option>
                      <option value="Trees & Hierarchical Structures">Unit 2: Trees & AVL Invariants</option>
                      <option value="Dynamic Programming & Graphs">Unit 3: DP & Shortest Paths</option>
                    </select>

                    <button
                      onClick={handleGenerateGroundedQuiz}
                      disabled={isGeneratingQuiz}
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      {isGeneratingQuiz ? 'Synthesizing...' : 'Generate Grounded Items'}
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Generated Questions List */}
              {groundedQuestions.length > 0 && (
                <div className="space-y-4">
                  {groundedQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-6 rounded-2xl border bg-slate-900/70 border-slate-800 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                            {q.bloom_level}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {q.difficulty}
                          </span>
                          <span className="text-xs text-cyan-400 font-mono flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> {q.citation}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-base font-semibold text-white">{q.question_text}</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt: any, oIdx: number) => (
                          <div
                            key={oIdx}
                            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                              opt.is_correct
                                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                                : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                opt.is_correct ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <div>
                              <div>{opt.text}</div>
                              {opt.misconception_tag && (
                                <div className="text-[10px] text-amber-400/90 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Trap: {opt.misconception_tag}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300">
                        <span className="font-bold text-slate-200">Grounded Rationale: </span>
                        {q.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal: Create Assessment With Extracted Questions */}
      {showCreateAssessmentModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-emerald-400" />
                Create Assessment with Extracted Questions
              </h3>
              <button
                onClick={() => setShowCreateAssessmentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssessmentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Assessment Title
                </label>
                <input
                  type="text"
                  required
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                  placeholder="e.g. Mid-Term Examination: Data Structures"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Exam Code
                  </label>
                  <input
                    type="text"
                    required
                    value={assessmentCode}
                    onChange={(e) => setAssessmentCode(e.target.value)}
                    placeholder="e.g. EXAM-CS301-01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="180"
                    value={assessmentDuration}
                    onChange={(e) => setAssessmentDuration(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Questions Included:</span>
                  <span className="font-bold text-emerald-400">
                    {selectedQuestionIds.length} questions
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Marks:</span>
                  <span className="font-bold text-white">
                    {selectedQuestionIds.length * 10} pts
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Passing Mark:</span>
                  <span className="font-bold text-white">
                    {Math.round(selectedQuestionIds.length * 10 * 0.4)} pts (40%)
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAssessmentModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAssessment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isCreatingAssessment ? 'Generating Assessment...' : 'Create & Publish Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ingest Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                Ingest Academic Document
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIngestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Document Title</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Unit 4: Graph Algorithms & Minimum Spanning Trees"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Document Category</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="SYLLABUS">Syllabus / Regulations</option>
                  <option value="LECTURE_NOTES">Faculty Lecture Notes</option>
                  <option value="PRESENTATION_SLIDES">Presentation Slides</option>
                  <option value="REFERENCE_TEXT">Reference Textbook Chapter</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Content / Syllabus Notes for Semantic Chunking
                </label>
                <textarea
                  required
                  rows={6}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Paste syllabus paragraphs, slide summaries, or lecture notes. The RAG pipeline will automatically segment, vectorize, and index this content."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIngesting}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
                >
                  {isIngesting ? 'Vectorizing...' : 'Ingest & Chunk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
