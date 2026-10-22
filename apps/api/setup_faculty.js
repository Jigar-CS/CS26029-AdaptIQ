const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupFaculty() {
  const faculty = await prisma.user.findUnique({ where: { email: 'faculty@charusat.edu.in' } });
  if (!faculty) return;
  const course = await prisma.course.findFirst({ where: { code: 'CS301' } });
  const dept = await prisma.department.findFirst({ where: { code: 'CSE' } });
  
  await prisma.facultyProfile.upsert({
    where: { userId: faculty.id },
    update: {
      employeeCode: 'EMP_FACULTY_DEMO',
      departmentId: dept?.id,
      courseId: course?.id
    },
    create: {
      userId: faculty.id,
      employeeCode: 'EMP_FACULTY_DEMO',
      departmentId: dept?.id,
      courseId: course?.id
    }
  });

  console.log('Faculty profile configured for faculty@charusat.edu.in');
}

setupFaculty()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
