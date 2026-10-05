import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDemoActivity() {
  console.log('🧹 Clearing all student demo activity data...');

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

  console.log('✅ Successfully cleared:');
  console.log(`   - Question Attempts: ${deletedAttempts.count}`);
  console.log(`   - Practice Sessions: ${deletedSessions.count}`);
  console.log(`   - Assessment Submissions: ${deletedSubmissions.count}`);
  console.log(`   - Submission Answers: ${deletedAnswers.count}`);
  console.log(`   - Learning Histories: ${deletedHistories.count}`);
  console.log(`   - Skill Masteries: ${deletedMasteries.count}`);
  console.log(`   - Spaced Schedules: ${deletedSchedules.count}`);
  console.log(`   - Student Misconceptions: ${deletedMisconceptions.count}`);
  console.log(`   - AI Chat Logs: ${deletedConversations.count}`);
  console.log('\n🌟 All student accounts are now fresh at zero baseline!');
}

clearDemoActivity()
  .catch((e) => {
    console.error('Error clearing demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
