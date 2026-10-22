const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProctoring() {
  const sessions = await prisma.proctoringSession.findMany({
    include: {
      violations: true,
      submission: {
        include: {
          assessment: true
        }
      },
      student: {
        include: {
          user: true,
          authorizedStudent: true
        }
      }
    }
  });

  console.log('Total proctoring sessions:', sessions.length);
  for (const s of sessions) {
    console.log({
      id: s.id,
      status: s.status,
      trustScore: s.trustScore,
      violationsCount: s.violationsCount,
      violations: s.violations.map(v => ({ type: v.type, severity: v.severity, timestamp: v.timestamp })),
      studentEmail: s.student.user.email,
      assessmentTitle: s.submission?.assessment?.title
    });
  }
}

checkProctoring()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
