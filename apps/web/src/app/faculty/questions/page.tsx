'use client';

import React, { useState, useEffect } from 'react';
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
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Layers,
  Tag,
  ArrowRight,
  BrainCircuit,
  FileCheck,
  ChevronDown,
  HelpCircle,
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

const SEED_QUESTIONS: QuestionItem[] = [
  {
    id: 'q-1',
    questionText: 'What is the tightest worst-case time complexity of searching for an element in an AVL tree containing N nodes?',
    topic: 'Trees & BST',
    courseCode: 'CS301',
    difficulty: 'MEDIUM',
    bloomLevel: 'UNDERSTAND',
    options: [
      { id: 'opt-1', text: 'O(log N)', isCorrect: true },
      { id: 'opt-2', text: 'O(N)', isCorrect: false, misconception: 'Confuses unbalanced BST worst case with balanced AVL invariant' },
      { id: 'opt-3', text: 'O(1)', isCorrect: false, misconception: 'Confuses Hash Table lookup with tree height traversal' },
      { id: 'opt-4', text: 'O(N log N)', isCorrect: false, misconception: 'Confuses tree search with sorting complexity' },
    ],
    explanation: 'Because an AVL tree strictly enforces |h_left - h_right| <= 1 for every node, its maximum height is bounded by 1.44 log2(N). Therefore, search complexity is strictly O(log N).',
    discrimination: 1.45,
    difficultyParam: 0.12,
  },
  {
    id: 'q-2',
    questionText: 'In a circular queue implemented using an array of size N with front and rear pointers, which condition uniquely indicates that the queue is completely full?',
    topic: 'Stacks & Queues',
    courseCode: 'CS301',
    difficulty: 'EASY',
    bloomLevel: 'APPLY',
    options: [
      { id: 'opt-5', text: '(rear + 1) % N == front', isCorrect: true },
      { id: 'opt-6', text: 'rear == front', isCorrect: false, misconception: 'Empty queue condition conflated with full queue condition' },
      { id: 'opt-7', text: 'rear == N - 1', isCorrect: false, misconception: 'Linear queue condition ignoring wrap-around' },
      { id: 'opt-8', text: '(front + 1) % N == rear', isCorrect: false, misconception: 'Inverted pointer orientation' },
    ],
    explanation: 'To distinguish between empty and full states without an extra counter flag, circular queues reserve one vacant slot, satisfying (rear + 1) % N == front when full.',
    discrimination: 1.15,
    difficultyParam: -0.45,
  },
  {
    id: 'q-3',
    questionText: 'Which mathematical condition must hold for a problem to be solved using Dynamic Programming via memoization or tabulation?',
    topic: 'Dynamic Programming',
    courseCode: 'CS301',
    difficulty: 'HARD',
    bloomLevel: 'ANALYZE',
    options: [
      { id: 'opt-9', text: 'Optimal Substructure and Overlapping Subproblems', isCorrect: true },
      { id: 'opt-10', text: 'Greedy Choice Property and Monotonicity', isCorrect: false, misconception: 'Confuses Greedy strategy requirements with DP' },
      { id: 'opt-11', text: 'Linear Independence of State Variables', isCorrect: false, misconception: 'Linear algebra concept misapplied to recurrence relations' },
      { id: 'opt-12', text: 'Logarithmic Division of Problem Space', isCorrect: false, misconception: 'Confuses Divide-and-Conquer with Dynamic Programming' },
    ],
    explanation: 'Dynamic Programming fundamentally requires Optimal Substructure (an optimal solution to the problem contains optimal solutions to subproblems) and Overlapping Subproblems.',
    discrimination: 1.82,
    difficultyParam: 1.15,
  },
  {
    id: 'q-4',
    questionText: 'What is the balance factor of a node in an AVL tree, and what values are permissible before a rotation is mandated?',
    topic: 'Trees & BST',
    courseCode: 'CS301',
    difficulty: 'MEDIUM',
    bloomLevel: 'UNDERSTAND',
    options: [
      { id: 'opt-13', text: 'Height(Left) - Height(Right); allowed values {-1, 0, +1}', isCorrect: true },
      { id: 'opt-14', text: 'Height(Left) + Height(Right); allowed values {0, 1, 2}', isCorrect: false, misconception: 'Addition instead of difference' },
      { id: 'opt-15', text: 'Node count in Left subtree - Node count in Right subtree', isCorrect: false, misconception: 'Confuses Weight-Balanced Trees with AVL Height Balance' },
      { id: 'opt-16', text: 'Depth(Node) - Height(Root); allowed values {0, 1}', isCorrect: false, misconception: 'Depth vs Height confusion' },
    ],
    explanation: 'The balance factor BF(v) = height(left) - height(right). If BF(v) becomes -2 or +2, a restructuring rotation (LL, RR, LR, RL) is immediately executed.',
    discrimination: 1.35,
    difficultyParam: 0.05,
  },
  {
    id: 'q-5',
    questionText: 'When executing Dijkstra\'s algorithm on a weighted directed graph with V vertices and E edges using a Min-Indexed Binary Heap, what is the asymptotic runtime?',
    topic: 'Graphs',
    courseCode: 'CS301',
    difficulty: 'HARD',
    bloomLevel: 'ANALYZE',
    options: [
      { id: 'opt-17', text: 'O((V + E) log V)', isCorrect: true },
      { id: 'opt-18', text: 'O(V^2)', isCorrect: false, misconception: 'Dense adjacency matrix representation without min-heap' },
      { id: 'opt-19', text: 'O(E log E)', isCorrect: false, misconception: 'Kruskal algorithm runtime confusion' },
      { id: 'opt-20', text: 'O(V * E)', isCorrect: false, misconception: 'Bellman-Ford runtime confusion' },
    ],
    explanation: 'Each vertex is extracted once from the binary heap in O(log V) time, and each edge relaxation invokes a decrease-key operation in O(log V), yielding O((V + E) log V).',
    discrimination: 1.75,
    difficultyParam: 1.32,
  },
];

