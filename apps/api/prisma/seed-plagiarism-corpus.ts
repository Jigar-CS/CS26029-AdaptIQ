import { PrismaClient, JudgeSubmissionStatus, ProgrammingLanguage } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding genuine plagiarism comparison corpus...');

  // 1. Fetch real student profiles
  const students = await prisma.studentProfile.findMany({
    include: { authorizedStudent: true },
    orderBy: { createdAt: 'asc' },
  });

  if (students.length < 4) {
    console.error('Need at least 4 student profiles. Found:', students.length);
    return;
  }

  const studentA = students.find((s) => s.authorizedStudent?.enrollmentNumber === '24CS001') || students[0];
  const studentB = students.find((s) => s.authorizedStudent?.enrollmentNumber === '24CS090') || students[1];
  const studentC = students.find((s) => s.authorizedStudent?.enrollmentNumber === '24CS099') || students[2];
  const studentD = students.find((s) => s.authorizedStudent?.enrollmentNumber === '24CS080') || students[3];

  console.log('Using students:');
  console.log(`- Student A: ${studentA.authorizedStudent?.name} (${studentA.authorizedStudent?.enrollmentNumber})`);
  console.log(`- Student B: ${studentB.authorizedStudent?.name} (${studentB.authorizedStudent?.enrollmentNumber})`);
  console.log(`- Student C: ${studentC.authorizedStudent?.name} (${studentC.authorizedStudent?.enrollmentNumber})`);
  console.log(`- Student D: ${studentD.authorizedStudent?.name} (${studentD.authorizedStudent?.enrollmentNumber})`);

  // 2. Target Problem: Maximum Subarray
  const kadaneProb = await prisma.codingProblem.findFirst({
    where: { slug: 'maximum-subarray' },
  });

  if (kadaneProb) {
    const codeA = `def maxSubArray(nums: list[int]) -> int:
    max_so_far = nums[0]
    current_max = nums[0]
    for i in range(1, len(nums)):
        current_max = max(nums[i], current_max + nums[i])
        max_so_far = max(max_so_far, current_max)
    return max_so_far`;

    // Near-duplicate (renamed variables, reordered comments)
    const codeB = `# Optimized Kadane linear scan approach
def maxSubArray(nums: list[int]) -> int:
    highest = nums[0]
    running_total = nums[0]
    for idx in range(1, len(nums)):
        running_total = max(nums[idx], running_total + nums[idx])
        highest = max(highest, running_total)
    return highest`;

    // Verbatim clone of A
    const codeC = codeA;

    // Unrelated algorithm (dynamic programming array)
    const codeD = `def maxSubArray(nums: list[int]) -> int:
    n = len(nums)
    dp = [0] * n
    dp[0] = nums[0]
    ans = dp[0]
    k = 1
    while k < n:
        if dp[k - 1] > 0:
            dp[k] = nums[k] + dp[k - 1]
        else:
            dp[k] = nums[k]
        if dp[k] > ans:
            ans = dp[k]
        k += 1
    return ans`;

    // Clear old submissions for this problem
    await prisma.codeSubmission.deleteMany({
      where: { problemId: kadaneProb.id },
    });

    await prisma.codeSubmission.createMany({
      data: [
        {
          studentId: studentA.id,
          problemId: kadaneProb.id,
          language: ProgrammingLanguage.PYTHON,
          sourceCode: codeA,
          status: JudgeSubmissionStatus.ACCEPTED,
          score: 100.0,
          testCasesPassed: 3,
          totalTestCases: 3,
        },
        {
          studentId: studentB.id,
          problemId: kadaneProb.id,
          language: ProgrammingLanguage.PYTHON,
          sourceCode: codeB,
          status: JudgeSubmissionStatus.ACCEPTED,
          score: 100.0,
          testCasesPassed: 3,
          totalTestCases: 3,
        },
        {
          studentId: studentC.id,
          problemId: kadaneProb.id,
          language: ProgrammingLanguage.PYTHON,
          sourceCode: codeC,
          status: JudgeSubmissionStatus.ACCEPTED,
          score: 100.0,
          testCasesPassed: 3,
          totalTestCases: 3,
        },
        {
          studentId: studentD.id,
          problemId: kadaneProb.id,
          language: ProgrammingLanguage.PYTHON,
          sourceCode: codeD,
          status: JudgeSubmissionStatus.ACCEPTED,
          score: 100.0,
          testCasesPassed: 3,
          totalTestCases: 3,
        },
      ],
    });

    console.log(`Seeded 4 submissions for problem: ${kadaneProb.title} (${kadaneProb.slug})`);
  }

  // 3. Target Problem for Assessment CS301: Longest Subarray with Sum at Most K
  const longestSubarrayProb = await prisma.codingProblem.findFirst({
    where: { slug: { contains: 'longest-subarray' } },
  });

  if (longestSubarrayProb) {
    const codeA = `def longestSubarray(nums: list[int], k: int) -> int:
    left = 0
    current_sum = 0
    max_len = 0
    for right in range(len(nums)):
        current_sum += nums[right]
        while current_sum > k and left <= right:
            current_sum -= nums[left]
            left += 1
        if current_sum <= k:
            max_len = max(max_len, right - left + 1)
    return max_len`;

    const codeB = `# Sliding window two pointers
def longestSubarray(nums: list[int], k: int) -> int:
    start_idx = 0
    window_total = 0
    longest = 0
    for end_idx in range(len(nums)):
        window_total += nums[end_idx]
        while window_total > k and start_idx <= end_idx:
            window_total -= nums[start_idx]
            start_idx += 1
        if window_total <= k:
            longest = max(longest, end_idx - start_idx + 1)
    return longest`;

    const codeC = codeA;

    const codeD = `def longestSubarray(nums: list[int], k: int) -> int:
    n = len(nums)
    best = 0
    for i in range(n):
        total = 0
        for j in range(i, n):
            total += nums[j]
            if total <= k:
                length = j - i + 1
                if length > best:
                    best = length
    return best`;

    await prisma.codeSubmission.deleteMany({
      where: { problemId: longestSubarrayProb.id },
    });

    await prisma.codeSubmission.createMany({
      data: [
        {
          studentId: studentA.id,
          problemId: longestSubarrayProb.id,
          language: ProgrammingLanguage.PYTHON,
          sourceCode: codeA,
          status: JudgeSubmissionStatus.ACCEPTED,
          score: 100.0,
          testCasesPassed: 3,
          totalTestCases: 3,
        },
        {
          studentId: studentB.id,
          problemId: longestSubarrayProb.id,
          language: ProgrammingLanguage.PYTHON,
          sourceCode: codeB,
          status: JudgeSubmissionStatus.ACCEPTED,
          score: 100.0,
          testCasesPassed: 3,
          totalTestCases: 3,
        },
        {
          studentId: studentC.id,
          problemId: longestSubarrayProb.id,
          language: ProgrammingLanguage.PYTHON,
          sourceCode: codeC,
          status: JudgeSubmissionStatus.ACCEPTED,
          score: 100.0,
          testCasesPassed: 3,
          totalTestCases: 3,
        },
        {
          studentId: studentD.id,
          problemId: longestSubarrayProb.id,
          language: ProgrammingLanguage.PYTHON,
          sourceCode: codeD,
          status: JudgeSubmissionStatus.ACCEPTED,
          score: 100.0,
          testCasesPassed: 3,
          totalTestCases: 3,
        },
      ],
    });

    console.log(`Seeded 4 submissions for problem: ${longestSubarrayProb.title} (${longestSubarrayProb.slug})`);
  }

  // Ensure CS301 assessment questions link properly to longestSubarrayProb
  if (longestSubarrayProb) {
    const cs301Exam = await prisma.assessment.findFirst({
      where: { code: 'CS301' },
      include: { questions: { include: { question: true } } },
    });
    if (cs301Exam) {
      for (const aq of cs301Exam.questions) {
        if (aq.question.type === 'CODING') {
          await prisma.question.update({
            where: { id: aq.questionId },
            data: {
              explanation: JSON.stringify({
                codingProblemId: longestSubarrayProb.id,
                slug: longestSubarrayProb.slug,
              }),
            },
          });
          console.log(`Updated CS301 exam question link to problem ID: ${longestSubarrayProb.id}`);
        }
      }
    }
  }

  await prisma.$disconnect();
  console.log('Seeding completed successfully!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
