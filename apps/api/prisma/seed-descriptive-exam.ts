import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient, QuestionType, QuestionDifficulty, QuestionStatus, AssessmentType, AssessmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DESCRIPTIVE_QUESTIONS = [
  {
    number: 1,
    title: 'Question 1: Explain ACID Properties in DBMS',
    prompt:
      'Explain the four ACID (Atomicity, Consistency, Isolation, Durability) properties in Database Management Systems (DBMS). Provide a comprehensive real-world banking transaction example illustrating how transaction rollback prevents data inconsistencies.',
    rubric: 'Atomicity (2.5M) • Consistency (2.5M) • Isolation (2.5M) • Durability (2.5M)',
    points: 10.0,
  },
  {
    number: 2,
    title: 'Question 2: Database Normalization (1NF to BCNF)',
    prompt:
      'Explain Database Normalization and anomalies (Insert, Update, Delete) in unnormalized relations. Illustrate progressive decomposition from 1NF, 2NF, 3NF, up to Boyce-Codd Normal Form (BCNF) using an Employee-Project schema.',
    rubric: 'Anomalies Explanation (2M) • 1NF & 2NF (3M) • 3NF & BCNF (3M) • Lossless Decomposition (2M)',
    points: 10.0,
  },
  {
    number: 3,
    title: 'Question 3: SQL vs NoSQL & CAP Theorem',
    prompt:
      'Compare Relational Databases (RDBMS) with NoSQL architectures (Document, Key-Value, Columnar, Graph). State the CAP Theorem (Consistency, Availability, Partition Tolerance) and discuss system design trade-offs in distributed clusters.',
    rubric: 'SQL vs NoSQL Comparison (3M) • 4 NoSQL Types (3M) • CAP Theorem Proof & Trade-offs (4M)',
    points: 10.0,
  },
  {
    number: 4,
    title: 'Question 4: Database Indexing & B+ Trees',
    prompt:
      'Explain how indexing improves query retrieval performance. Compare Clustered vs Non-Clustered Indexes, and describe the internal tree node structure of a B+ Tree index with an insertion and split example.',
    rubric: 'Clustered vs Non-Clustered (3M) • B+ Tree Architecture (4M) • Performance Impact & Overhead (3M)',
    points: 10.0,
  },
  {
    number: 5,
    title: 'Question 5: Concurrency Control & Two-Phase Locking',
    prompt:
      'Describe Concurrency Control in multi-user DBMS environments. Explain Strict Two-Phase Locking (Strict 2PL), Deadlock Detection vs Deadlock Prevention, and contrast 2PL with Timestamp-based Ordering protocols.',
    rubric: 'Serializability & Concurrency (2M) • Strict 2PL Protocol (4M) • Deadlock Handling (2M) • Timestamp Ordering (2M)',
    points: 10.0,
  },
];

async function main() {
  console.log('Seeding 5 Descriptive DBMS Questions and Exam Assessment...');

  // 1. Get or Create Department & Course
  let course = await prisma.course.findFirst({
    where: { code: 'CS302' },
  });

  if (!course) {
    let department = await prisma.department.findFirst();
    if (!department) {
      let institute = await prisma.institute.findFirst();
      if (!institute) {
        institute = await prisma.institute.create({
          data: { name: 'CSPIT Engineering', code: 'CSPIT' },
        });
      }
      department = await prisma.department.create({
        data: {
          name: 'Information Technology',
          code: 'IT',
          instituteId: institute.id,
        },
      });
    }

    course = await prisma.course.create({
      data: {
        code: 'CS302',
        name: 'Database Management Systems & Architecture',
        departmentId: department.id,
        semester: 4,
      },
    });
    console.log(`Created Course: ${course.code} - ${course.name}`);
  } else {
    console.log(`Found Course: ${course.code} - ${course.name}`);
  }

  // 2. Get or Create Topic
  let topic = await prisma.topic.findFirst({
    where: { courseId: course.id },
  });
  if (!topic) {
    topic = await prisma.topic.create({
      data: {
        name: 'Relational Database Architecture & Concurrency',
        slug: 'dbms-core',
        courseId: course.id,
      },
    });
    console.log(`Created Topic: ${topic.name}`);
  }

  // 3. Create or Update 5 Descriptive Questions
  const createdQuestionIds: string[] = [];

  for (const qData of DESCRIPTIVE_QUESTIONS) {
    const questionText = `${qData.title}\n\n${qData.prompt}\n\n[Marking Rubric: ${qData.rubric}]`;

    let question = await prisma.question.findFirst({
      where: {
        courseId: course.id,
        type: QuestionType.SHORT_ANSWER,
        questionText: { contains: qData.title },
      },
    });

    if (!question) {
      question = await prisma.question.create({
        data: {
          courseId: course.id,
          topicId: topic.id,
          type: QuestionType.SHORT_ANSWER,
          difficulty: QuestionDifficulty.MEDIUM,
          questionText: questionText,
          explanation: qData.rubric,
          status: QuestionStatus.APPROVED,
        },
      });
      console.log(`+ Created Q${qData.number}: ${qData.title}`);
    } else {
      console.log(`- Exists Q${qData.number}: ${qData.title}`);
    }
    createdQuestionIds.push(question.id);
  }

  // 4. Create or Update Assessment
  const examCode = 'CS302-DESC-MIDTERM';
  let assessment = await prisma.assessment.findUnique({
    where: { code: examCode },
  });

  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        title: 'DBMS Descriptive Mid-Term Examination',
        description:
          'Proctored mid-term examination containing 5 descriptive theory & architecture questions. Live hand-written response enabled via CLIAS Mobile Writing Companion with continuous downward scroll & proctor exit authorization.',
        code: examCode,
        courseId: course.id,
        type: AssessmentType.MID_TERM,
        status: AssessmentStatus.PUBLISHED,
        durationMinutes: 60,
        totalMarks: 50.0,
        passingMarks: 20.0,
        totalQuestions: 5,
        randomizeQuestions: false,
        allowedAttempts: 3,
        division: 'ALL',
        batch: 'ALL',
      },
    });
    console.log(`Created Assessment: ${assessment.title} (ID: ${assessment.id})`);
  } else {
    console.log(`Found Assessment: ${assessment.title} (ID: ${assessment.id})`);
  }

  // 5. Link Questions to Assessment in sequence Q1 to Q5
  await prisma.assessmentQuestion.deleteMany({
    where: { assessmentId: assessment.id },
  });

  for (let i = 0; i < createdQuestionIds.length; i++) {
    await prisma.assessmentQuestion.create({
      data: {
        assessmentId: assessment.id,
        questionId: createdQuestionIds[i],
        points: 10.0,
        order: i + 1,
      },
    });
  }

  console.log(`Successfully linked ${createdQuestionIds.length} descriptive questions to Assessment ${assessment.code}!`);
  console.log(`\n================================================================`);
  console.log(` Assessment URL in Student Portal: /student/assessments/${assessment.id}/take`);
  console.log(` Assessment Code: ${assessment.code}`);
  console.log(` Total Questions: 5 (10 Marks each = 50 Marks)`);
  console.log(`================================================================\n`);
}

main()
  .catch((e) => {
    console.error('Error seeding descriptive exam:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
