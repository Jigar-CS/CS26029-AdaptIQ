import { PrismaClient, UserRole, UserStatus, QuestionDifficulty, QuestionType, QuestionStatus, LearningHistoryReason } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CLIAS database seeding...');

  // 1. Clear existing records in dependency order
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
