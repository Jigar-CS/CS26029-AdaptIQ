import {
  PrismaClient,
  UserRole,
  UserStatus,
  QuestionDifficulty,
  QuestionType,
  CognitiveLevel,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initializing CLIAS Clean System Foundation (No fake attempts, 0 user activity)...');

  // 1. Clean all tables
  console.log('🧹 Dropping existing records...');
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

  // 2. Academic Hierarchy
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
      degreeLevel: 'UNDERGRADUATE',
      totalSemesters: 8,
    },
  });

  // 3. Curriculum Courses
  const dsaCourse = await prisma.course.create({
    data: {
      departmentId: department.id,
      code: 'CS301',
      name: 'Data Structures and Algorithms',
      description: 'Comprehensive study of linear and non-linear data structures, asymptotic notation, and algorithmic paradigms.',
      credits: 4,
      semester: 5,
    },
  });

  const dbmsCourse = await prisma.course.create({
    data: {
      departmentId: department.id,
      code: 'CS302',
      name: 'Database Management Systems',
      description: 'Relational data models, normalization, indexing, transaction processing, and SQL optimization.',
      credits: 4,
      semester: 5,
    },
  });

  const osCourse = await prisma.course.create({
    data: {
      departmentId: department.id,
      code: 'CS303',
      name: 'Operating Systems',
      description: 'Process scheduling, concurrency, virtual memory management, file systems, and distributed OS.',
      credits: 4,
      semester: 5,
    },
  });

  const cnCourse = await prisma.course.create({
    data: {
      departmentId: department.id,
      code: 'CS304',
      name: 'Computer Networks',
      description: 'OSI and TCP/IP protocol suites, routing algorithms, transport layer congestion control, and network security.',
      credits: 4,
      semester: 5,
    },
  });

  // 4. Topics for DSA
  const topicNames = [
    { name: 'Arrays & Dynamic Sizing', slug: 'arrays' },
    { name: 'Linked Lists & Pointers', slug: 'linked-lists' },
    { name: 'Stacks & Queues', slug: 'stacks-queues' },
    { name: 'Binary Trees & Traversals', slug: 'trees' },
    { name: 'Binary Search Trees (BST)', slug: 'bst' },
    { name: 'Graphs & Graph Algorithms', slug: 'graphs' },
    { name: 'Dynamic Programming', slug: 'dynamic-programming' },
  ];

  const topics: Record<string, any> = {};
  for (const t of topicNames) {
    const topic = await prisma.topic.create({
      data: {
        courseId: dsaCourse.id,
        name: t.name,
        slug: t.slug,
      },
    });
    topics[t.slug] = topic;
  }

  // 5. Question Bank
  const questionsData = [
    {
      topic: topics['arrays'].id,
      stem: 'What is the time complexity of searching for an element in an unsorted array of size N?',
      difficulty: QuestionDifficulty.EASY,
      cognitive: CognitiveLevel.REMEMBER,
      options: [
        { text: 'O(1)', isCorrect: false },
        { text: 'O(log N)', isCorrect: false },
        { text: 'O(N)', isCorrect: true },
        { text: 'O(N log N)', isCorrect: false },
      ],
      explanation: 'In an unsorted array, linear search requires examining up to N elements.',
    },
    {
      topic: topics['arrays'].id,
      stem: 'Which array traversal algorithm solves the Maximum Subarray Sum in O(N) time?',
      difficulty: QuestionDifficulty.MEDIUM,
      cognitive: CognitiveLevel.APPLY,
      options: [
        { text: "Kadane's Algorithm", isCorrect: true },
        { text: "Dijkstra's Algorithm", isCorrect: false },
        { text: "Floyd's Cycle Algorithm", isCorrect: false },
        { text: "Kruskal's Algorithm", isCorrect: false },
      ],
      explanation: "Kadane's algorithm computes the running maximum subarray ending at index i in linear time.",
    },
    {
      topic: topics['linked-lists'].id,
      stem: 'Which two-pointer technique detects a cycle in a singly linked list?',
      difficulty: QuestionDifficulty.EASY,
      cognitive: CognitiveLevel.UNDERSTAND,
      options: [
        { text: 'Floyd Tortoise and Hare algorithm', isCorrect: true },
        { text: 'Boyer-Moore Voting algorithm', isCorrect: false },
        { text: 'Tarjan Strongly Connected algorithm', isCorrect: false },
        { text: 'Bellman-Ford algorithm', isCorrect: false },
      ],
      explanation: 'Floyd Tortoise and Hare algorithm uses slow and fast pointers to detect cycles in O(N) time and O(1) space.',
    },
    {
      topic: topics['trees'].id,
      stem: 'What traversal of a Binary Search Tree (BST) produces keys in ascending sorted order?',
      difficulty: QuestionDifficulty.EASY,
      cognitive: CognitiveLevel.REMEMBER,
      options: [
        { text: 'Inorder Traversal (Left, Root, Right)', isCorrect: true },
        { text: 'Preorder Traversal (Root, Left, Right)', isCorrect: false },
        { text: 'Postorder Traversal (Left, Right, Root)', isCorrect: false },
        { text: 'Level-order Traversal', isCorrect: false },
      ],
      explanation: 'Inorder traversal of any valid BST visits left subtree, root, then right subtree, producing ascending values.',
    },
    {
      topic: topics['dynamic-programming'].id,
      stem: 'What are the two core properties required to solve a problem with Dynamic Programming?',
      difficulty: QuestionDifficulty.MEDIUM,
      cognitive: CognitiveLevel.ANALYZE,
      options: [
        { text: 'Optimal Substructure and Overlapping Subproblems', isCorrect: true },
        { text: 'Greedy Choice Property and Divide and Conquer', isCorrect: false },
        { text: 'Disjoint Sets and Topological Ordering', isCorrect: false },
        { text: 'Amortized Constant Time and Self-Balancing', isCorrect: false },
      ],
      explanation: 'DP applies when optimal solutions to subproblems form the overall optimal solution, and subproblems recur repeatedly.',
    },
  ];

  for (const q of questionsData) {
    await prisma.question.create({
      data: {
        courseId: dsaCourse.id,
        topicId: q.topic,
        stem: q.stem,
        difficulty: q.difficulty,
        cognitiveLevel: q.cognitive,
        type: QuestionType.MULTIPLE_CHOICE,
        explanation: q.explanation,
        options: {
          create: q.options,
        },
      },
    });
  }

  // 6. Base Administrative & Faculty Accounts (No dummy student, NO fake attempts)
  const passwordHash = await bcrypt.hash('clias123', 10);

  // Super Admin
  await prisma.user.create({
    data: {
      email: 'admin@charusat.edu.in',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  // Faculty
  await prisma.user.create({
    data: {
      email: 'faculty@charusat.edu.in',
      passwordHash,
      role: UserRole.FACULTY,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      facultyProfile: {
        create: {
          employeeCode: 'EMP_CSE_001',
          departmentId: department.id,
        },
      },
    },
  });

  // Authorized student records for university email registration testing
  const sampleAuthorized = [
    { num: '24CS001', name: 'Student One', email: 'student1@charusat.edu.in', div: 'A' },
    { num: '24CS002', name: 'Student Two', email: 'student2@charusat.edu.in', div: 'A' },
    { num: '24CS003', name: 'Student Three', email: 'student3@charusat.edu.in', div: 'B' },
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

  console.log('✅ Clean system foundation initialized successfully!');
  console.log('   - 0 student attempts / 0 practice sessions');
  console.log('   - 0 topic masteries / 0 learning histories');
  console.log('   - Super Admin: admin@charusat.edu.in (Password: clias123)');
  console.log('   - Faculty: faculty@charusat.edu.in (Password: clias123)');
  console.log('   - Ready for genuine student registrations!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
