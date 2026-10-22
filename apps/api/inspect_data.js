const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function show() {
  const cp = await prisma.codingProblem.findMany({ include: { testCases: true } });
  console.log('Coding problems:', cp.map(p => ({ id: p.id, title: p.title, testCases: p.testCases.length, starterCode: Object.keys(p.starterCode || {}) })));
  
  const as = await prisma.assessment.findMany({ include: { questions: true } });
  console.log('Assessments:', as.map(a => ({ id: a.id, title: a.title, status: a.status, questions: a.questions.length })));

  const student = await prisma.user.findUnique({
    where: { email: 'student@charusat.edu.in' },
    include: {
      studentProfile: {
        include: {
          skillMasteries: { include: { topic: true } },
          learningHistories: true,
          attempts: true
        }
      }
    }
  });

  console.log('Student learning histories:', student?.studentProfile?.learningHistories?.length);
  console.log('Student skill masteries:', student?.studentProfile?.skillMasteries?.map(s => ({ topic: s.topic.name, score: s.masteryScore })));
  console.log('Student attempts:', student?.studentProfile?.attempts?.length);
}

show()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
