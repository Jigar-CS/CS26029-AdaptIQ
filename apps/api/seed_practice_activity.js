const { PrismaClient, LearningHistoryReason } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulatePractice() {
  console.log('--- Simulating 8-10 realistic practice questions ---');
  const student = await prisma.user.findUnique({
    where: { email: 'student@charusat.edu.in' },
    include: { studentProfile: true }
  });

  if (!student || !student.studentProfile) {
    console.error('Student profile not found');
    return;
  }

  const studentProfileId = student.studentProfile.id;

  const course = await prisma.course.findFirst({
    where: { code: 'CS301' },
    include: {
      topics: {
        include: {
          questions: {
            include: { options: true }
          }
        }
      }
    }
  });

  if (!course) {
    console.error('CS301 course not found');
    return;
  }

  const session = await prisma.practiceSession.create({
    data: {
      studentId: studentProfileId,
      courseId: course.id,
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(),
      questionsAttempted: 10,
      correctAnswers: 7
    }
  });

  console.log('Created practice session:', session.id);

  const allQuestions = [];
  for (const topic of course.topics) {
    for (const q of topic.questions) {
      if (q.options && q.options.length >= 2) {
        allQuestions.push({ question: q, topic });
      }
    }
  }

  console.log('Available questions pool:', allQuestions.length);

  const selected = allQuestions.slice(0, 10);
  let correctCount = 0;
  let wrongCount = 0;

  for (let i = 0; i < selected.length; i++) {
    const { question, topic } = selected[i];
    const shouldBeCorrect = i % 3 !== 0; 
    const correctOption = question.options.find(o => o.isCorrect) || question.options[0];
    const wrongOption = question.options.find(o => !o.isCorrect) || question.options[1] || question.options[0];
    const selectedOpt = shouldBeCorrect ? correctOption : wrongOption;
    const isCorrect = selectedOpt.isCorrect;

    if (isCorrect) correctCount++;
    else wrongCount++;

    const timeTaken = 20 + Math.floor(Math.random() * 40);

    await prisma.questionAttempt.create({
      data: {
        studentId: studentProfileId,
        practiceSessionId: session.id,
        questionId: question.id,
        selectedOptionId: selectedOpt.id,
        isCorrect,
        timeTakenSeconds: timeTaken,
        createdAt: new Date(Date.now() - (10 - i) * 120000)
      }
    });

    await prisma.learningHistory.create({
      data: {
        studentId: studentProfileId,
        topicId: topic.id,
        masteryScore: 50 + (isCorrect ? 15 : -10) + Math.floor(Math.random() * 8),
        reason: LearningHistoryReason.PRACTICE_ATTEMPT,
        recordedAt: new Date(Date.now() - (10 - i) * 120000)
      }
    });
  }

  const topicScores = [
    { name: 'Arrays', score: 88, correct: 9, attempts: 10 },
    { name: 'Linked Lists', score: 76, correct: 7, attempts: 9 },
    { name: 'Trees', score: 65, correct: 5, attempts: 8 },
    { name: 'Graphs', score: 48, correct: 3, attempts: 7 },
    { name: 'Dynamic Programming', score: 34, correct: 2, attempts: 6 }
  ];

  for (const ts of topicScores) {
    const topic = course.topics.find(t => t.name.toLowerCase().includes(ts.name.toLowerCase()));
    if (topic) {
      await prisma.skillMastery.upsert({
        where: {
          studentId_topicId: {
            studentId: studentProfileId,
            topicId: topic.id
          }
        },
        update: {
          masteryScore: ts.score,
          attemptCount: ts.attempts,
          correctCount: ts.correct,
          lastPracticedAt: new Date(),
          updatedAt: new Date()
        },
        create: {
          studentId: studentProfileId,
          topicId: topic.id,
          masteryScore: ts.score,
          attemptCount: ts.attempts,
          correctCount: ts.correct,
          lastPracticedAt: new Date()
        }
      });
    }
  }

  console.log(`Successfully completed ${selected.length} practice questions (${correctCount} correct, ${wrongCount} wrong).`);
}

simulatePractice()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
