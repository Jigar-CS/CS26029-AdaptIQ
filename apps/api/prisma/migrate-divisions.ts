import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function migrateDivisions() {
  console.log('===================================================');
  console.log('  CLIAS Division Migration: CS Div 1 & CS Div 2');
  console.log('===================================================');

  const allStudents = await prisma.authorizedStudent.findMany({
    orderBy: { enrollmentNumber: 'asc' },
  });

  console.log(`Found ${allStudents.length} total authorized student records.`);

  const csDiv1List: string[] = [];
  const csDiv2List: string[] = [];
  const untouchedList: string[] = [];
  const ambiguousList: { id: string; enrollmentNumber: string; name: string; reason: string }[] = [];

  for (const student of allStudents) {
    const enroll = student.enrollmentNumber.trim().toUpperCase();

    // Check if student belongs to CS cohort
    const isCsCohort = enroll.startsWith('24CS') ||
      ['CSE', 'COMPUTER SCIENCE & ENGINEERING', 'COMPUTER SCIENCE AND ENGINEERING'].includes(
        (student.department || '').trim().toUpperCase()
      );

    if (!isCsCohort) {
      untouchedList.push(`${enroll} (${student.name}) - Department: ${student.department || 'N/A'}, Division: ${student.division}`);
      continue;
    }

    // Extract roll number digits from enrollment (e.g., 24CS001 -> 1, 24CS065 -> 65, 24CS090 -> 90)
    const match = enroll.match(/24CS(\d+)/i) || enroll.match(/(\d+)$/);
    if (!match) {
      ambiguousList.push({
        id: student.id,
        enrollmentNumber: student.enrollmentNumber,
        name: student.name,
        reason: 'Could not extract numeric suffix from enrollment number',
      });
      continue;
    }

    const num = parseInt(match[1], 10);
    if (isNaN(num)) {
      ambiguousList.push({
        id: student.id,
        enrollmentNumber: student.enrollmentNumber,
        name: student.name,
        reason: `Parsed number '${match[1]}' is NaN`,
      });
      continue;
    }

    const targetDivision = num >= 1 && num <= 65 ? 'CS Div 1' : 'CS Div 2';

    if (student.division !== targetDivision) {
      await prisma.authorizedStudent.update({
        where: { id: student.id },
        data: { division: targetDivision },
      });
    }

    if (targetDivision === 'CS Div 1') {
      csDiv1List.push(`${enroll} (#${num}) - ${student.name}`);
    } else {
      csDiv2List.push(`${enroll} (#${num}) - ${student.name}`);
    }
  }

  // Migrate assessments with obsolete division references
  const assessments = await prisma.assessment.findMany();
  let assessmentsMigratedCount = 0;

  for (const a of assessments) {
    if (!a.division) continue;
    const trimmed = a.division.trim();
    let newDiv: string | null = null;

    if (['A', '1', 'DIV 1', 'DIV-1', 'DIV1'].includes(trimmed.toUpperCase())) {
      newDiv = 'CS Div 1';
    } else if (['B', '2', 'DIV 2', 'DIV-2', 'DIV2'].includes(trimmed.toUpperCase())) {
      newDiv = 'CS Div 2';
    }

    if (newDiv && newDiv !== a.division) {
      await prisma.assessment.update({
        where: { id: a.id },
        data: { division: newDiv },
      });
      assessmentsMigratedCount++;
      console.log(`Updated Assessment "${a.title}" division: "${a.division}" -> "${newDiv}"`);
    }
  }

  console.log('---------------------------------------------------');
  console.log(`CS Div 1 Assigned (${csDiv1List.length} students):`);
  csDiv1List.forEach((s) => console.log(`  - ${s}`));

  console.log(`\nCS Div 2 Assigned (${csDiv2List.length} students):`);
  csDiv2List.forEach((s) => console.log(`  - ${s}`));

  console.log(`\nUntouched Other Cohorts (${untouchedList.length} students):`);
  untouchedList.forEach((s) => console.log(`  - ${s}`));

  if (ambiguousList.length > 0) {
    console.warn(`\n⚠️ Ambiguous Unmapped Records (${ambiguousList.length}):`);
    ambiguousList.forEach((a) => console.warn(`  - [${a.enrollmentNumber}] ${a.name}: ${a.reason}`));
  } else {
    console.log('\nAll intended cohort records mapped unambiguously (0 unmapped).');
  }

  console.log(`Assessments updated: ${assessmentsMigratedCount}`);
  console.log('===================================================');

  return {
    csDiv1Count: csDiv1List.length,
    csDiv2Count: csDiv2List.length,
    untouchedCount: untouchedList.length,
    ambiguousCount: ambiguousList.length,
    assessmentsMigratedCount,
  };
}

if (require.main === module) {
  migrateDivisions()
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
