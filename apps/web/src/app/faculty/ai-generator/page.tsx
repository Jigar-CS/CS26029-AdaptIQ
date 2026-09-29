'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  Sparkles,
  Brain,
  CheckCircle2,
  XCircle,
  Edit3,
  Check,
  X,
  Loader2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Plus,
  BookOpen,
} from 'lucide-react';

interface StagedQuestion {
  id: string;
  topicId: string;
  topic: { name: string; course: { code: string } };
  promptQuery: string;
  bloomLevel: string;
  difficulty: string;
  questionText: string;
  explanation: string;
  optionsJson: string;
  status: string;
  createdAt: string;
}

export default function AiQuestionGeneratorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [bloomLevel, setBloomLevel] = useState<string>('APPLY');
  const [difficulty, setDifficulty] = useState<string>('MEDIUM');
  const [count, setCount] = useState<number>(3);
  const [syllabusContext, setSyllabusContext] = useState<string>('');

  const [stagedQuestions, setStagedQuestions] = useState<StagedQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loadingStaged, setLoadingStaged] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      loadCoursesAndStaged();
    }
  }, [user, authLoading]);

  const loadCoursesAndStaged = async () => {
    setLoadingStaged(true);
    try {
      const courseList = await api.get('/courses');
      setCourses(courseList);
      if (courseList.length > 0) {
        setSelectedCourseId(courseList[0].id);
        if (courseList[0].topics?.length > 0) {
          setSelectedTopicId(courseList[0].topics[0].id);
        }
      }
      const staged = await api.get('/ai-assessment/staged');
      setStagedQuestions(staged || []);
    } catch (err) {
      console.error('Failed to load generator data', err);
    } finally {
      setLoadingStaged(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId) {
      alert('Please select a topic.');
      return;
    }

    setGenerating(true);
    try {
      await api.post('/ai-assessment/generate', {
        topicId: selectedTopicId,
        courseId: selectedCourseId,
        bloomLevel,
        difficulty,
        count: Number(count),
        syllabusContext,
      });

      // Reload staged questions
      const updated = await api.get('/ai-assessment/staged');
      setStagedQuestions(updated || []);
    } catch (err: any) {
      alert(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await api.post(`/ai-assessment/${id}/approve`, {});
      setStagedQuestions((prev) => prev.filter((q) => q.id !== id));
      alert('Question approved and published to the Course Question Bank!');
    } catch (err: any) {
      alert(err.message || 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const feedback = prompt('Please enter revision feedback for this rejected question:') || 'Rejected by instructor.';
    setProcessingId(id);
    try {
      await api.post(`/ai-assessment/${id}/reject`, { feedback });
      setStagedQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const currentTopics = selectedCourse?.topics || [];

  const bloomDescriptions: Record<string, string> = {
    REMEMBER: 'Recall definitions, formulas, and fundamental syntax.',
    UNDERSTAND: 'Explain conceptual meaning and compare representations.',
    APPLY: 'Execute algorithmic procedures on concrete input samples.',
    ANALYZE: 'Dissect asymptotic complexity and trace execution invariants.',
    EVALUATE: 'Critique algorithmic trade-offs and select optimal structures.',
    CREATE: 'Synthesize novel composite data structures for complex constraints.',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="AI Assessment Authoring Studio"
          subtitle="Grounded LLM question generation with strict faculty-in-the-loop review"
        />

        <main className="p-8 max-w-6xl w-full mx-auto space-y-8">
          {/* Top Generator Config Box */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-inner">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Curriculum-Grounded Question Generator
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate Bloom-taxonomy aligned assessment items. All items are held in staging for human instructor approval.
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerate} className="space-y-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Course */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => {
                      setSelectedCourseId(e.target.value);
                      const course = courses.find((c) => c.id === e.target.value);
                      if (course && course.topics?.length > 0) {
                        setSelectedTopicId(course.topics[0].id);
                      }
                    }}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Target Topic
                  </label>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                  >
                    {currentTopics.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bloom's Level */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Bloom's Taxonomy Level
                  </label>
                  <select
                    value={bloomLevel}
                    onChange={(e) => setBloomLevel(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                  >
                    <option value="REMEMBER">1. Remember (Knowledge Recall)</option>
                    <option value="UNDERSTAND">2. Understand (Comprehension)</option>
                    <option value="APPLY">3. Apply (Execution / Trace)</option>
                    <option value="ANALYZE">4. Analyze (Invariants & Scaling)</option>
                    <option value="EVALUATE">5. Evaluate (Trade-off Selection)</option>
                    <option value="CREATE">6. Create (Synthesis)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Difficulty */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Difficulty Tier
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                  >
                    <option value="EASY">Easy (Scaffolding)</option>
                    <option value="MEDIUM">Medium (Intermediate)</option>
                    <option value="HARD">Hard (Advanced Algorithmic)</option>
                  </select>
                </div>

                {/* Count */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Number of Items ({count})
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full accent-indigo-600 mt-2"
                  />
                </div>

                {/* Pedagogical notes / Syllabus context */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Curriculum Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={syllabusContext}
                    onChange={(e) => setSyllabusContext(e.target.value)}
                    placeholder="e.g. Focus on AVL balancing rotations"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Target focus: <em>{bloomDescriptions[bloomLevel]}</em>
                </span>

                <button
                  type="submit"
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Generate AI Questions</span>
                </button>
              </div>
            </form>
          </div>

          {/* Staging Review Pipeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-600" />
                  Human-in-the-Loop Staging Board
                </h3>
                <p className="text-xs text-slate-500">
                  {stagedQuestions.length} AI-generated items awaiting instructor verification and bank promotion.
                </p>
              </div>
            </div>

            {loadingStaged ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading staging queue...</div>
            ) : stagedQuestions.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-800">All Staged Items Cleared</p>
                <p className="text-xs text-slate-400 mt-1">Use the generator above to stage new questions.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {stagedQuestions.map((q) => {
                  let options: any[] = [];
                  try {
                    options = JSON.parse(q.optionsJson || '[]');
                  } catch (e) {
                    options = [];
                  }

                  const isProcessing = processingId === q.id;

                  return (
                    <div
                      key={q.id}
                      className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 hover:shadow-md transition"
                    >
                      {/* Badge line */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {q.topic?.course?.code || 'CS301'} • {q.topic?.name}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Bloom: {q.bloomLevel}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {q.difficulty}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-slate-400">
                          Status: STAGED_FOR_APPROVAL
                        </span>
                      </div>

                      {/* Question Text */}
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                        {q.questionText}
                      </h4>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {options.map((opt: any, oIdx: number) => {
                          const isCorrect = opt.is_correct || opt.isCorrect;
                          return (
                            <div
                              key={oIdx}
                              className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
                                isCorrect
                                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <div className="flex-1">
                                <div>{opt.text || opt.optionText}</div>
                                {opt.misconception_tag && (
                                  <span className="inline-block mt-1 text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Distractor: {opt.misconception_tag}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950 leading-relaxed">
                          <strong className="block font-bold text-indigo-900 mb-1">
                            Pedagogical Explanation:
                          </strong>
                          {q.explanation}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleReject(q.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold text-xs rounded-xl transition"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleApprove(q.id)}
                          className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Approve & Add to Question Bank</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
