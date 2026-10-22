const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const faculty = await prisma.user.findMany({ where: { role: 'FACULTY' }, select: { id: true, email: true } });
  console.log('Faculty users count:', faculty.length);
  console.log('Faculty users (first 5):', faculty.slice(0, 5));
  
  const assessments = await prisma.assessment.findMany({
    include: {
      proctoringSessions: true,
      creator: { select: { email: true } }
    }
  });
  console.log('Assessments:', assessments.map(a => ({
    id: a.id,
    title: a.title,
    status: a.status,
    creator: a.creator.email,
    sessionsCount: a.proctoringSessions.length
  })));
  
  const student = await prisma.user.findUnique({
    where: { email: 'student@charusat.edu.in' },
    include: {
      studentProfile: true,
      skillMasteries: true,
      learningHistories: true
    }
  });
  console.log('Student found:', !!student);
  if (student) {
    console.log('Student skillMasteries:', student.skillMasteries.length);
    console.log('Student learningHistories:', student.learningHistories.length);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
