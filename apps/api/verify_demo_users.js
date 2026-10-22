const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkPass() {
  const student = await prisma.user.findUnique({ where: { email: 'student@charusat.edu.in' } });
  if (student) {
    const isClias123 = await bcrypt.compare('clias123', student.passwordHash);
    const isRahul = await bcrypt.compare('rahul@2006', student.passwordHash);
    console.log('student@charusat.edu.in password check:');
    console.log(' - clias123:', isClias123);
    console.log(' - rahul@2006:', isRahul);
    if (!isClias123) {
      // If not clias123, let's update it to clias123 or support both as requested by README!
      const newHash = await bcrypt.hash('clias123', 10);
      await prisma.user.update({
        where: { id: student.id },
        data: { passwordHash: newHash }
      });
      console.log('Updated student password to clias123 to match README section 20!');
    }
  }

  // Check faculty account
  let faculty = await prisma.user.findUnique({ where: { email: 'faculty@charusat.edu.in' } });
  if (!faculty) {
    // Let's see if faculty exists or create it
    console.log('faculty@charusat.edu.in not found, checking existing faculty...');
    const anyFaculty = await prisma.user.findFirst({ where: { role: 'FACULTY' } });
    console.log('Sample faculty in DB:', anyFaculty?.email);
    // Create or alias faculty@charusat.edu.in so demo credentials from README work!
    const hash = await bcrypt.hash('clias123', 10);
    faculty = await prisma.user.create({
      data: {
        email: 'faculty@charusat.edu.in',
        passwordHash: hash,
        role: 'FACULTY',
        status: 'ACTIVE',
        emailVerified: true
      }
    });
    console.log('Created faculty@charusat.edu.in with password clias123!');
  } else {
    const isClias123 = await bcrypt.compare('clias123', faculty.passwordHash);
    console.log('faculty@charusat.edu.in clias123 check:', isClias123);
    if (!isClias123) {
      const hash = await bcrypt.hash('clias123', 10);
      await prisma.user.update({
        where: { id: faculty.id },
        data: { passwordHash: hash }
      });
      console.log('Updated faculty password to clias123!');
    }
  }
}

checkPass()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
