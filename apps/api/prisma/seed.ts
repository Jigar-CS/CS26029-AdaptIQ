import {
  PrismaClient,
  UserRole,
  UserStatus,
  QuestionDifficulty,
  QuestionType,
  QuestionStatus,
  LearningHistoryReason,
  MisconceptionCategory,
  SpacedRepetitionStatus,
  AssessmentType,
  AssessmentStatus,
  SubmissionStatus,
  DocumentType,
  DocumentProcessingStatus,
  AtRiskSeverity,
  InterventionStatus,
  ProctoringViolationType,
  ProctoringSessionStatus,
  IntegrityFlagSeverity,
  CareerRoleType,
  ProgrammingLanguage,
  JudgeSubmissionStatus,
  PlagiarismScanStatus,
  PlagiarismVerdict,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CLIAS database seeding...');

  // 1. Clear existing records in dependency order
  await prisma.plagiarismMatch.deleteMany();
  await prisma.plagiarismScan.deleteMany();
  await prisma.codeSubmission.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.codingProblem.deleteMany();
  await prisma.placementMockExam.deleteMany();
  await prisma.studentPlacementProfile.deleteMany();
  await prisma.careerRoleBenchmark.deleteMany();
  await prisma.proctoringViolation.deleteMany();
  await prisma.proctoringSession.deleteMany();
  await prisma.atRiskAlert.deleteMany();
  await prisma.questionCOMapping.deleteMany();
  await prisma.courseOutcomePO.deleteMany();
  await prisma.courseOutcome.deleteMany();
  await prisma.programOutcome.deleteMany();
  await prisma.documentChunk.deleteMany();



  await prisma.courseDocument.deleteMany();
  await prisma.aIGeneratedQuestion.deleteMany();
  await prisma.submissionAnswer.deleteMany();
  await prisma.assessmentSubmission.deleteMany();
  await prisma.assessmentQuestion.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.spacedRepetitionSchedule.deleteMany();
  await prisma.studentMisconception.deleteMany();
  await prisma.misconception.deleteMany();
  await prisma.aIMessage.deleteMany();
  await prisma.aIConversation.deleteMany();
  await prisma.learningResource.deleteMany();
  await prisma.learningHistory.deleteMany();
  await prisma.skillMastery.deleteMany();
  await prisma.questionAttempt.deleteMany();
  await prisma.practiceSession.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.course.deleteMany();
  await prisma.counsellorAssignment.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.facultyProfile.deleteMany();
  await prisma.authorizedStudent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.program.deleteMany();
  await prisma.department.deleteMany();
  await prisma.institute.deleteMany();

  console.log('🧹 Cleaned existing records.');

  // 2. Academic Hierarchy: Institute, Department, Program
  const institute = await prisma.institute.create({
    data: {
      name: 'Chandubhai S Patel Institute of Technology',
      code: 'CSPIT',
    },
  });

  const department = await prisma.department.create({
    data: {
      instituteId: institute.id,
      name: 'Computer Science and Engineering',
      code: 'CSE',
    },
  });

  const program = await prisma.program.create({
    data: {
      departmentId: department.id,
      name: 'Bachelor of Technology in Computer Science & Engineering',
      code: 'BTECH_CSE',
    },
  });

  // 3. Courses
  const dsaCourse = await prisma.course.create({
    data: {
      code: 'CS301',
      name: 'Data Structures and Algorithms',
      departmentId: department.id,
      semester: 3,
    },
  });

  const osCourse = await prisma.course.create({
    data: {
      code: 'CS302',
      name: 'Operating Systems',
      departmentId: department.id,
      semester: 4,
    },
  });

  const dbmsCourse = await prisma.course.create({
    data: {
      code: 'CS303',
      name: 'Database Management Systems',
      departmentId: department.id,
      semester: 4,
    },
  });

  const cnCourse = await prisma.course.create({
    data: {
      code: 'CS304',
      name: 'Computer Networks',
      departmentId: department.id,
      semester: 5,
    },
  });

  const aptCourse = await prisma.course.create({
    data: {
      code: 'HS301',
      name: 'Quantitative Aptitude & Reasoning',
      departmentId: department.id,
      semester: 5,
    },
  });

  // 4. Topics for Data Structures
  const topicsData = [
    { name: 'Arrays', slug: 'arrays' },
    { name: 'Linked Lists', slug: 'linked-lists' },
    { name: 'Stacks', slug: 'stacks' },
    { name: 'Queues', slug: 'queues' },
    { name: 'Trees', slug: 'trees' },
    { name: 'Graphs', slug: 'graphs' },
    { name: 'Dynamic Programming', slug: 'dynamic-programming' },
  ];

  const topics: Record<string, any> = {};
  for (const t of topicsData) {
    const created = await prisma.topic.create({
      data: {
        courseId: dsaCourse.id,
        name: t.name,
        slug: t.slug,
      },
    });
    topics[t.slug] = created;
  }

  // Topics for OS and DBMS
  const osTopicProcess = await prisma.topic.create({
    data: {
      courseId: osCourse.id,
      name: 'Processes & Threads',
      slug: 'processes-threads',
    },
  });

  const dbmsTopicSql = await prisma.topic.create({
    data: {
      courseId: dbmsCourse.id,
      name: 'SQL & Normalization',
      slug: 'sql-normalization',
    },
  });

  console.log('📚 Courses and topics created.');

  // 4b. Seed Approved University Learning Resources (Phase 3)
  for (const slug of Object.keys(topics)) {
    const topic = topics[slug];
    await prisma.learningResource.createMany({
      data: [
        {
          topicId: topic.id,
          title: `CHARUSAT CS301 Lecture Slides: ${topic.name} Invariants & Proofs`,
          description: `Comprehensive slide deck from Department of Computer Science & Engineering covering formal asymptotic bounds, operations, and memory models for ${topic.name}.`,
          resourceType: 'LECTURE_SLIDE' as any,
          url: 'https://charusat.ac.in/curriculum/cs301-slides',
          author: 'Prof. CSE Department (CHARUSAT)',
          estimatedMinutes: 25,
          keyConcepts: JSON.stringify(['time-complexity', 'invariants', 'memory-layout']),
        },
        {
          topicId: topic.id,
          title: `Faculty Problem Solving Walkthrough: Common Pitfalls in ${topic.name}`,
          description: `Detailed video tutorial deconstructing tricky exam problems, common student misconceptions, and edge-case testing in ${topic.name}.`,
          resourceType: 'VIDEO_WALKTHROUGH' as any,
          url: 'https://charusat.ac.in/videos/cs301-pitfalls',
          author: 'Dr. CSE Faculty',
          estimatedMinutes: 18,
          keyConcepts: JSON.stringify(['pitfalls', 'edge-cases', 'debugging']),
        },
        {
          topicId: topic.id,
          title: `${topic.name} Interactive Memory Visualizer`,
          description: `Interactive sandbox stepping through runtime heap allocations and pointer mutations for ${topic.name}.`,
          resourceType: 'CODE_SANDBOX' as any,
          url: 'https://visualgo.net/en',
          author: 'CLIAS Open Courseware',
          estimatedMinutes: 10,
          keyConcepts: JSON.stringify(['visualization', 'sandbox']),
        },
      ],
    });
  }
  console.log('📖 Curated learning resources seeded.');

  // 5. Seed 35+ realistic questions with options
  const questionsData = [
    // --- ARRAYS ---
    {
      courseId: dsaCourse.id,
      topicId: topics['arrays'].id,
      difficulty: QuestionDifficulty.EASY,
      questionText: 'What is the time complexity of accessing an arbitrary element by index in a contiguous array?',
      explanation: 'Arrays allocate memory in contiguous locations. Given base address and element size, calculating index address takes O(1) constant time.',
      options: [
        { text: 'O(1)', isCorrect: true },
        { text: 'O(n)', isCorrect: false },
        { text: 'O(log n)', isCorrect: false },
        { text: 'O(n^2)', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['arrays'].id,
      difficulty: QuestionDifficulty.MEDIUM,
      questionText: 'Which algorithm finds the maximum subarray sum in O(n) time complexity?',
      explanation: "Kadane's algorithm maintains the current subarray sum and resets it to 0 when negative, achieving optimal O(n) time and O(1) space.",
      options: [
        { text: "Kadane's Algorithm", isCorrect: true },
        { text: "Dijkstra's Algorithm", isCorrect: false },
        { text: 'Binary Search', isCorrect: false },
        { text: "Floyd's Cycle Finding", isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['arrays'].id,
      difficulty: QuestionDifficulty.MEDIUM,
      questionText: 'In the Two-Pointer technique on a sorted array, what is the time complexity to find if a target sum exists?',
      explanation: 'With left pointer starting at 0 and right pointer at n-1, each step advances or decrements one pointer, visiting at most n elements in O(n) total steps.',
      options: [
        { text: 'O(n)', isCorrect: true },
        { text: 'O(n log n)', isCorrect: false },
        { text: 'O(n^2)', isCorrect: false },
        { text: 'O(log n)', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['arrays'].id,
      difficulty: QuestionDifficulty.HARD,
      questionText: 'What is the worst-case time complexity of QuickSelect when using Median-of-Medians pivot selection?',
      explanation: 'Median-of-Medians guarantees at least 30% elimination on every partition step, yielding a strictly linear O(n) worst-case time bound.',
      options: [
        { text: 'O(n)', isCorrect: true },
        { text: 'O(n log n)', isCorrect: false },
        { text: 'O(n^2)', isCorrect: false },
        { text: 'O(log n)', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['arrays'].id,
      difficulty: QuestionDifficulty.EASY,
      questionText: 'In an array of size N, what is the time complexity to insert an element at the beginning without shifting?',
      explanation: 'Inserting at the beginning requires shifting all N elements to make space, hence taking O(N) time in a standard array unless a ring buffer is used.',
      options: [
        { text: 'O(n)', isCorrect: true },
        { text: 'O(1)', isCorrect: false },
        { text: 'O(log n)', isCorrect: false },
        { text: 'O(n log n)', isCorrect: false },
      ],
    },

    // --- LINKED LISTS ---
    {
      courseId: dsaCourse.id,
      topicId: topics['linked-lists'].id,
      difficulty: QuestionDifficulty.EASY,
      questionText: 'What is the time complexity to insert a new node at the head of a singly linked list?',
      explanation: 'Creating a node and pointing its next pointer to the current head takes constant O(1) time.',
      options: [
        { text: 'O(1)', isCorrect: true },
        { text: 'O(n)', isCorrect: false },
        { text: 'O(log n)', isCorrect: false },
        { text: 'O(n^2)', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['linked-lists'].id,
      difficulty: QuestionDifficulty.MEDIUM,
      questionText: "What technique detects a cycle in a singly linked list with O(1) auxiliary memory?",
      explanation: "Floyd's Tortoise and Hare algorithm uses two pointers moving at speeds 1 and 2 respectively. They meet if and only if a loop exists.",
      options: [
        { text: "Floyd's Cycle-Finding (Tortoise and Hare)", isCorrect: true },
        { text: 'Breadth First Search', isCorrect: false },
        { text: 'Hash Set Lookup', isCorrect: false },
        { text: 'Binary Inversion', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['linked-lists'].id,
      difficulty: QuestionDifficulty.MEDIUM,
      questionText: 'How can you find the middle node of a singly linked list in a single pass?',
      explanation: 'Use a slow pointer moving 1 step and a fast pointer moving 2 steps. When the fast pointer hits the end, the slow pointer is at the midpoint.',
      options: [
        { text: 'Fast and slow pointer (2x speed)', isCorrect: true },
        { text: 'Iterate twice to count length', isCorrect: false },
        { text: 'Convert to dynamic array', isCorrect: false },
        { text: 'Recursion with stack overflow check', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['linked-lists'].id,
      difficulty: QuestionDifficulty.HARD,
      questionText: 'What is the optimal auxiliary space complexity to reverse a singly linked list iteratively?',
      explanation: 'Iterative reversal only requires three pointers (prev, curr, next) regardless of list length, maintaining O(1) auxiliary space.',
      options: [
        { text: 'O(1)', isCorrect: true },
        { text: 'O(n)', isCorrect: false },
        { text: 'O(log n)', isCorrect: false },
        { text: 'O(n^2)', isCorrect: false },
      ],
    },

    // --- STACKS & QUEUES ---
    {
      courseId: dsaCourse.id,
      topicId: topics['stacks'].id,
      difficulty: QuestionDifficulty.EASY,
      questionText: 'Which abstract data type follows the Last-In First-Out (LIFO) order?',
      explanation: 'A Stack strictly permits additions and removals from the top, enforcing Last-In First-Out semantics.',
      options: [
        { text: 'Stack', isCorrect: true },
        { text: 'Queue', isCorrect: false },
        { text: 'Priority Queue', isCorrect: false },
        { text: 'Binary Heap', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['stacks'].id,
      difficulty: QuestionDifficulty.MEDIUM,
      questionText: 'What data structure is typically used to solve the "Next Greater Element" problem in O(n) time?',
      explanation: 'A Monotonic Stack maintains elements in strictly decreasing order, allowing linear-time determination of each element’s next greater neighbour.',
      options: [
        { text: 'Monotonic Stack', isCorrect: true },
        { text: 'Binary Search Tree', isCorrect: false },
        { text: 'Queue', isCorrect: false },
        { text: 'Min Heap', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['queues'].id,
      difficulty: QuestionDifficulty.EASY,
      questionText: 'Which principle governs a standard linear Queue?',
      explanation: 'Queues enforce First-In First-Out (FIFO) semantics, where items are enqueued at the rear and dequeued from the front.',
      options: [
        { text: 'FIFO (First-In First-Out)', isCorrect: true },
        { text: 'LIFO (Last-In First-Out)', isCorrect: false },
        { text: 'Random Access', isCorrect: false },
        { text: 'Key-Value Pairing', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['queues'].id,
      difficulty: QuestionDifficulty.MEDIUM,
      questionText: 'How many standard stacks are required to implement a FIFO queue?',
      explanation: 'Two stacks (inbox and outbox) allow amortized O(1) push and pop operations to mimic a queue.',
      options: [
        { text: '2', isCorrect: true },
        { text: '1', isCorrect: false },
        { text: '3', isCorrect: false },
        { text: '4', isCorrect: false },
      ],
    },

    // --- TREES ---
    {
      courseId: dsaCourse.id,
      topicId: topics['trees'].id,
      difficulty: QuestionDifficulty.EASY,
      questionText: 'What is the maximum number of children any node can have in a binary tree?',
      explanation: 'By definition, a binary tree node possesses at most two children: left and right.',
      options: [
        { text: '2', isCorrect: true },
        { text: '1', isCorrect: false },
        { text: '3', isCorrect: false },
        { text: 'Any arbitrary number', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['trees'].id,
      difficulty: QuestionDifficulty.MEDIUM,
      questionText: 'Which tree traversal visits the root node BETWEEN its left and right subtrees?',
      explanation: 'In-order traversal follows: Left subtree -> Root -> Right subtree. For a BST, this yields sorted keys.',
      options: [
        { text: 'In-order Traversal', isCorrect: true },
        { text: 'Pre-order Traversal', isCorrect: false },
        { text: 'Post-order Traversal', isCorrect: false },
        { text: 'Level-order Traversal', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['trees'].id,
      difficulty: QuestionDifficulty.MEDIUM,
      questionText: 'What is the worst-case search time complexity in a skewed Binary Search Tree of N nodes?',
      explanation: 'When keys are inserted in strictly ascending or descending order, a BST degenerates into a singly linked list with O(n) search time.',
      options: [
        { text: 'O(n)', isCorrect: true },
        { text: 'O(log n)', isCorrect: false },
        { text: 'O(n log n)', isCorrect: false },
        { text: 'O(1)', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['trees'].id,
      difficulty: QuestionDifficulty.HARD,
      questionText: 'What is the height balance factor invariant for any node in an AVL Tree?',
      explanation: 'In an AVL Tree, the height difference between the left and right subtrees of any node must be within {-1, 0, +1}.',
      options: [
        { text: '|Height(left) - Height(right)| <= 1', isCorrect: true },
        { text: '|Height(left) - Height(right)| == 0', isCorrect: false },
        { text: 'Height(left) > Height(right)', isCorrect: false },
        { text: 'No height constraints exist', isCorrect: false },
      ],
    },

    // --- GRAPHS ---
    {
      courseId: dsaCourse.id,
      topicId: topics['graphs'].id,
      difficulty: QuestionDifficulty.EASY,
      questionText: 'Which algorithm uses a queue to visit all vertices reachable from a source level by level?',
      explanation: 'Breadth-First Search (BFS) uses a FIFO queue to systematically explore nodes in order of increasing distance from the root.',
      options: [
        { text: 'Breadth-First Search (BFS)', isCorrect: true },
        { text: 'Depth-First Search (DFS)', isCorrect: false },
        { text: "Kruskal's Algorithm", isCorrect: false },
        { text: 'Binary Search', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['graphs'].id,
      difficulty: QuestionDifficulty.MEDIUM,
      questionText: 'What is the time complexity of Dijkstra’s algorithm using a Fibonacci or Min-Priority Queue on a graph G(V, E)?',
      explanation: 'Using an adjacency list and binary/Fibonacci heap, Dijkstra runs in O((V + E) log V) time.',
      options: [
        { text: 'O((V + E) log V)', isCorrect: true },
        { text: 'O(V^2)', isCorrect: false },
        { text: 'O(V * E)', isCorrect: false },
        { text: 'O(V!)', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['graphs'].id,
      difficulty: QuestionDifficulty.HARD,
      questionText: 'Which algorithm detects negative weight cycles in a directed graph?',
      explanation: 'The Bellman-Ford algorithm relaxes all edges V-1 times. A subsequent relaxation that reduces distance indicates a negative weight cycle.',
      options: [
        { text: 'Bellman-Ford Algorithm', isCorrect: true },
        { text: "Dijkstra's Algorithm", isCorrect: false },
        { text: "Prim's Algorithm", isCorrect: false },
        { text: 'Topological Sort', isCorrect: false },
      ],
    },

    // --- DYNAMIC PROGRAMMING ---
    {
      courseId: dsaCourse.id,
      topicId: topics['dynamic-programming'].id,
      difficulty: QuestionDifficulty.MEDIUM,
      questionText: 'What two fundamental characteristics signify that a problem can be solved using Dynamic Programming?',
      explanation: 'DP applies exclusively to problems exhibiting Overlapping Subproblems and Optimal Substructure.',
      options: [
        { text: 'Optimal Substructure and Overlapping Subproblems', isCorrect: true },
        { text: 'Greedy Choice and Constant Time', isCorrect: false },
        { text: 'Divide-and-Conquer and Hash Maps', isCorrect: false },
        { text: 'Disjoint Sets and Linear Ordering', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['dynamic-programming'].id,
      difficulty: QuestionDifficulty.MEDIUM,
      questionText: 'What is the time complexity to solve the 0/1 Knapsack Problem with N items and capacity W via DP?',
      explanation: 'The standard dynamic programming matrix has dimensions (N+1) x (W+1), requiring O(N * W) pseudo-polynomial time.',
      options: [
        { text: 'O(N * W)', isCorrect: true },
        { text: 'O(2^N)', isCorrect: false },
        { text: 'O(N log W)', isCorrect: false },
        { text: 'O(W^2)', isCorrect: false },
      ],
    },
    {
      courseId: dsaCourse.id,
      topicId: topics['dynamic-programming'].id,
      difficulty: QuestionDifficulty.HARD,
      questionText: 'What is the time complexity of finding the Longest Increasing Subsequence (LIS) of an array of size N using binary search patience sorting?',
      explanation: 'By maintaining an array of tails and performing binary search for each element, LIS can be found in optimal O(N log N) time.',
      options: [
        { text: 'O(N log N)', isCorrect: true },
        { text: 'O(N^2)', isCorrect: false },
        { text: 'O(N)', isCorrect: false },
        { text: 'O(2^N)', isCorrect: false },
      ],
    },

    // --- OS & DBMS ---
    {
      courseId: osCourse.id,
      topicId: osTopicProcess.id,
      difficulty: QuestionDifficulty.EASY,
      questionText: 'Which state transition occurs when a running process requests an I/O operation?',
      explanation: 'When a running process needs I/O, it leaves the CPU and enters the Blocked/Waiting state until the I/O event completes.',
      options: [
        { text: 'Running -> Waiting / Blocked', isCorrect: true },
        { text: 'Running -> Ready', isCorrect: false },
        { text: 'Waiting -> Terminated', isCorrect: false },
        { text: 'Ready -> Terminated', isCorrect: false },
      ],
    },
    {
      courseId: dbmsCourse.id,
      topicId: dbmsTopicSql.id,
      difficulty: QuestionDifficulty.MEDIUM,
      questionText: 'Which normal form eliminates partial functional dependencies on candidate keys?',
      explanation: 'Second Normal Form (2NF) mandates that the relation is in 1NF and no non-prime attribute is partially dependent on any candidate key.',
      options: [
        { text: 'Second Normal Form (2NF)', isCorrect: true },
        { text: 'First Normal Form (1NF)', isCorrect: false },
        { text: 'Third Normal Form (3NF)', isCorrect: false },
        { text: 'Boyce-Codd Normal Form (BCNF)', isCorrect: false },
      ],
    },
  ];

  const createdQuestions = [];
  for (const q of questionsData) {
    const question = await prisma.question.create({
      data: {
        courseId: q.courseId,
        topicId: q.topicId,
        difficulty: q.difficulty,
        questionText: q.questionText,
        explanation: q.explanation,
        status: QuestionStatus.APPROVED,
        options: {
          create: q.options.map((opt, idx) => ({
            optionText: opt.text,
            isCorrect: opt.isCorrect,
            order: idx,
          })),
        },
      },
      include: { options: true },
    });
    createdQuestions.push(question);
  }

  console.log(`❓ Seeded ${createdQuestions.length} technical questions.`);

  // 6. Create Demo Users across all roles
  const passwordHash = await bcrypt.hash('clias123', 10);

  // SUPER ADMIN
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@charusat.edu.in',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  // FACULTY
  const facultyUser = await prisma.user.create({
    data: {
      email: 'faculty@charusat.edu.in',
      passwordHash,
      role: UserRole.FACULTY,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      facultyProfile: {
        create: {
          employeeCode: 'EMP_CSE_042',
          departmentId: department.id,
        },
      },
    },
  });

  // COUNSELLOR
  const counsellorUser = await prisma.user.create({
    data: {
      email: 'counsellor@charusat.edu.in',
      passwordHash,
      role: UserRole.COUNSELLOR,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  // HOD
  const hodUser = await prisma.user.create({
    data: {
      email: 'hod@charusat.edu.in',
      passwordHash,
      role: UserRole.HOD,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  // HEAD
  const headUser = await prisma.user.create({
    data: {
      email: 'head@charusat.edu.in',
      passwordHash,
      role: UserRole.HEAD,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  // AUTHORIZED STUDENT & DEMO STUDENT ACCOUNT
  const authorizedRahul = await prisma.authorizedStudent.create({
    data: {
      enrollmentNumber: '24CS001',
      name: 'Rahul Patel',
      email: 'student@charusat.edu.in',
      institute: 'CSPIT',
      department: 'CSE',
      programName: 'B.Tech CSE',
      semester: 5,
      division: 'A',
      graduationYear: 2028,
      activated: true,
    },
  });

  // Additional pre-imported authorized students for import testing
  const sampleAuthorized = [
    { num: '24CS002', name: 'Priya Sharma', email: 'priya@charusat.edu.in', div: 'A' },
    { num: '24CS003', name: 'Aarav Desai', email: 'aarav@charusat.edu.in', div: 'B' },
    { num: '24CS004', name: 'Ananya Shah', email: 'ananya@charusat.edu.in', div: 'B' },
    { num: '24CS005', name: 'Devansh Joshi', email: 'devansh@charusat.edu.in', div: 'A' },
  ];

  for (const s of sampleAuthorized) {
    await prisma.authorizedStudent.create({
      data: {
        enrollmentNumber: s.num,
        name: s.name,
        email: s.email,
        institute: 'CSPIT',
        department: 'CSE',
        programName: 'B.Tech CSE',
        semester: 5,
        division: s.div,
        graduationYear: 2028,
        activated: false,
      },
    });
  }

  // Active student user linked to Rahul Patel
  const studentUser = await prisma.user.create({
    data: {
      email: 'student@charusat.edu.in',
      passwordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  const studentProfile = await prisma.studentProfile.create({
    data: {
      userId: studentUser.id,
      authorizedStudentId: authorizedRahul.id,
    },
  });

  await prisma.authorizedStudent.update({
    where: { id: authorizedRahul.id },
    data: { userId: studentUser.id },
  });

  // Link counsellor assignment to student
  await prisma.counsellorAssignment.create({
    data: {
      counsellorId: counsellorUser.id,
      studentId: studentProfile.id,
    },
  });

  console.log('👥 Demo users and profiles seeded.');

  // 7. Seed realistic skill masteries and attempts for demo student
  const dsaQuestions = createdQuestions.filter((q) => q.courseId === dsaCourse.id);

  // Arrays: 91%
  await prisma.skillMastery.create({
    data: {
      studentId: studentProfile.id,
      topicId: topics['arrays'].id,
      masteryScore: 91.0,
      attemptCount: 14,
      correctCount: 13,
      lastPracticedAt: new Date(Date.now() - 3600 * 1000 * 4),
    },
  });

  // Linked Lists: 74%
  await prisma.skillMastery.create({
    data: {
      studentId: studentProfile.id,
      topicId: topics['linked-lists'].id,
      masteryScore: 74.0,
      attemptCount: 10,
      correctCount: 8,
      lastPracticedAt: new Date(Date.now() - 3600 * 1000 * 24),
    },
  });

  // Trees: 68%
  await prisma.skillMastery.create({
    data: {
      studentId: studentProfile.id,
      topicId: topics['trees'].id,
      masteryScore: 68.0,
      attemptCount: 8,
      correctCount: 5,
      lastPracticedAt: new Date(Date.now() - 3600 * 1000 * 48),
    },
  });

  // Graphs: 47% (Weak)
  await prisma.skillMastery.create({
    data: {
      studentId: studentProfile.id,
      topicId: topics['graphs'].id,
      masteryScore: 47.0,
      attemptCount: 6,
      correctCount: 2,
      lastPracticedAt: new Date(Date.now() - 3600 * 1000 * 72),
    },
  });

  // Dynamic Programming: 31% (Weak)
  await prisma.skillMastery.create({
    data: {
      studentId: studentProfile.id,
      topicId: topics['dynamic-programming'].id,
      masteryScore: 31.0,
      attemptCount: 5,
      correctCount: 1,
      lastPracticedAt: new Date(Date.now() - 3600 * 1000 * 96),
    },
  });

  // 8. Seed Learning History progression curve over time
  const historyMilestones = [
    { daysAgo: 14, topic: topics['arrays'].id, score: 45 },
    { daysAgo: 12, topic: topics['arrays'].id, score: 62 },
    { daysAgo: 10, topic: topics['linked-lists'].id, score: 50 },
    { daysAgo: 8, topic: topics['arrays'].id, score: 78 },
    { daysAgo: 7, topic: topics['trees'].id, score: 48 },
    { daysAgo: 5, topic: topics['linked-lists'].id, score: 68 },
    { daysAgo: 4, topic: topics['trees'].id, score: 68 },
    { daysAgo: 3, topic: topics['graphs'].id, score: 40 },
    { daysAgo: 2, topic: topics['arrays'].id, score: 91 },
    { daysAgo: 1, topic: topics['dynamic-programming'].id, score: 31 },
  ];

  for (const h of historyMilestones) {
    await prisma.learningHistory.create({
      data: {
        studentId: studentProfile.id,
        topicId: h.topic,
        masteryScore: h.score,
        recordedAt: new Date(Date.now() - h.daysAgo * 86400 * 1000),
        reason: LearningHistoryReason.PRACTICE_ATTEMPT,
      },
    });
  }

  // 9. Seed recent practice session and attempts
  const demoSession = await prisma.practiceSession.create({
    data: {
      studentId: studentProfile.id,
      courseId: dsaCourse.id,
      topicId: topics['arrays'].id,
      difficulty: QuestionDifficulty.MEDIUM,
      questionsAttempted: 3,
      correctAnswers: 3,
      completedAt: new Date(),
    },
  });

  for (let i = 0; i < 3; i++) {
    const q = dsaQuestions[i];
    const correctOpt = q.options.find((o) => o.isCorrect);
    await prisma.questionAttempt.create({
      data: {
        studentId: studentProfile.id,
        questionId: q.id,
        practiceSessionId: demoSession.id,
        selectedOptionId: correctOpt?.id,
        isCorrect: true,
        timeTakenSeconds: 24 + i * 12,
        attemptNumber: 1,
        difficultyAtAttempt: q.difficulty,
        createdAt: new Date(Date.now() - (3 - i) * 600 * 1000),
      },
    });
  }

  // 10. Seed Misconceptions & Taxonomy (Phase 4)
  const seededMisconceptions = [
    {
      code: 'MIS_ARR_01',
      title: 'Index Out-of-Bounds & Maximum Index Confusion',
      description: 'Confusing 0-indexed array upper boundary (length - 1) with array length (size), leading to Off-By-One errors or runtime exceptions.',
      category: MisconceptionCategory.OFF_BY_ONE_ERROR,
      remediationAdvice: 'Remember 0-indexed systems store N elements at positions 0 through N-1. In loops, use < array.length instead of <= array.length.',
      topicId: topics['arrays'].id,
    },
    {
      code: 'MIS_LL_01',
      title: 'Dangling Node & Pointer Overwrite',
      description: 'Overwriting current.next pointer before saving reference to downstream sublist, causing orphaned nodes in memory.',
      category: MisconceptionCategory.POINTER_REFERENCE_CONFUSION,
      remediationAdvice: 'Always declare a temporary pointer `ListNode nextTemp = current.next` before mutating `current.next`.',
      topicId: topics['linked-lists'].id,
    },
    {
      code: 'MIS_TREE_01',
      title: 'Local vs Global BST Invariant Misunderstanding',
      description: 'Checking only immediate children (left < root < right) without enforcing that ALL left subtree values are strictly smaller than root.',
      category: MisconceptionCategory.BOUNDARY_EDGE_CASE,
      remediationAdvice: 'Validate BST using min/max bounds passed down recursively (low < node.val < high).',
      topicId: topics['trees'].id,
    },
    {
      code: 'MIS_GRAPH_01',
      title: 'Dijkstra on Negative Edge Weights',
      description: 'Applying Dijkstra greedy relaxation when negative edge weights are present, which yields incorrect shortest paths.',
      category: MisconceptionCategory.CONCEPTUAL_CONFUSION,
      remediationAdvice: 'Use Bellman-Ford or SPFA when negative edge weights can occur; Dijkstra relies on non-decreasing path costs.',
      topicId: topics['graphs'].id,
    },
    {
      code: 'MIS_DP_01',
      title: 'Greedy Choice Fallacy in Optimal Substructure',
      description: 'Assuming locally optimal choice leads to globally optimal solution without verifying matroid or exchange property.',
      category: MisconceptionCategory.COMPLEXITY_MISCALCULATION,
      remediationAdvice: 'Draw the recursion decision tree. If taking a sub-optimal choice now unlocks larger gains later, use Dynamic Programming.',
      topicId: topics['dynamic-programming'].id,
    },
  ];

  for (const m of seededMisconceptions) {
    const createdMis = await prisma.misconception.upsert({
      where: { code: m.code },
      update: m,
      create: m,
    });

    // Link to distractor options if topic matches
    const topicQuestions = createdQuestions.filter((q) => q.topicId === m.topicId);
    if (topicQuestions.length > 0) {
      const wrongOption = topicQuestions[0].options.find((o) => !o.isCorrect);
      if (wrongOption) {
        await prisma.questionOption.update({
          where: { id: wrongOption.id },
          data: { misconceptionId: createdMis.id },
        });
      }
    }
  }

  // Seed student detected misconceptions
  const graphMisconception = await prisma.misconception.findUnique({ where: { code: 'MIS_GRAPH_01' } });
  const dpMisconception = await prisma.misconception.findUnique({ where: { code: 'MIS_DP_01' } });

  if (graphMisconception) {
    await prisma.studentMisconception.upsert({
      where: {
        studentId_misconceptionId: {
          studentId: studentProfile.id,
          misconceptionId: graphMisconception.id,
        },
      },
      update: { occurrenceCount: 3, resolved: false },
      create: {
        studentId: studentProfile.id,
        misconceptionId: graphMisconception.id,
        occurrenceCount: 3,
        resolved: false,
        lastDetectedAt: new Date(Date.now() - 3600 * 1000 * 5),
      },
    });
  }

  if (dpMisconception) {
    await prisma.studentMisconception.upsert({
      where: {
        studentId_misconceptionId: {
          studentId: studentProfile.id,
          misconceptionId: dpMisconception.id,
        },
      },
      update: { occurrenceCount: 2, resolved: false },
      create: {
        studentId: studentProfile.id,
        misconceptionId: dpMisconception.id,
        occurrenceCount: 2,
        resolved: false,
        lastDetectedAt: new Date(Date.now() - 3600 * 1000 * 20),
      },
    });
  }

  // 11. Seed Spaced Repetition Schedules (Ebbinghaus review queues)
  const spacedTopics = [
    { topicId: topics['graphs'].id, interval: 1, ease: 2.1, status: SpacedRepetitionStatus.DUE, daysDelta: -1 },
    { topicId: topics['dynamic-programming'].id, interval: 2, ease: 2.3, status: SpacedRepetitionStatus.DUE, daysDelta: 0 },
    { topicId: topics['trees'].id, interval: 7, ease: 2.5, status: SpacedRepetitionStatus.UPCOMING, daysDelta: 3 },
    { topicId: topics['arrays'].id, interval: 21, ease: 2.8, status: SpacedRepetitionStatus.MASTERED, daysDelta: 14 },
  ];

  for (const s of spacedTopics) {
    await prisma.spacedRepetitionSchedule.upsert({
      where: {
        studentId_topicId: {
          studentId: studentProfile.id,
          topicId: s.topicId,
        },
      },
      update: {
        intervalDays: s.interval,
        easeFactor: s.ease,
        status: s.status,
        nextReviewDate: new Date(Date.now() + s.daysDelta * 86400 * 1000),
      },
      create: {
        studentId: studentProfile.id,
        topicId: s.topicId,
        intervalDays: s.interval,
        easeFactor: s.ease,
        status: s.status,
        repetitionNumber: s.status === SpacedRepetitionStatus.MASTERED ? 3 : 1,
        nextReviewDate: new Date(Date.now() + s.daysDelta * 86400 * 1000),
        lastReviewedDate: new Date(Date.now() - 3 * 86400 * 1000),
      },
    });
  }

  // 12. Seed Assessments & Submissions (Phase 5)
  const facultyProfile = await prisma.facultyProfile.findFirst();

  const assessmentQuiz = await prisma.assessment.create({
    data: {
      title: 'CS301 Mid-Semester Quiz: Linear & Non-Linear Structures',
      description: 'Departmental timed benchmark testing array manipulation, pointer semantics, recursion, and search tree invariants.',
      code: 'CS301-QUIZ-01',
      courseId: dsaCourse.id,
      facultyId: facultyProfile?.id,
      type: AssessmentType.QUIZ,
      status: AssessmentStatus.PUBLISHED,
      durationMinutes: 20,
      totalMarks: 100,
      passingMarks: 40,
      totalQuestions: 5,
      randomizeQuestions: true,
      allowedAttempts: 2,
    },
  });

  const selectedFiveQuestions = createdQuestions.slice(0, 5);
  for (let i = 0; i < selectedFiveQuestions.length; i++) {
    await prisma.assessmentQuestion.create({
      data: {
        assessmentId: assessmentQuiz.id,
        questionId: selectedFiveQuestions[i].id,
        points: 20.0,
        order: i + 1,
      },
    });
  }

  // Create a completed demo submission for Rahul Patel
  const demoSubmission = await prisma.assessmentSubmission.create({
    data: {
      assessmentId: assessmentQuiz.id,
      studentId: studentProfile.id,
      attemptNumber: 1,
      startedAt: new Date(Date.now() - 3600 * 1000 * 2),
      submittedAt: new Date(Date.now() - 3600 * 1000 * 2 + 14 * 60 * 1000),
      status: SubmissionStatus.EVALUATED,
      totalScore: 80.0,
      percentage: 80.0,
      passed: true,
    },
  });

  for (let i = 0; i < selectedFiveQuestions.length; i++) {
    const q = selectedFiveQuestions[i];
    const isCorrect = i !== 1; // question 2 answered wrong
    const correctOpt = q.options.find((o) => o.isCorrect);
    const wrongOpt = q.options.find((o) => !o.isCorrect);

    await prisma.submissionAnswer.create({
      data: {
        submissionId: demoSubmission.id,
        questionId: q.id,
        selectedOptionId: isCorrect ? correctOpt?.id : wrongOpt?.id,
        isCorrect,
        pointsAwarded: isCorrect ? 20.0 : 0.0,
        timeSpentSeconds: 150 + i * 20,
      },
    });
  }

  // Seed Phase 9 Proctoring Session & Violations
  const proctoringSession = await prisma.proctoringSession.create({
    data: {
      submissionId: demoSubmission.id,
      studentId: studentProfile.id,
      status: ProctoringSessionStatus.COMPLETED,
      faceEnrollmentVerified: true,
      enrolledAt: new Date(Date.now() - 3600 * 1000 * 2 - 5 * 60 * 1000),
      startedAt: new Date(Date.now() - 3600 * 1000 * 2),
      completedAt: new Date(Date.now() - 3600 * 1000 * 2 + 14 * 60 * 1000),
      trustScore: 89.5,
      violationsCount: 2,
      invigilatorNotes: 'Minor focus loss detected during Question 2; verified benign window readjustment. Trust score intact.',
      violations: {
        create: [
          {
            type: ProctoringViolationType.TAB_SWITCH,
            severity: IntegrityFlagSeverity.MEDIUM,
            confidence: 0.98,
            timestamp: new Date(Date.now() - 3600 * 1000 * 2 + 4 * 60 * 1000),
            details: 'Browser focus transferred to background window for 3.2 seconds during question 2.',
            resolved: true,
          },
          {
            type: ProctoringViolationType.NO_FACE,
            severity: IntegrityFlagSeverity.LOW,
            confidence: 0.92,
            timestamp: new Date(Date.now() - 3600 * 1000 * 2 + 9 * 60 * 1000),
            details: 'Webcam feed lost facial keypoints momentarily for 1.8 seconds (head tilt down).',
            resolved: true,
          },
        ],
      },
    },
  });

  // 13. Seed Course Documents & RAG Chunks (Phase 7)

  const syllabusDoc = await prisma.courseDocument.create({
    data: {
      courseId: dsaCourse.id,
      title: 'CS301 Official Course Syllabus & Unit Learning Outcomes',
      fileName: 'CS301_Syllabus_2026.pdf',
      fileType: 'PDF',
      documentType: DocumentType.SYLLABUS,
      fileSizeKb: 345,
      rawText: 'Course Overview: Data Structures & Algorithms. Unit 1: Asymptotic notation, Master Theorem. Unit 2: Linear Data Structures: Arrays, Linked Lists, Stacks, Queues. Unit 3: Non-Linear Structures: Trees, BST, AVL Trees, Heaps. Unit 4: Graph Algorithms: BFS, DFS, Dijkstra, Bellman-Ford. Unit 5: Dynamic Programming & Greedy Paradigms.',
      status: DocumentProcessingStatus.INDEXED,
      chunkCount: 2,
    },
  });

  const lectureDoc = await prisma.courseDocument.create({
    data: {
      courseId: dsaCourse.id,
      title: 'Lecture 04: AVL Tree Balancing, Rotations, and Proof of O(log N) Height',
      fileName: 'CS301_Lecture04_AVL.pdf',
      fileType: 'PDF',
      documentType: DocumentType.LECTURE_NOTES,
      fileSizeKb: 890,
      rawText: 'An AVL tree is a self-balancing binary search tree where the difference between heights of left and right subtrees cannot exceed 1 for all nodes. Rebalancing is achieved through single (LL, RR) or double (LR, RL) rotations. The maximum height of an AVL tree with N nodes is bounded by 1.44 * log2(N + 2) - 0.328, strictly guaranteeing O(log N) search, insertion, and deletion.',
      status: DocumentProcessingStatus.INDEXED,
      chunkCount: 3,
    },
  });

  const lectureChunks = [
    {
      chunkIndex: 0,
      content: 'Definition: An AVL tree is a self-balancing binary search tree where the height difference (balance factor BF = height(left) - height(right)) cannot exceed 1 for any node. Allowed balance factors are strictly {-1, 0, +1}.',
      tokenCount: 42,
      topicKeywords: 'AVL, balance factor, self-balancing, binary search tree',
    },
    {
      chunkIndex: 1,
      content: 'Rebalancing Mechanisms: When an insertion or deletion causes BF to become +2 or -2, tree rotations are performed. Single Right Rotation (LL) corrects left-heavy insertion. Single Left Rotation (RR) corrects right-heavy insertion. Double rotations (LR and RL) resolve zigzag imbalances.',
      tokenCount: 48,
      topicKeywords: 'rotations, LL rotation, RR rotation, LR rotation, RL rotation, rebalancing',
    },
    {
      chunkIndex: 2,
      content: 'Asymptotic Guarantees: The worst-case height of an AVL tree with N nodes satisfies H <= 1.44 log2(N + 2). Thus lookup, insertion, and deletion operations strictly run in O(log N) time and O(log N) stack space.',
      tokenCount: 44,
      topicKeywords: 'time complexity, height bound, logarithmic scaling, worst-case',
    },
  ];

  for (const c of lectureChunks) {
    await prisma.documentChunk.create({
      data: {
        documentId: lectureDoc.id,
        chunkIndex: c.chunkIndex,
        content: c.content,
        tokenCount: c.tokenCount,
        topicKeywords: c.topicKeywords,
      },
    });
  }

  // ==============================================================================
  // Phase 8: University Institutional Analytics & OBE (Course/Program Outcomes)
  // ==============================================================================
  const po1 = await prisma.programOutcome.create({
    data: {
      departmentId: department.id,
      code: 'PO1',
      description: 'Engineering Knowledge: Apply knowledge of mathematics and computing fundamentals to complex engineering problems.',
      nbaCategory: 'Engineering Knowledge',
    },
  });

  const po2 = await prisma.programOutcome.create({
    data: {
      departmentId: department.id,
      code: 'PO2',
      description: 'Problem Analysis: Identify, formulate, and analyze algorithmic problems reaching substantiated conclusions.',
      nbaCategory: 'Problem Analysis',
    },
  });

  const po3 = await prisma.programOutcome.create({
    data: {
      departmentId: department.id,
      code: 'PO3',
      description: 'Design/Development of Solutions: Design solutions for complex algorithmic problems with verified time-space trade-offs.',
      nbaCategory: 'Design/Development of Solutions',
    },
  });

  const po4 = await prisma.programOutcome.create({
    data: {
      departmentId: department.id,
      code: 'PO4',
      description: 'Conduct Investigations: Use research-based knowledge to analyze data structures and algorithmic invariants.',
      nbaCategory: 'Conduct Investigations',
    },
  });

  const co1 = await prisma.courseOutcome.create({
    data: {
      courseId: dsaCourse.id,
      code: 'CO1',
      description: 'Analyze asymptotic complexity and space bounds for linear and contiguous memory data structures.',
      targetAttainment: 0.70,
      actualAttainment: 0.78,
    },
  });

  const co2 = await prisma.courseOutcome.create({
    data: {
      courseId: dsaCourse.id,
      code: 'CO2',
      description: 'Implement and calibrate balanced search trees with strict rotational invariant preservation.',
      targetAttainment: 0.70,
      actualAttainment: 0.72,
    },
  });

  const co3 = await prisma.courseOutcome.create({
    data: {
      courseId: dsaCourse.id,
      code: 'CO3',
      description: 'Formulate optimal dynamic programming and memoization state transitions for multi-stage decision problems.',
      targetAttainment: 0.70,
      actualAttainment: 0.54, // Lagging CO for intervention demonstration
    },
  });

  const co4 = await prisma.courseOutcome.create({
    data: {
      courseId: dsaCourse.id,
      code: 'CO4',
      description: 'Formulate graph traversal, topological sorting, and shortest-path models for connected systems.',
      targetAttainment: 0.70,
      actualAttainment: 0.66,
    },
  });

  // CO-PO Matrix Mappings (NBA/NAAC correlation: 1: Low, 2: Moderate, 3: Substantial)
  await prisma.courseOutcomePO.createMany({
    data: [
      { courseOutcomeId: co1.id, programOutcomeId: po1.id, correlationLevel: 3 },
      { courseOutcomeId: co1.id, programOutcomeId: po2.id, correlationLevel: 3 },
      { courseOutcomeId: co2.id, programOutcomeId: po2.id, correlationLevel: 2 },
      { courseOutcomeId: co2.id, programOutcomeId: po3.id, correlationLevel: 3 },
      { courseOutcomeId: co3.id, programOutcomeId: po1.id, correlationLevel: 2 },
      { courseOutcomeId: co3.id, programOutcomeId: po2.id, correlationLevel: 3 },
      { courseOutcomeId: co3.id, programOutcomeId: po3.id, correlationLevel: 3 },
      { courseOutcomeId: co4.id, programOutcomeId: po2.id, correlationLevel: 3 },
      { courseOutcomeId: co4.id, programOutcomeId: po3.id, correlationLevel: 2 },
      { courseOutcomeId: co4.id, programOutcomeId: po4.id, correlationLevel: 2 },
    ],
  });

  // Map existing questions to Course Outcomes
  if (createdQuestions.length >= 4) {
    await prisma.questionCOMapping.createMany({
      data: [
        { questionId: createdQuestions[0].id, courseOutcomeId: co1.id, weight: 1.0 },
        { questionId: createdQuestions[1].id, courseOutcomeId: co1.id, weight: 1.0 },
        { questionId: createdQuestions[2].id, courseOutcomeId: co2.id, weight: 1.0 },
        { questionId: createdQuestions[3].id, courseOutcomeId: co2.id, weight: 1.0 },
      ],
      skipDuplicates: true,
    });
  }

  // Seed At-Risk Student Predictive Alerts
  await prisma.atRiskAlert.createMany({
    data: [
      {
        studentId: studentProfile.id,
        severity: AtRiskSeverity.HIGH,
        status: InterventionStatus.PENDING,
        triggerReason: 'Critical mastery deficiency in Dynamic Programming (31% mastery) paired with 7 days of practice inactivity following 3 consecutive distractor traps on recursion invariants.',
        suggestedIntervention: 'Prescribe Socratic interactive recursion walkthrough and schedule 1-on-1 counsellor academic advisory session.',
      },
      {
        studentId: studentProfile.id,
        severity: AtRiskSeverity.MEDIUM,
        status: InterventionStatus.IN_PROGRESS,
        triggerReason: 'Recurrent misconception detected in AVL Tree rotation invariants (Boundary Edge Case failure rate > 50%).',
        suggestedIntervention: 'Direct student to Lecture 04 RAG slides and assign targeted balanced-tree remediation pack.',
        actionNotes: 'Counsellor initiated notification; mentee reviewed Lecture 04 Slide Chunk 1.',
      },
    ],
  });

  // ==============================================================================
  // Phase 10: Career & Placement Readiness
  // ==============================================================================
  const sdeBenchmark = await prisma.careerRoleBenchmark.create({
    data: {
      roleType: CareerRoleType.SDE,
      title: 'Software Development Engineer (Tier-1 Product)',
      description: 'Core algorithmic problem solving, recursive invariant formulation, balanced trees, and dynamic programming mastery required by top-tier product firms.',
      targetMastery: 80.0,
      salaryRange: '12 - 28 LPA',
      hiringPartners: 'Google, Microsoft, Amazon, Oracle, Adobe, Atlassian',
      requiredSkills: JSON.stringify([
        { topicSlug: 'arrays-dynamic-arrays', topicName: 'Arrays & Dynamic Arrays', minMastery: 85, weight: 1.2 },
        { topicSlug: 'linked-lists-pointers', topicName: 'Linked Lists & Pointers', minMastery: 75, weight: 1.0 },
        { topicSlug: 'trees-binary-search-trees', topicName: 'Trees & Balanced Search Trees', minMastery: 80, weight: 1.2 },
        { topicSlug: 'dynamic-programming', topicName: 'Dynamic Programming', minMastery: 75, weight: 1.3 },
        { topicSlug: 'graph-algorithms', topicName: 'Graph Algorithms & Shortest Paths', minMastery: 70, weight: 1.1 },
      ]),
    },
  });

  const daBenchmark = await prisma.careerRoleBenchmark.create({
    data: {
      roleType: CareerRoleType.DATA_ANALYST,
      title: 'Data Analyst & Business Intelligence Specialist',
      description: 'Relational database querying, normalization, SQL window functions, statistical partitioning, and schema indexing.',
      targetMastery: 75.0,
      salaryRange: '8 - 18 LPA',
      hiringPartners: 'Deloitte, Fractal, Mu Sigma, PwC, TCS Digital',
      requiredSkills: JSON.stringify([
        { topicSlug: 'arrays-dynamic-arrays', topicName: 'Structured Data Containers', minMastery: 70, weight: 1.0 },
        { topicSlug: 'dbms-sql', topicName: 'Relational DBMS & SQL Optimization', minMastery: 85, weight: 1.5 },
      ]),
    },
  });

  const mlBenchmark = await prisma.careerRoleBenchmark.create({
    data: {
      roleType: CareerRoleType.ML_ENGINEER,
      title: 'Machine Learning & Applied AI Engineer',
      description: 'Vector embeddings, mathematical gradient optimization, asymptotic evaluation, and high-performance algorithms.',
      targetMastery: 85.0,
      salaryRange: '14 - 35 LPA',
      hiringPartners: 'NVIDIA, Intel, Qualcomm, Zomato, Swiggy, Uber',
      requiredSkills: JSON.stringify([
        { topicSlug: 'arrays-dynamic-arrays', topicName: 'Contiguous Matrix Operations', minMastery: 85, weight: 1.2 },
        { topicSlug: 'dynamic-programming', topicName: 'Optimization Paradigms', minMastery: 80, weight: 1.4 },
        { topicSlug: 'graph-algorithms', topicName: 'Graph Neural Formulations', minMastery: 75, weight: 1.1 },
      ]),
    },
  });

  // Seed Student Placement Profile for Rahul Patel
  await prisma.studentPlacementProfile.create({
    data: {
      studentId: studentProfile.id,
      targetRole: CareerRoleType.SDE,
      overallReadinessScore: 67.5,
      verifiedSkillsCount: 2, // Arrays: 91%, Trees: 68%
      skillGapsCount: 2,      // DP: 31%, Graph: 47%
    },
  });

  // Seed Placement Mock Exam
  await prisma.placementMockExam.create({
    data: {
      roleType: CareerRoleType.SDE,
      companyProfile: 'Google Tier-1 Algorithmic Simulation',
      title: 'Google SDE Campus Hiring Simulation: Invariants & Complexity',
      description: 'Realistic 45-minute timed technical screening with multi-case algorithmic complexity verification.',
      totalQuestions: 5,
      durationMinutes: 45,
      passingScore: 75.0,
      difficulty: QuestionDifficulty.HARD,
    },
  });

  // ============================================================================
  // Phase 11: In-Browser Coding Problems & Judge Test Cases
  // ============================================================================

  const probTwoSum = await prisma.codingProblem.create({
    data: {
      slug: 'two-sum',
      title: 'Two Sum',
      description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
      difficulty: QuestionDifficulty.EASY,
      tags: 'Array, Hash Table, Two Pointers',
      constraints: '• 2 <= nums.length <= 10^4\n• -10^9 <= nums[i] <= 10^9\n• -10^9 <= target <= 10^9\n• Only one valid answer exists.',
      hints: JSON.stringify([
        'A brute force approach scans all pairs in O(N^2) time. Can you do it in O(N) using a Hash Map?',
        'As you iterate through the array, check if target - nums[i] is already in your lookup map.',
      ]),
      starterCodes: JSON.stringify({
        PYTHON: 'def twoSum(nums: list[int], target: int) -> list[int]:\n    # Write your solution here\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []\n',
        JAVASCRIPT: 'function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const diff = target - nums[i];\n        if (map.has(diff)) return [map.get(diff), i];\n        map.set(nums[i], i);\n    }\n    return [];\n}',
        CPP: '#include <vector>\n#include <unordered_map>\n\nstd::vector<int> twoSum(std::vector<int>& nums, int target) {\n    std::unordered_map<int, int> map;\n    for (int i = 0; i < nums.size(); i++) {\n        int diff = target - nums[i];\n        if (map.count(diff)) return {map[diff], i};\n        map[nums[i]] = i;\n    }\n    return {};\n}',
        JAVA: 'import java.util.HashMap;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        HashMap<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int diff = target - nums[i];\n            if (map.containsKey(diff)) return new int[] { map.get(diff), i };\n            map.put(nums[i], i);\n        }\n        return new int[0];\n    }\n}',
      }),
      testCases: {
        create: [
          {
            input: 'nums = [2, 7, 11, 15], target = 9',
            expectedOutput: '[0, 1]',
            isHidden: false,
            explanation: 'nums[0] + nums[1] == 2 + 7 == 9, return [0, 1].',
            order: 1,
          },
          {
            input: 'nums = [3, 2, 4], target = 6',
            expectedOutput: '[1, 2]',
            isHidden: false,
            explanation: 'nums[1] + nums[2] == 2 + 4 == 6, return [1, 2].',
            order: 2,
          },
          {
            input: 'nums = [3, 3], target = 6',
            expectedOutput: '[0, 1]',
            isHidden: true,
            explanation: 'Boundary test with identical duplicate values.',
            order: 3,
          },
        ],
      },
    },
  });

  const probValidParentheses = await prisma.codingProblem.create({
    data: {
      slug: 'valid-parentheses',
      title: 'Valid Parentheses',
      description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
      difficulty: QuestionDifficulty.EASY,
      tags: 'Stack, String, Bracket Matching',
      constraints: '• 1 <= s.length <= 10^4\n• s consists of parentheses only: ()[]{}',
      hints: JSON.stringify([
        'Use a LIFO stack to remember the most recently opened bracket.',
        'When you encounter a closing bracket, check if it matches the top element of the stack.',
      ]),
      starterCodes: JSON.stringify({
        PYTHON: 'def isValid(s: str) -> bool:\n    stack = []\n    mapping = {")": "(", "}": "{", "]": "["}\n    for char in s:\n        if char in mapping:\n            top = stack.pop() if stack else "#"\n            if mapping[char] != top:\n                return False\n        else:\n            stack.append(char)\n    return not stack\n',
        JAVASCRIPT: 'function isValid(s) {\n    const stack = [];\n    const map = { ")": "(", "}": "{", "]": "[" };\n    for (const char of s) {\n        if (map[char]) {\n            if (stack.pop() !== map[char]) return false;\n        } else {\n            stack.push(char);\n        }\n    }\n    return stack.length === 0;\n}',
        CPP: '#include <string>\n#include <stack>\n#include <unordered_map>\n\nbool isValid(std::string s) {\n    std::stack<char> st;\n    std::unordered_map<char, char> map = {{\')\', \'(\'}, {\'}\', \'{\'}, {\']\', \'[\'}};\n    for (char c : s) {\n        if (map.count(c)) {\n            if (st.empty() || st.top() != map[c]) return false;\n            st.pop();\n        } else {\n            st.push(c);\n        }\n    }\n    return st.empty();\n}',
        JAVA: 'import java.util.Stack;\n\nclass Solution {\n    public boolean isValid(String s) {\n        Stack<Character> stack = new Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == \'(\') stack.push(\')\');\n            else if (c == \'{\') stack.push(\'}\');\n            else if (c == \'[\') stack.push(\']\');\n            else if (stack.isEmpty() || stack.pop() != c) return false;\n        }\n        return stack.isEmpty();\n    }\n}',
      }),
      testCases: {
        create: [
          {
            input: 's = "()"',
            expectedOutput: 'true',
            isHidden: false,
            order: 1,
          },
          {
            input: 's = "()[]{}"',
            expectedOutput: 'true',
            isHidden: false,
            order: 2,
          },
          {
            input: 's = "(]"',
            expectedOutput: 'false',
            isHidden: false,
            order: 3,
          },
        ],
      },
    },
  });

  // Seed Code Submissions for Rahul Patel & Demo Peer
  const subA = await prisma.codeSubmission.create({
    data: {
      studentId: studentProfile.id,
      problemId: probTwoSum.id,
      language: ProgrammingLanguage.PYTHON,
      sourceCode: 'def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []',
      status: JudgeSubmissionStatus.ACCEPTED,
      executionTimeMs: 48,
      memoryUsedKb: 14200,
      testCasesPassed: 3,
      totalTestCases: 3,
      judgeDetails: JSON.stringify([
        { testCase: 1, status: 'PASSED', timeMs: 14, output: '[0, 1]' },
        { testCase: 2, status: 'PASSED', timeMs: 16, output: '[1, 2]' },
        { testCase: 3, status: 'PASSED', timeMs: 18, output: '[0, 1]' },
      ]),
    },
  });

  const subB = await prisma.codeSubmission.create({
    data: {
      studentId: studentProfile.id,
      problemId: probTwoSum.id,
      language: ProgrammingLanguage.PYTHON,
      sourceCode: 'def twoSum(nums, target):\n    lookup = {}\n    for idx, val in enumerate(nums):\n        complement = target - val\n        if complement in lookup:\n            return [lookup[complement], idx]\n        lookup[val] = idx\n    return []',
      status: JudgeSubmissionStatus.ACCEPTED,
      executionTimeMs: 44,
      memoryUsedKb: 14100,
      testCasesPassed: 3,
      totalTestCases: 3,
      judgeDetails: JSON.stringify([
        { testCase: 1, status: 'PASSED', timeMs: 12, output: '[0, 1]' },
        { testCase: 2, status: 'PASSED', timeMs: 15, output: '[1, 2]' },
        { testCase: 3, status: 'PASSED', timeMs: 17, output: '[0, 1]' },
      ]),
    },
  });

  // Seed Phase 12 Plagiarism Scan & Match
  const plagiarismScan = await prisma.plagiarismScan.create({
    data: {
      problemId: probTwoSum.id,
      threshold: 70.0,
      totalSubmissionsScanned: 2,
      flaggedPairsCount: 1,
      status: PlagiarismScanStatus.COMPLETED,
    },
  });

  await prisma.plagiarismMatch.create({
    data: {
      scanId: plagiarismScan.id,
      submissionAId: subA.id,
      submissionBId: subB.id,
      similarityScore: 88.5,
      matchedTokensCount: 24,
      verdict: PlagiarismVerdict.FLAGGED,
      facultyNotes: 'Near-identical variable renaming and hash map loop structure detected via winnowing AST fingerprint.',
      fingerprintOverlap: JSON.stringify([
        { startA: 2, endA: 7, startB: 2, endB: 7, matchType: 'STRUCTURAL_HASH_EQUIVALENCE' },
      ]),
    },
  });

  console.log('🔍 Seeded Phase 12 Code Plagiarism Scan, AST Fingerprints, and Pairwise Matches.');
  console.log('💻 Seeded Phase 11 Coding Problems, Test Cases, and Automated Judge Submissions.');
  console.log('🚀 Seeded Phase 10 Career Role Benchmarks, Skill Gap Profile, and Placement Mock Exam.');
  console.log('🏛️ Seeded Phase 8 OBE Program Outcomes, Course Outcomes, and At-Risk Predictive Alerts.');
  console.log('📚 Seeded Phase 7 Course Documents and RAG Semantic Chunks.');
  console.log('📝 Seeded Phase 5 Assessment, Questions, and Student Submission.');
  console.log('🧠 Seeded Phase 4 Misconceptions and Spaced Repetition Schedules.');
  console.log('📈 Seeded realistic attempts, mastery, and learning curve.');
  console.log('✅ CLIAS Database Seeding Complete!');
}


main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
