import {
  PrismaClient,
  UserRole,
  UserStatus,
  ProctoringViolationType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const STUDENT_NAMES = [
  'Rahul Patel',
  'Priya Sharma',
  'Aarav Desai',
  'Ananya Shah',
  'Devansh Joshi',
  'Diya Mehta',
  'Harshil Trivedi',
  'Isha Verma',
  'Jay Vora',
  'Khushi Parikh',
  'Manan Dave',
  'Neha Kothari',
  'Om Panchal',
  'Pooja Bhatt',
  'Rohan Solanki',
  'Riya Soni',
  'Sahil Makwana',
  'Tanvi Chokshi',
  'Utkarsh Vyas',
  'Vidhi Pandya',
  'Yashraj Jadeja',
  'Aayushi Gohil',
  'Bhavya Zala',
  'Charmi Rana',
  'Dhairya Barot',
  'Esha Prajapati',
  'Fenil Dabhi',
  'Gopi Thakkar',
  'Hitarth Raval',
  'Ishani Ghelani',
  'Jinay Gandhi',
  'Krisha Kapadia',
  'Lakshya Modh',
  'Mahek Sutariya',
  'Naitik Kanani',
  'Nishi Sanghavi',
  'Parth Radadiya',
  'Prachi Moradiya',
  'Raj Dobariya',
  'Riddhi Savaliya',
  'Smit Bhalani',
  'Shreya Gondaliya',
  'Tirth Dalsaniya',
  'Urvi Chothani',
  'Ladva Jay Dhirajlal',
  'Vatsal Khunt',
  'Vrinda Limbasiya',
  'Yash Vavadiya',
  'Zeel Kalsariya',
  'Aum Sorathiya',
];

async function seed50Students() {
  console.log('🚀 Starting Seeding of 50 Students (24CS001 to 24CS050)...');

  // Fetch or create academic structures
  let institute = await prisma.institute.findFirst();
  if (!institute) {
    institute = await prisma.institute.create({
      data: { name: 'Chandubhai S Patel Institute of Technology', code: 'CSPIT' },
    });
  }

  let department = await prisma.department.findFirst({ where: { code: 'CSE' } });
  if (!department) {
    department = await prisma.department.create({
      data: { instituteId: institute.id, name: 'Computer Science and Engineering', code: 'CSE' },
    });
  }

  let course = await prisma.course.findFirst({ where: { code: 'CS301' } });
  const topics = course ? await prisma.topic.findMany({ where: { courseId: course.id } }) : [];

  const createdRecords: any[] = [];

  for (let i = 1; i <= 50; i++) {
    const pad = String(i).padStart(3, '0');
    const enrollment = `24CS${pad}`;
    const name = STUDENT_NAMES[i - 1] || `Student ${enrollment}`;
    const firstName = name.split(' ')[0];
    const passwordPlain = `${firstName.toLowerCase()}@2006`;
    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const email = `${enrollment.toLowerCase()}@charusat.edu.in`;

    // 1. AuthorizedStudent
    let authorized = await prisma.authorizedStudent.findUnique({
      where: { enrollmentNumber: enrollment },
    });

    if (!authorized) {
      authorized = await prisma.authorizedStudent.create({
        data: {
          enrollmentNumber: enrollment,
          name,
          email,
          institute: 'CSPIT',
          department: 'CSE',
          programName: 'B.Tech CSE',
          semester: 4,
          division: i <= 25 ? 'CS Div 1' : 'CS Div 2',
          graduationYear: 2028,
          activated: true,
        },
      });
    } else {
      authorized = await prisma.authorizedStudent.update({
        where: { id: authorized.id },
        data: { name, email, activated: true },
      });
    }

    // 2. User account
    let user = await prisma.user.findFirst({
      where: { OR: [{ email }, { email: `${enrollment.toLowerCase()}@charusat.edu.in` }] },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          emailVerified: true,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, status: UserStatus.ACTIVE },
      });
    }

    // 3. StudentProfile
    const existingWithAuth = await prisma.studentProfile.findUnique({
      where: { authorizedStudentId: authorized.id },
    });
    if (existingWithAuth && existingWithAuth.userId !== user.id) {
      await prisma.studentProfile.delete({ where: { id: existingWithAuth.id } });
    }

    const studentProfile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { authorizedStudentId: authorized.id },
      create: {
        userId: user.id,
        authorizedStudentId: authorized.id,
      },
    });

    // Link user to authorizedStudent if not already linked
    if (!authorized.userId) {
      await prisma.authorizedStudent.update({
        where: { id: authorized.id },
        data: { userId: user.id },
      });
    }

    // 4. Seed Telemetry (Practice Sessions, Masteries, Violations)
    if (course && topics.length > 0) {
      const topic = topics[(i - 1) % topics.length];

      // Skill Mastery
      const masteryScore = 55 + ((i * 7) % 40); // 55% - 95%
      await prisma.skillMastery.upsert({
        where: {
          studentId_topicId: {
            studentId: studentProfile.id,
            topicId: topic.id,
          },
        },
        update: {
          masteryScore,
          attemptCount: 10 + (i % 5),
          correctCount: Math.round((masteryScore / 100) * (10 + (i % 5))),
          lastPracticedAt: new Date(),
        },
        create: {
          studentId: studentProfile.id,
          topicId: topic.id,
          masteryScore,
          attemptCount: 10 + (i % 5),
          correctCount: Math.round((masteryScore / 100) * (10 + (i % 5))),
          lastPracticedAt: new Date(),
        },
      });

      // Practice Sessions
      const sessionsCount = await prisma.practiceSession.count({
        where: { studentId: studentProfile.id },
      });

      if (sessionsCount === 0) {
        const questionsAsked = 5 + (i % 6);
        const correctCount = Math.max(2, questionsAsked - (i % 3));
        await prisma.practiceSession.create({
          data: {
            studentId: studentProfile.id,
            courseId: course.id,
            topicId: topic.id,
            questionsAttempted: questionsAsked,
            correctAnswers: correctCount,
            startedAt: new Date(Date.now() - 3600000 * (i % 48)),
            completedAt: new Date(),
          },
        });
      }

      // Proctoring Sessions & Violations for some students
      const proctoringCount = await prisma.proctoringSession.count({
        where: { studentId: studentProfile.id },
      });

      const assessment = await prisma.assessment.findFirst();

      if (proctoringCount === 0 && assessment) {
        const hasViolations = i % 3 === 0;
        const violationsCount = hasViolations ? 2 + (i % 4) : 0;
        const trustScore = Math.max(50, 100 - violationsCount * 12);

        // Create an assessment submission first
        const submission = await prisma.assessmentSubmission.create({
          data: {
            assessmentId: assessment.id,
            studentId: studentProfile.id,
            attemptNumber: 1,
            startedAt: new Date(Date.now() - 7200000),
            submittedAt: new Date(),
            status: 'EVALUATED' as any,
            totalScore: Math.round(50 + (i % 45)),
            percentage: Math.round(50 + (i % 45)),
            passed: true,
          },
        });

        const procSession = await prisma.proctoringSession.create({
          data: {
            submissionId: submission.id,
            studentId: studentProfile.id,
            trustScore,
            violationsCount,
            status: (hasViolations ? 'FLAGGED' : 'COMPLETED') as any,
          },
        });

        if (hasViolations) {
          await prisma.proctoringViolation.create({
            data: {
              sessionId: procSession.id,
              type: ProctoringViolationType.TAB_SWITCH,
              severity: 'HIGH',
              details: 'Alt+Tab window focus lost during proctored exam',
              timestamp: new Date(Date.now() - 5400000),
            },
          });
          if (violationsCount > 1) {
            await prisma.proctoringViolation.create({
              data: {
                sessionId: procSession.id,
                type: ProctoringViolationType.MULTIPLE_FACES,
                severity: 'MEDIUM',
                details: 'Multiple faces detected in camera frame',
                timestamp: new Date(Date.now() - 3600000),
              },
            });
          }
        }
      }
    }

    createdRecords.push({
      enrollment,
      name,
      email,
      password: passwordPlain,
    });
  }

  console.log(`\n✅ Successfully seeded ${createdRecords.length} students!`);
  console.log('-------------------------------------------------------------');
  console.log('Sample Credentials (Password format: <student_name>@2006):');
  createdRecords.slice(0, 10).forEach((r) => {
    console.log(` - ${r.enrollment} | ${r.name.padEnd(20)} | Email: ${r.email.padEnd(28)} | Pass: ${r.password}`);
  });
  console.log(' ... and 40 more through 24CS050');
  console.log('-------------------------------------------------------------');
}

seed50Students()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
