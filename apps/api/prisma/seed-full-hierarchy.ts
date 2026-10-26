import {
  PrismaClient,
  UserRole,
  UserStatus,
  QuestionDifficulty,
  QuestionType,
  QuestionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// In-memory cache for bcrypt password hashes to ensure ultra-fast execution over cloud network
const passwordHashCache = new Map<string, string>();
async function getPasswordHash(plain: string): Promise<string> {
  let hash = passwordHashCache.get(plain);
  if (!hash) {
    hash = await bcrypt.hash(plain, 10);
    passwordHashCache.set(plain, hash);
  }
  return hash;
}

// Realistic Indian Student & Faculty Names Pool
const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Dhruv', 'Kabir', 'Rohan', 'Jay', 'Devansh', 'Harshil', 'Manan', 'Om', 'Sahil', 'Utkarsh',
  'Yashraj', 'Fenil', 'Hitarth', 'Jinay', 'Lakshya', 'Naitik', 'Parth', 'Raj', 'Smit', 'Tirth',
  'Vatsal', 'Yash', 'Aum', 'Karan', 'Chirag', 'Het', 'Meet', 'Keval', 'Dhyan', 'Bhavya',
  'Diya', 'Ananya', 'Isha', 'Khushi', 'Neha', 'Pooja', 'Riya', 'Tanvi', 'Vidhi', 'Aayushi',
  'Charmi', 'Esha', 'Gopi', 'Ishani', 'Krisha', 'Mahek', 'Nishi', 'Prachi', 'Riddhi', 'Shreya',
  'Urvi', 'Vrinda', 'Zeel', 'Priya', 'Kavya', 'Sneha', 'Bhoomi', 'Dhara', 'Mansi', 'Heli',
];

const LAST_NAMES = [
  'Patel', 'Shah', 'Sharma', 'Desai', 'Joshi', 'Mehta', 'Trivedi', 'Verma', 'Vora', 'Parikh',
  'Dave', 'Kothari', 'Panchal', 'Bhatt', 'Solanki', 'Soni', 'Makwana', 'Chokshi', 'Vyas', 'Pandya',
  'Jadeja', 'Gohil', 'Zala', 'Rana', 'Barot', 'Prajapati', 'Dabhi', 'Thakkar', 'Raval', 'Ghelani',
  'Gandhi', 'Kapadia', 'Modh', 'Sutariya', 'Kanani', 'Sanghavi', 'Radadiya', 'Moradiya', 'Dobariya', 'Savaliya',
  'Bhalani', 'Gondaliya', 'Dalsaniya', 'Chothani', 'Khunt', 'Limbasiya', 'Vavadiya', 'Kalsariya', 'Sorathiya', 'Chauhan',
];

function generateStudentName(idx: number): { fullName: string; firstName: string } {
  const f = FIRST_NAMES[idx % FIRST_NAMES.length];
  const l = LAST_NAMES[Math.floor(idx / FIRST_NAMES.length) % LAST_NAMES.length];
  return { fullName: `${f} ${l}`, firstName: f };
}

