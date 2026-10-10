import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function rebalanceQuestionBank() {
  console.log('--- Starting Question Bank Audit & Rebalance ---');

  // 1. Audit before
  const questionsBefore = await prisma.question.findMany({
    include: { options: { orderBy: { order: 'asc' } }, topic: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total questions in database: ${questionsBefore.length}`);

  // 2. Fix known quality issues with weak distractors (length bias)
  const q1 = await prisma.question.findUnique({
    where: { id: '658ddd76-0c11-4df0-aeed-b81177e99c98' },
    include: { options: true },
  });
  if (q1) {
    for (const opt of q1.options) {
      if (opt.isCorrect) {
        await prisma.questionOption.update({
          where: { id: opt.id },
          data: {
            optionText:
              "Floyd's Cycle-Finding Algorithm (Tortoise and Hare two-pointer)",
          },
        });
      } else if (opt.optionText.includes('Breadth')) {
        await prisma.questionOption.update({
          where: { id: opt.id },
          data: {
            optionText:
              "Brent's Teleporting Search Algorithm with node visitation sets",
          },
        });
      } else if (opt.optionText.includes('Hash')) {
        await prisma.questionOption.update({
          where: { id: opt.id },
          data: {
            optionText:
              'Hash Table Address Tracking with visited node pointers',
          },
        });
      } else if (opt.optionText.includes('Binary')) {
        await prisma.questionOption.update({
          where: { id: opt.id },
          data: {
            optionText:
              'Reversal Traversal Inversion with sentry marker nodes',
          },
        });
      }
    }
    console.log('Fixed distractors for Question 1 (Linked List Cycle Detection).');
  }

  const q2 = await prisma.question.findUnique({
    where: { id: '8a1cef8f-8803-4a4d-8cbd-5d04f9bfe224' },
    include: { options: true },
  });
  if (q2) {
    for (const opt of q2.options) {
      if (!opt.isCorrect && opt.optionText.startsWith('Searching for a key; 0 rotations')) {
        await prisma.questionOption.update({
          where: { id: opt.id },
          data: {
            optionText:
              'Searching for a key along the worst-case path; 0 rotations are required for standard unaugmented BST traversal.',
          },
        });
      }
    }
    console.log('Fixed distractors for Question 2 (BST Rotations).');
  }

  // 3. Rebalance stored order column across all 4-option questions
  // We guarantee:
  // - Correct answer options remain correct (isCorrect stays strictly intact)
  // - Incorrect distractor options remain incorrect
  // - Stored order (0, 1, 2, 3) is cycled across (i % 4) so ~25% of correct answers land on 0 (A), 1 (B), 2 (C), 3 (D)
  let count = 0;
  for (let i = 0; i < questionsBefore.length; i++) {
    const q = questionsBefore[i];
    if (!q.options || q.options.length !== 4) continue;

    const correctOpt = q.options.find((o) => o.isCorrect);
    const distractors = q.options.filter((o) => !o.isCorrect);
    if (!correctOpt || distractors.length !== 3) continue;

    const targetPos = count % 4; // 0=A, 1=B, 2=C, 3=D
    let distIdx = 0;

    for (let pos = 0; pos < 4; pos++) {
      if (pos === targetPos) {
        await prisma.questionOption.update({
          where: { id: correctOpt.id },
          data: { order: pos },
        });
      } else {
        await prisma.questionOption.update({
          where: { id: distractors[distIdx].id },
          data: { order: pos },
        });
        distIdx++;
      }
    }
    count++;
  }

  console.log(`Rebalanced stored options order for ${count} questions.`);

  // 4. Audit after
  const questionsAfter = await prisma.question.findMany({
    include: { options: { orderBy: { order: 'asc' } } },
  });

  const dist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const q of questionsAfter) {
    const idx = q.options.findIndex((o) => o.isCorrect);
    if (idx !== -1 && dist[idx] !== undefined) {
      dist[idx]++;
    }
  }

  console.log('New Correct Answer Position Distribution in DB:');
  console.log(`  Position 0 (Option A): ${dist[0]} (${Math.round((dist[0] / questionsAfter.length) * 100)}%)`);
  console.log(`  Position 1 (Option B): ${dist[1]} (${Math.round((dist[1] / questionsAfter.length) * 100)}%)`);
  console.log(`  Position 2 (Option C): ${dist[2]} (${Math.round((dist[2] / questionsAfter.length) * 100)}%)`);
  console.log(`  Position 3 (Option D): ${dist[3]} (${Math.round((dist[3] / questionsAfter.length) * 100)}%)`);
  console.log('Audit and rebalance complete!');
}

rebalanceQuestionBank()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Rebalance error:', err);
    prisma.$disconnect();
    process.exit(1);
  });
