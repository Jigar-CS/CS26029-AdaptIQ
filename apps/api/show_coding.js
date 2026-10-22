const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showCoding() {
  const problems = await prisma.codingProblem.findMany({
    include: { testCases: true }
  });
  console.log(JSON.stringify(problems, null, 2));
}

showCoding()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
