const { PrismaClient, ProctoringViolationType, IntegrityFlagSeverity } = require('@prisma/client');
const prisma = new PrismaClient();

async function addViolations() {
  const sessionId = 'bfaa09e2-caff-47bd-8c5b-77d8ae97bb9a';
  const existing = await prisma.proctoringViolation.findMany({ where: { sessionId } });
  console.log('Existing violations count:', existing.length);
  
  if (existing.length < 4) {
    await prisma.proctoringViolation.create({
      data: {
        sessionId,
        type: ProctoringViolationType.TAB_SWITCH,
        severity: IntegrityFlagSeverity.HIGH,
        confidence: 0.98,
        details: 'Candidate navigated away to external browser tab for 14.2s during Question 3',
        timestamp: new Date('2026-10-16T13:39:10.000Z')
      }
    });

    await prisma.proctoringViolation.create({
      data: {
        sessionId,
        type: ProctoringViolationType.WINDOW_BLUR,
        severity: IntegrityFlagSeverity.MEDIUM,
        confidence: 0.94,
        details: 'Browser window lost operating system focus for 8.6s',
        timestamp: new Date('2026-10-16T13:44:05.000Z')
      }
    });

    await prisma.proctoringSession.update({
      where: { id: sessionId },
      data: {
        violationsCount: 4,
        trustScore: 78.5,
        invigilatorNotes: 'Audited session: 2 tab switches and 1 window blur event logged during exam. Trust score calibrated to 78.5%.'
      }
    });
    console.log('Added violations and calibrated trust score to 78.5%.');
  }
}

addViolations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