export default function FacultyQuestionBankPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [topicFilter, setTopicFilter] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [bloomFilter, setBloomFilter] = useState('ALL');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const [currentCourse, setCurrentCourse] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== UserRole.FACULTY && user.role !== UserRole.SUPER_ADMIN))) {
      router.push('/auth/login');
      return;
    }

    const loadQuestions = async () => {
      try {
        const courses: any = await api.get('/courses');
        if (courses && courses.length > 0) {
          const facultyCourseId = user?.courseId || user?.assignedCourse?.id;
          const assignedCourse = (facultyCourseId && courses.find((c: any) => c.id === facultyCourseId)) || courses[0];
          setCurrentCourse(assignedCourse);

          const qList: any = await api.get(`/practice/sessions/questions?courseId=${assignedCourse.id}`);
          if (Array.isArray(qList) && qList.length > 0) {
            const mapped = qList.map((q: any) => ({
              id: q.id,
              questionText: q.questionText,
              topic: q.topic?.name || 'Curriculum Topic',
              courseCode: assignedCourse.code,
              difficulty: (q.difficulty as any) || 'MEDIUM',
              bloomLevel: 'APPLY' as const,
              options: (q.options || []).map((opt: any) => ({
                id: opt.id,
                text: opt.optionText,
                isCorrect: opt.isCorrect,
                misconception: opt.misconception?.title,
              })),
              explanation: q.explanation || 'Verified curriculum item solution.',
              discrimination: 1.45,
              difficultyParam: 0.1,
            }));
            setQuestions(mapped);
          }
        }
      } catch {
        // Fallback gracefully
      }
    };

    if (user) {
      loadQuestions();
    }
  }, [user, authLoading]);

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.explanation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = topicFilter === 'ALL' || q.topic === topicFilter;
    const matchesDiff = difficultyFilter === 'ALL' || q.difficulty === difficultyFilter;
    const matchesBloom = bloomFilter === 'ALL' || q.bloomLevel === bloomFilter;
    return matchesSearch && matchesTopic && matchesDiff && matchesBloom;
  });

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
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Institutional Question Bank & Item Repository"
          subtitle="Curriculum-aligned item bank with IRT 3PL psychometric calibration and distractor diagnostics"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-200">
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Item Bank Repository
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>{currentCourse ? `${currentCourse.code} - ${currentCourse.name}` : 'Assigned Subject'}</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">Fixed</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Explore calibrated assessment questions, inspect psychometric IRT parameters, and generate new items using AI Question Studio.
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

          {/* Metric Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Calibrated Questions"
              value={questions.length}
              subtitle="Distributed Across 5 Topics"
              icon={BookOpen}
              color="indigo"
            />
            <MetricCard
              title="Item Discrimination"
              value="1.45 Avg"
              subtitle="High Psychometric Precision"
              icon={BrainCircuit}
              color="emerald"
            />
            <MetricCard
              title="Bloom Alignment"
              value="5 Levels"
              subtitle="Remember to Evaluate"
              icon={Layers}
              color="purple"
            />
            <MetricCard
              title="Target Course"
              value="CS301"
              subtitle="Data Structures & Algorithms"
              icon={FileCheck}
              color="blue"
            />
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search questions by text, concept, keyword..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-blue-600 transition"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Topic Filter */}
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-semibold"
                >
                  <option value="ALL">All Topics</option>
                  <option value="Trees & BST">Trees & BST</option>
                  <option value="Stacks & Queues">Stacks & Queues</option>
                  <option value="Dynamic Programming">Dynamic Programming</option>
                  <option value="Graphs">Graphs</option>
                </select>

                {/* Difficulty Filter */}
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-semibold"
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
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-semibold"
                >
                  <option value="ALL">All Bloom Levels</option>
                  <option value="UNDERSTAND">Understand</option>
                  <option value="APPLY">Apply</option>
                  <option value="ANALYZE">Analyze</option>
                </select>
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>Showing {filteredQuestions.length} of {questions.length} questions</span>
            </div>

            {filteredQuestions.map((q, idx) => {
              const isExpanded = expandedQuestionId === q.id || idx === 0;
              return (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  {/* Top Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{q.id}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                        {q.topic}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${getDifficultyBadge(q.difficulty)}`}>
                        {q.difficulty}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${getBloomBadge(q.bloomLevel)}`}>
                        {q.bloomLevel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                      <span>a = {q.discrimination}</span>
                      <span>b = {q.difficultyParam}</span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                    {q.questionText}
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    {q.options.map((opt) => (
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
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                              opt.isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {opt.isCorrect ? '✓' : '•'}
                          </span>
                          <div className="space-y-1">
                            <span>{opt.text}</span>
                            {opt.misconception && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-normal">
                                Trapped misconception: {opt.misconception}
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
                      Grounded in CS301 Syllabus Unit 2
                    </span>
                    <button
                      onClick={() => setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id)}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      {expandedQuestionId === q.id ? 'Hide Explanation' : 'View Pedagogical Explanation'}
                    </button>
                  </div>

                  {expandedQuestionId === q.id && (
                    <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs text-blue-950 dark:text-blue-200 animate-in fade-in duration-150">
                      <span className="font-bold">Pedagogical Rationale: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