// 7 Departments Config across CSPIT and DEPSTAR
const DEPARTMENTS_CONFIG = [
  // CSPIT
  {
    instituteCode: 'CSPIT',
    deptCode: 'CSE',
    deptName: 'Computer Science and Engineering',
    emailPrefix: 'cs',
    rollPrefix: 'CS',
    courses: [
      { code: 'CS301', name: 'Data Structures and Algorithms', sem: 3 },
      { code: 'CS302', name: 'Operating Systems', sem: 4 },
      { code: 'CS303', name: 'Database Management Systems', sem: 4 },
      { code: 'CS304', name: 'Computer Networks', sem: 5 },
      { code: 'CS305', name: 'Theory of Computation', sem: 5 },
      { code: 'CS306', name: 'Software Engineering', sem: 6 },
    ],
  },
  {
    instituteCode: 'CSPIT',
    deptCode: 'CE',
    deptName: 'Computer Engineering',
    emailPrefix: 'ce',
    rollPrefix: 'CE',
    courses: [
      { code: 'CE301', name: 'Object Oriented Programming with Java', sem: 3 },
      { code: 'CE302', name: 'Computer Organization & Architecture', sem: 4 },
      { code: 'CE303', name: 'Digital Electronics & Logic Design', sem: 4 },
      { code: 'CE304', name: 'Microprocessor & Interfaces', sem: 5 },
      { code: 'CE305', name: 'Embedded Systems & IoT', sem: 5 },
      { code: 'CE306', name: 'Cloud Computing & Virtualization', sem: 6 },
    ],
  },
  {
    instituteCode: 'CSPIT',
    deptCode: 'IT',
    deptName: 'Information Technology',
    emailPrefix: 'it',
    rollPrefix: 'IT',
    courses: [
      { code: 'IT301', name: 'Web Technologies & Frameworks', sem: 3 },
      { code: 'IT302', name: 'Information Security & Cryptography', sem: 4 },
      { code: 'IT303', name: 'Mobile Application Development', sem: 4 },
      { code: 'IT304', name: 'Distributed Systems', sem: 5 },
      { code: 'IT305', name: 'Big Data Analytics', sem: 5 },
      { code: 'IT306', name: 'DevOps & Continuous Delivery', sem: 6 },
    ],
  },
  {
    instituteCode: 'CSPIT',
    deptCode: 'AIML',
    deptName: 'Artificial Intelligence & Machine Learning',
    emailPrefix: 'aiml',
    rollPrefix: 'AIML',
    courses: [
      { code: 'AI301', name: 'Artificial Intelligence Foundations', sem: 3 },
      { code: 'AI302', name: 'Machine Learning Algorithms', sem: 4 },
      { code: 'AI303', name: 'Deep Learning & Neural Networks', sem: 4 },
      { code: 'AI304', name: 'Natural Language Processing', sem: 5 },
      { code: 'AI305', name: 'Computer Vision & Image Processing', sem: 5 },
      { code: 'AI306', name: 'Reinforcement Learning & Robotics', sem: 6 },
    ],
  },
  // DEPSTAR
  {
    instituteCode: 'DEPSTAR',
    deptCode: 'D_CSE',
    deptName: 'Computer Science and Engineering (DEPSTAR)',
    emailPrefix: 'dcs',
    rollPrefix: 'DCS',
    courses: [
      { code: 'DCS301', name: 'Advanced Algorithms & Complexity', sem: 3 },
      { code: 'DCS302', name: 'System Programming & Linux Internals', sem: 4 },
      { code: 'DCS303', name: 'Advanced Database Systems', sem: 4 },
      { code: 'DCS304', name: 'Wireless & Ad-Hoc Networks', sem: 5 },
      { code: 'DCS305', name: 'Cyber Security Essentials', sem: 5 },
      { code: 'DCS306', name: 'Full Stack Development', sem: 6 },
    ],
  },
  {
    instituteCode: 'DEPSTAR',
    deptCode: 'D_CE',
    deptName: 'Computer Engineering (DEPSTAR)',
    emailPrefix: 'dce',
    rollPrefix: 'DCE',
    courses: [
      { code: 'DCE301', name: 'Hardware-Software Co-Design', sem: 3 },
      { code: 'DCE302', name: 'Real-Time Operating Systems', sem: 4 },
      { code: 'DCE303', name: 'VLSI Design & Verification', sem: 4 },
      { code: 'DCE304', name: 'Advanced Microcontrollers', sem: 5 },
      { code: 'DCE305', name: 'Autonomous Systems', sem: 5 },
      { code: 'DCE306', name: 'Network Security & Protocols', sem: 6 },
    ],
  },
  {
    instituteCode: 'DEPSTAR',
    deptCode: 'D_IT',
    deptName: 'Information Technology (DEPSTAR)',
    emailPrefix: 'dit',
    rollPrefix: 'DIT',
    courses: [
      { code: 'DIT301', name: 'Cloud Native Architecture', sem: 3 },
      { code: 'DIT302', name: 'Enterprise Java & Microservices', sem: 4 },
      { code: 'DIT303', name: 'Blockchain Technology & Smart Contracts', sem: 4 },
      { code: 'DIT304', name: 'Data Mining & Warehousing', sem: 5 },
      { code: 'DIT305', name: 'UI/UX Design & HCI', sem: 5 },
      { code: 'DIT306', name: 'Agile Project Management', sem: 6 },
    ],
  },
];

