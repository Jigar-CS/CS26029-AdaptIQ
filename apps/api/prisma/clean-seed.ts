import { PrismaClient, UserRole } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Step 1/2: Seeding foundational curriculum, courses, questions, and admin...');
  // Run the canonical seed script to populate institutes, departments, courses, questions
  execSync('npx ts-node prisma/seed.ts', { stdio: 'inherit', cwd: process.cwd() });

  console.log('\n🧹 Step 2/2: Purging all student accounts, attempts, submissions, and demo records...');
  const deletedAnswers = await prisma.submissionAnswer.deleteMany();
  const deletedSubmissions = await prisma.assessmentSubmission.deleteMany();
  const deletedAttempts = await prisma.questionAttempt.deleteMany();
  const deletedSessions = await prisma.practiceSession.deleteMany();
  const deletedHistories = await prisma.learningHistory.deleteMany();
  const deletedMasteries = await prisma.skillMastery.deleteMany();
  const deletedSchedules = await prisma.spacedRepetitionSchedule.deleteMany();
  const deletedMisconceptions = await prisma.studentMisconception.deleteMany();
  const deletedMessages = await prisma.aIMessage.deleteMany();
  const deletedConversations = await prisma.aIConversation.deleteMany();
  const deletedAssignments = await prisma.counsellorAssignment.deleteMany();
  const deletedProfiles = await prisma.studentProfile.deleteMany();
  const deletedAuthorized = await prisma.authorizedStudent.deleteMany();
  const deletedStudents = await prisma.user.deleteMany({
    where: { role: UserRole.STUDENT },
  });

  console.log('\n============================================================');
  console.log('🎉 CLEAN DATABASE INITIALIZATION COMPLETE!');
  console.log('============================================================');
  console.log(`   - Student Users Deleted: ${deletedStudents.count}`);
  console.log(`   - Student Profiles Deleted: ${deletedProfiles.count}`);
  console.log(`   - Authorized Students Cleared: ${deletedAuthorized.count}`);
  console.log(`   - Question Attempts Cleared: ${deletedAttempts.count}`);
  console.log(`   - Practice Sessions Cleared: ${deletedSessions.count}`);
  console.log(`   - Submissions Cleared: ${deletedSubmissions.count}`);
  console.log(`   - Skill Masteries & Curve Histories Cleared: ${deletedMasteries.count + deletedHistories.count}`);
  console.log('------------------------------------------------------------');
  console.log('🌟 Current Database State in phpMyAdmin:');
  console.log('   - 0 Students in user table (Completely fresh!)');
  console.log('   - 0 Rows in student_profile table');
  console.log('   - 0 Rows in question_attempt & practice_session tables');
  console.log('   - Courses (DSA, DBMS, OS, CN) & Question Bank Ready');
  console.log('   - Super Admin: admin@charusat.edu.in (Password: clias123)');
  console.log('   - Faculty: faculty@charusat.edu.in (Password: clias123)');
  console.log('============================================================\n');
}

main()
  .catch((e) => {
    console.error('Error during clean seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