const BATCHES = [
  { yearPrefix: '24', count: 50, sem: 4, gradYear: 2028 },
  { yearPrefix: '23', count: 30, sem: 6, gradYear: 2027 },
  { yearPrefix: '25', count: 30, sem: 2, gradYear: 2029 },
  { yearPrefix: '26', count: 30, sem: 1, gradYear: 2030 },
];

async function main() {
  console.log('🏛️ Starting Comprehensive Multi-Institute Multi-Department Seeding...');

  // 0. Ensure multi-course assignments and user_profiles tables exist
  await prisma.$queryRawUnsafe(`
    CREATE TABLE IF NOT EXISTS faculty_course_assignments (
      id VARCHAR(191) PRIMARY KEY,
      facultyId VARCHAR(191) NOT NULL,
      courseId VARCHAR(191) NOT NULL,
      assignedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_fac_course (facultyId, courseId),
      INDEX idx_fac (facultyId),
      INDEX idx_course (courseId)
    )
  `);

  await prisma.$queryRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      userId VARCHAR(191) PRIMARY KEY,
      fullName VARCHAR(191),
      phoneNumber VARCHAR(50),
      avatarUrl VARCHAR(500),
      bio TEXT,
      department VARCHAR(191),
      designation VARCHAR(191),
      officeLocation VARCHAR(191),
      specialization TEXT,
      githubUrl VARCHAR(255),
      linkedinUrl VARCHAR(255),
      portfolioUrl VARCHAR(255),
      skills TEXT,
      preferences TEXT,
      createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
    )
  `);

  // Password hashes
  const staffPasswordHash = await getPasswordHash('clias123');

  // 1. Ensure Institutes
  const cspit = await prisma.institute.upsert({
    where: { code: 'CSPIT' },
    update: { name: 'Chandubhai S Patel Institute of Technology' },
    create: { code: 'CSPIT', name: 'Chandubhai S Patel Institute of Technology' },
  });

  const depstar = await prisma.institute.upsert({
    where: { code: 'DEPSTAR' },
    update: { name: 'Devang Patel Institute of Advance Technology and Research' },
    create: { code: 'DEPSTAR', name: 'Devang Patel Institute of Advance Technology and Research' },
  });

  const institutesMap = { CSPIT: cspit, DEPSTAR: depstar };
  console.log('✅ Institutes ready: CSPIT & DEPSTAR');

  // 2. Ensure Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@charusat.edu.in' },
    update: { passwordHash: staffPasswordHash, status: UserStatus.ACTIVE, role: UserRole.SUPER_ADMIN },
    create: {
      email: 'admin@charusat.edu.in',
      passwordHash: staffPasswordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  await prisma.$executeRawUnsafe(
    `INSERT INTO user_profiles (userId, fullName, department, designation, officeLocation, createdAt, updatedAt)
     VALUES (?, 'System Super Administrator', 'Central Administration', 'Super Administrator', 'Admin Block 101', NOW(), NOW())
     ON DUPLICATE KEY UPDATE fullName = VALUES(fullName), designation = VALUES(designation)`,
    adminUser.id,
  );
  console.log('👑 Super Admin ready: admin@charusat.edu.in (clias123)');

  // Clear previous counsellor assignments so user can manually test assigning via upload
  const clearedAssignments = await prisma.counsellorAssignment.deleteMany();
  console.log(`🧹 Reset ${clearedAssignments.count} existing counsellor assignments to 0 for fresh testing!`);

  let totalStudentsCreated = 0;
  let totalStaffCreated = 0;
  let totalCoursesCreated = 0;
  let nameCounter = 0;

  // 3. Iterate through each Department
  for (const deptConfig of DEPARTMENTS_CONFIG) {
    const inst = institutesMap[deptConfig.instituteCode as keyof typeof institutesMap];

    console.log(`\n============================================================`);
    console.log(`🏢 Department: ${deptConfig.instituteCode} - ${deptConfig.deptName}`);
    console.log(`============================================================`);

    // Department
    const department = await prisma.department.upsert({
      where: {
        instituteId_code: {
          instituteId: inst.id,
          code: deptConfig.deptCode,
        },
      },
      update: { name: deptConfig.deptName },
      create: {
        instituteId: inst.id,
        code: deptConfig.deptCode,
        name: deptConfig.deptName,
      },
    });

    // Program
    await prisma.program.upsert({
      where: {
        departmentId_code: {
          departmentId: department.id,
          code: `BTECH_${deptConfig.deptCode}`,
        },
      },
      update: { name: `B.Tech ${deptConfig.deptName}` },
      create: {
        departmentId: department.id,
        code: `BTECH_${deptConfig.deptCode}`,
        name: `B.Tech ${deptConfig.deptName}`,
      },
    });

    // 4. Create 6 distinct courses for this department
    const createdCourses: any[] = [];
    for (const cData of deptConfig.courses) {
      const course = await prisma.course.upsert({
        where: { code: cData.code },
        update: { name: cData.name, semester: cData.sem, departmentId: department.id },
        create: {
          code: cData.code,
          name: cData.name,
          semester: cData.sem,
          departmentId: department.id,
        },
      });

      // Ensure at least 2 topics per course
      const t1 = await prisma.topic.upsert({
        where: { courseId_slug: { courseId: course.id, slug: 'fundamentals' } },
        update: { name: 'Core Fundamentals' },
        create: { courseId: course.id, slug: 'fundamentals', name: 'Core Fundamentals' },
      });

      await prisma.topic.upsert({
        where: { courseId_slug: { courseId: course.id, slug: 'advanced-concepts' } },
        update: { name: 'Advanced Concepts' },
        create: { courseId: course.id, slug: 'advanced-concepts', name: 'Advanced Concepts' },
      });

      // Ensure at least 1 sample question per course
      const qCount = await prisma.question.count({ where: { courseId: course.id } });
      if (qCount === 0) {
        await prisma.question.create({
          data: {
            courseId: course.id,
            topicId: t1.id,
            type: QuestionType.MCQ_SINGLE,
            difficulty: QuestionDifficulty.MEDIUM,
            questionText: `What is the primary objective of studying ${cData.name}?`,
            explanation: `Understanding theoretical principles and practical applications in ${deptConfig.deptName}.`,
            status: QuestionStatus.APPROVED,
            options: {
              create: [
                { optionText: 'Developing efficient scalable systems', isCorrect: true, order: 1 },
                { optionText: 'Random guessing', isCorrect: false, order: 2 },
                { optionText: 'None of the above', isCorrect: false, order: 3 },
              ],
            },
          },
        });
      }

      createdCourses.push(course);
      totalCoursesCreated++;
    }

    // 5. Staff: 1 HOD, 3 Counsellors, 6 Faculties (Fac 1 & Fac 2 are also counsellors)
    const deptSlug = deptConfig.deptCode.toLowerCase().replace('_', '');
    const instSlug = deptConfig.instituteCode.toLowerCase();

    // HOD
    const hodEmail = `hod.${instSlug}.${deptSlug}@charusat.edu.in`;
    const hodUser = await prisma.user.upsert({
      where: { email: hodEmail },
      update: { passwordHash: staffPasswordHash, status: UserStatus.ACTIVE, role: UserRole.HOD },
      create: {
        email: hodEmail,
        passwordHash: staffPasswordHash,
        role: UserRole.HOD,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
    });
    totalStaffCreated++;

    await prisma.facultyProfile.upsert({
      where: { userId: hodUser.id },
      update: { departmentId: department.id },
      create: {
        userId: hodUser.id,
        departmentId: department.id,
        employeeCode: `EMP_${hodEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_')}`,
      },
    });

    await prisma.$executeRawUnsafe(
      `INSERT INTO user_profiles (userId, fullName, department, designation, officeLocation, createdAt, updatedAt)
       VALUES (?, ?, ?, 'Head of Department', 'HOD Office Wing', NOW(), NOW())
       ON DUPLICATE KEY UPDATE fullName = VALUES(fullName), department = VALUES(department), designation = 'Head of Department'`,
      hodUser.id,
      `Dr. HOD (${deptConfig.instituteCode} ${deptConfig.deptCode})`,
      deptConfig.deptName,
    );

    // Preserve default HOD alias for CSPIT CSE
    if (deptConfig.deptCode === 'CSE' && deptConfig.instituteCode === 'CSPIT') {
      const defaultHod = await prisma.user.upsert({
        where: { email: 'hod@charusat.edu.in' },
        update: { passwordHash: staffPasswordHash, status: UserStatus.ACTIVE, role: UserRole.HOD },
        create: {
          email: 'hod@charusat.edu.in',
          passwordHash: staffPasswordHash,
          role: UserRole.HOD,
          status: UserStatus.ACTIVE,
          emailVerified: true,
        },
      });
      await prisma.facultyProfile.upsert({
        where: { userId: defaultHod.id },
        update: { departmentId: department.id },
        create: {
          userId: defaultHod.id,
          departmentId: department.id,
          employeeCode: 'EMP_HOD_DEFAULT_CSE',
        },
      });
      await prisma.$executeRawUnsafe(
        `INSERT INTO user_profiles (userId, fullName, department, designation, officeLocation, createdAt, updatedAt)
         VALUES (?, 'Dr. HOD (CSPIT CSE)', ?, 'Head of Department', 'HOD Cabin A-101', NOW(), NOW())
         ON DUPLICATE KEY UPDATE fullName = VALUES(fullName)`,
        defaultHod.id,
        deptConfig.deptName,
      );
    }

    // 3 Dedicated Counsellors
    for (let cIdx = 1; cIdx <= 3; cIdx++) {
      const counsellorEmail = `counsellor${cIdx}.${instSlug}.${deptSlug}@charusat.edu.in`;
      const cUser = await prisma.user.upsert({
        where: { email: counsellorEmail },
        update: { passwordHash: staffPasswordHash, status: UserStatus.ACTIVE, role: UserRole.COUNSELLOR },
        create: {
          email: counsellorEmail,
          passwordHash: staffPasswordHash,
          role: UserRole.COUNSELLOR,
          status: UserStatus.ACTIVE,
          emailVerified: true,
        },
      });
      totalStaffCreated++;

      await prisma.$executeRawUnsafe(
        `INSERT INTO user_profiles (userId, fullName, department, designation, officeLocation, createdAt, updatedAt)
         VALUES (?, ?, ?, 'Academic Counsellor', 'Counselling Cell', NOW(), NOW())
         ON DUPLICATE KEY UPDATE fullName = VALUES(fullName), department = VALUES(department), designation = 'Academic Counsellor'`,
        cUser.id,
        `Prof. Counsellor ${cIdx} (${deptConfig.deptCode})`,
        deptConfig.deptName,
      );

      // Preserve default counsellor@charusat.edu.in alias for CSPIT CSE counsellor 1
      if (cIdx === 1 && deptConfig.deptCode === 'CSE' && deptConfig.instituteCode === 'CSPIT') {
        const defC = await prisma.user.upsert({
          where: { email: 'counsellor@charusat.edu.in' },
          update: { passwordHash: staffPasswordHash, status: UserStatus.ACTIVE, role: UserRole.COUNSELLOR },
          create: {
            email: 'counsellor@charusat.edu.in',
            passwordHash: staffPasswordHash,
            role: UserRole.COUNSELLOR,
            status: UserStatus.ACTIVE,
            emailVerified: true,
          },
        });
        await prisma.$executeRawUnsafe(
          `INSERT INTO user_profiles (userId, fullName, department, designation, officeLocation, createdAt, updatedAt)
           VALUES (?, 'Prof. Lead Counsellor (CSPIT CSE)', ?, 'Academic Counsellor', 'Counselling Cell Room 12', NOW(), NOW())
           ON DUPLICATE KEY UPDATE fullName = VALUES(fullName)`,
          defC.id,
          deptConfig.deptName,
        );
      }
    }

    // 6 Faculties (Each mapped to a distinct subject / course)
    for (let fIdx = 0; fIdx < 6; fIdx++) {
      const assignedCourse = createdCourses[fIdx];
      const facultyNum = fIdx + 1;
      const isDualCounsellor = facultyNum <= 2; // Faculty 1 & Faculty 2 are dual role
      const facultyEmail = `faculty${facultyNum}.${instSlug}.${deptSlug}@charusat.edu.in`;

      const facultyUser = await prisma.user.upsert({
        where: { email: facultyEmail },
        update: { passwordHash: staffPasswordHash, status: UserStatus.ACTIVE, role: UserRole.FACULTY },
        create: {
          email: facultyEmail,
          passwordHash: staffPasswordHash,
          role: UserRole.FACULTY,
          status: UserStatus.ACTIVE,
          emailVerified: true,
        },
      });

      // Faculty Profile linked to this course
      const facProfile = await prisma.facultyProfile.upsert({
        where: { userId: facultyUser.id },
        update: {
          departmentId: department.id,
          courseId: assignedCourse.id,
          employeeCode: `EMP_${deptConfig.deptCode}_${String(facultyNum).padStart(3, '0')}`,
        },
        create: {
          userId: facultyUser.id,
          departmentId: department.id,
          courseId: assignedCourse.id,
          employeeCode: `EMP_${deptConfig.deptCode}_${String(facultyNum).padStart(3, '0')}`,
        },
      });

      // Sync multi-course assignment row
      await prisma.$executeRawUnsafe(
        `INSERT IGNORE INTO faculty_course_assignments (id, facultyId, courseId, assignedAt)
         VALUES (?, ?, ?, NOW())`,
        `fca_${facProfile.id}_${assignedCourse.id}`,
        facProfile.id,
        assignedCourse.id,
      );

      const designation = isDualCounsellor ? 'Assistant Professor & Counsellor' : 'Assistant Professor';
      await prisma.$executeRawUnsafe(
        `INSERT INTO user_profiles (userId, fullName, department, designation, specialization, officeLocation, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'Faculty Chamber', NOW(), NOW())
         ON DUPLICATE KEY UPDATE fullName = VALUES(fullName), department = VALUES(department), designation = VALUES(designation), specialization = VALUES(specialization)`,
        facultyUser.id,
        `Prof. Faculty ${facultyNum} (${assignedCourse.code})`,
        deptConfig.deptName,
        designation,
        `${assignedCourse.code} - ${assignedCourse.name}`,
      );

      totalStaffCreated++;

      // Keep Prof. Dhara Solanki alias mapped to CSPIT CSE Faculty 1 (Data Structures)
      if (fIdx === 0 && deptConfig.deptCode === 'CSE' && deptConfig.instituteCode === 'CSPIT') {
        const dharaUser = await prisma.user.upsert({
          where: { email: 'dharasolanki.cse@charusat.ac.in' },
          update: { passwordHash: staffPasswordHash, status: UserStatus.ACTIVE, role: UserRole.FACULTY },
          create: {
            email: 'dharasolanki.cse@charusat.ac.in',
            passwordHash: staffPasswordHash,
            role: UserRole.FACULTY,
            status: UserStatus.ACTIVE,
            emailVerified: true,
          },
        });
        const dharaProf = await prisma.facultyProfile.upsert({
          where: { userId: dharaUser.id },
          update: { departmentId: department.id, courseId: assignedCourse.id, employeeCode: 'EMP_CSE_042' },
          create: { userId: dharaUser.id, departmentId: department.id, courseId: assignedCourse.id, employeeCode: 'EMP_CSE_042' },
        });
        await prisma.$executeRawUnsafe(
          `INSERT IGNORE INTO faculty_course_assignments (id, facultyId, courseId, assignedAt)
           VALUES (?, ?, ?, NOW())`,
          `fca_${dharaProf.id}_${assignedCourse.id}`,
          dharaProf.id,
          assignedCourse.id,
        );
        await prisma.$executeRawUnsafe(
          `INSERT INTO user_profiles (userId, fullName, department, designation, specialization, officeLocation, createdAt, updatedAt)
           VALUES (?, 'Prof. Dhara Solanki', ?, 'Assistant Professor & Counsellor', 'CS301 - Data Structures and Algorithms', 'Room 204 CSE Dept', NOW(), NOW())
           ON DUPLICATE KEY UPDATE fullName = VALUES(fullName), designation = VALUES(designation)`,
          dharaUser.id,
          deptConfig.deptName,
        );
      }
    }

    // 6. Students across 4 years (24: 50 students, 23: 30 students, 25: 30 students, 26: 30 students)
    console.log(`👨‍🎓 Seeding 140 students for ${deptConfig.instituteCode} - ${deptConfig.deptCode}...`);

    for (const batch of BATCHES) {
      const batchTasks = [];
      for (let sNum = 1; sNum <= batch.count; sNum++) {
        const pad = String(sNum).padStart(3, '0');
        const rollNum = `${batch.yearPrefix}${deptConfig.rollPrefix}${pad}`;
        const email = `${batch.yearPrefix}${deptConfig.emailPrefix}${pad}@charusat.edu.in`;
        nameCounter++;
        const { fullName, firstName } = generateStudentName(nameCounter);
        batchTasks.push({
          rollNum,
          email,
          fullName,
          firstName,
          sem: batch.sem,
          div: sNum <= 25 ? `${deptConfig.rollPrefix} Div 1` : `${deptConfig.rollPrefix} Div 2`,
          gradYear: batch.gradYear,
        });
      }

      // Concurrency of 5 per chunk for smooth and fast TiDB execution
      const CHUNK_SIZE = 5;
      for (let i = 0; i < batchTasks.length; i += CHUNK_SIZE) {
        const chunk = batchTasks.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(async (st) => {
            const passPlain = `${st.firstName.toLowerCase()}@2006`;
            const studentPassHash = await getPasswordHash(passPlain);

            // 1. User
            const sUser = await prisma.user.upsert({
              where: { email: st.email },
              update: { passwordHash: studentPassHash, status: UserStatus.ACTIVE, role: UserRole.STUDENT },
              create: {
                email: st.email,
                passwordHash: studentPassHash,
                role: UserRole.STUDENT,
                status: UserStatus.ACTIVE,
                emailVerified: true,
              },
            });

            // 2. AuthorizedStudent with userId linked
            const authStudent = await prisma.authorizedStudent.upsert({
              where: { enrollmentNumber: st.rollNum },
              update: {
                name: st.fullName,
                email: st.email,
                institute: deptConfig.instituteCode,
                department: deptConfig.deptName,
                programName: `B.Tech ${deptConfig.deptName}`,
                semester: st.sem,
                division: st.div,
                graduationYear: st.gradYear,
                activated: true,
                userId: sUser.id,
              },
              create: {
                enrollmentNumber: st.rollNum,
                name: st.fullName,
                email: st.email,
                institute: deptConfig.instituteCode,
                department: deptConfig.deptName,
                programName: `B.Tech ${deptConfig.deptName}`,
                semester: st.sem,
                division: st.div,
                graduationYear: st.gradYear,
                activated: true,
                userId: sUser.id,
              },
            });

            // 3. StudentProfile
            const existingProfileByAuth = await prisma.studentProfile.findUnique({
              where: { authorizedStudentId: authStudent.id },
            });
            if (existingProfileByAuth && existingProfileByAuth.userId !== sUser.id) {
              await prisma.studentProfile.delete({
                where: { id: existingProfileByAuth.id },
              });
            }

            await prisma.studentProfile.upsert({
              where: { userId: sUser.id },
              update: {
                authorizedStudent: { connect: { id: authStudent.id } },
              },
              create: {
                user: { connect: { id: sUser.id } },
                authorizedStudent: { connect: { id: authStudent.id } },
              },
            });

            // 4. user_profiles
            await prisma.$executeRawUnsafe(
              `INSERT INTO user_profiles (userId, fullName, department, designation, createdAt, updatedAt)
               VALUES (?, ?, ?, 'Student', NOW(), NOW())
               ON DUPLICATE KEY UPDATE fullName = VALUES(fullName), department = VALUES(department)`,
              sUser.id,
              st.fullName,
              deptConfig.deptName,
            );
          }),
        );
      }
      totalStudentsCreated += batch.count;
      console.log(`   ✓ Batch ${batch.yearPrefix} completed (${batch.count} students)`);
    }
  }

  // Preserve primary demo student account student@charusat.edu.in
  const demoPassHash = await getPasswordHash('rahul@2006');
  const demoUser = await prisma.user.upsert({
    where: { email: 'student@charusat.edu.in' },
    update: { passwordHash: demoPassHash, status: UserStatus.ACTIVE, role: UserRole.STUDENT },
    create: {
      email: 'student@charusat.edu.in',
      passwordHash: demoPassHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  const demoAuth = await prisma.authorizedStudent.upsert({
    where: { enrollmentNumber: '24CS000' },
    update: {
      name: 'Rahul Patel (Demo Student)',
      email: 'student@charusat.edu.in',
      institute: 'CSPIT',
      department: 'Computer Science and Engineering',
      programName: 'B.Tech Computer Science and Engineering',
      semester: 4,
      division: 'CS Div 1',
      graduationYear: 2028,
      activated: true,
      userId: demoUser.id,
    },
    create: {
      enrollmentNumber: '24CS000',
      name: 'Rahul Patel (Demo Student)',
      email: 'student@charusat.edu.in',
      institute: 'CSPIT',
      department: 'Computer Science and Engineering',
      programName: 'B.Tech Computer Science and Engineering',
      semester: 4,
      division: 'CS Div 1',
      graduationYear: 2028,
      activated: true,
      userId: demoUser.id,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: demoUser.id },
    update: { authorizedStudentId: demoAuth.id },
    create: {
      userId: demoUser.id,
      authorizedStudentId: demoAuth.id,
    },
  });

  await prisma.$executeRawUnsafe(
    `INSERT INTO user_profiles (userId, fullName, department, designation, createdAt, updatedAt)
     VALUES (?, 'Rahul Patel (Demo Student)', 'Computer Science and Engineering', 'Student', NOW(), NOW())
     ON DUPLICATE KEY UPDATE fullName = VALUES(fullName)`,
    demoUser.id,
  );

  console.log('\n============================================================');
  console.log('🎉 SEEDING COMPLETE WITH PROPER RBAC & MULTI-INSTITUTE DATA!');
  console.log('============================================================');
  console.log(`Institutes: 2 (CSPIT, DEPSTAR)`);
  console.log(`Departments: 7 (CSPIT: CSE, CE, IT, AIML | DEPSTAR: CSE, CE, IT)`);
  console.log(`Total Courses / Distinct Subjects: ${totalCoursesCreated}`);
  console.log(`Total Staff Seeded: ${totalStaffCreated} (7 HODs, 21 Counsellors, 42 Faculties)`);
  console.log(`Total Students Seeded: ${totalStudentsCreated}`);
  console.log('   - 50 students for batch 24 in every department');
  console.log('   - 30 students each for batches 23, 25, 26 in every department');
  console.log('   - 140 students per department = 980 total students');
  console.log('   - Password for all students: <student_name>@2006');
  console.log('   - Password for all staff: clias123');
  console.log('   - Counsellor assignments: 0 (Fresh & ready for Excel/PDF upload!)');
  console.log('============================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during full hierarchy seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
