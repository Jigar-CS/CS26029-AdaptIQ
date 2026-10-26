import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking SubmissionAnswer columns...');
  const cols = await prisma.$queryRawUnsafe<any[]>('SHOW COLUMNS FROM SubmissionAnswer');
  const colNames = cols.map((c) => c.Field);

  if (!colNames.includes('answerText')) {
    console.log('Adding column answerText to SubmissionAnswer...');
    await prisma.$executeRawUnsafe('ALTER TABLE SubmissionAnswer ADD COLUMN answerText TEXT NULL');
  }

  if (!colNames.includes('feedback')) {
    console.log('Adding column feedback to SubmissionAnswer...');
    await prisma.$executeRawUnsafe('ALTER TABLE SubmissionAnswer ADD COLUMN feedback TEXT NULL');
  }

  if (!colNames.includes('evaluatedBy')) {
    console.log('Adding column evaluatedBy to SubmissionAnswer...');
    await prisma.$executeRawUnsafe('ALTER TABLE SubmissionAnswer ADD COLUMN evaluatedBy VARCHAR(191) NULL');
  }

  const subCols = await prisma.$queryRawUnsafe<any[]>('SHOW COLUMNS FROM AssessmentSubmission');
  const subColNames = subCols.map((c) => c.Field);

  if (!subColNames.includes('feedback')) {
    console.log('Adding column feedback to AssessmentSubmission...');
    await prisma.$executeRawUnsafe('ALTER TABLE AssessmentSubmission ADD COLUMN feedback TEXT NULL');
  }

  if (!subColNames.includes('evaluatedAt')) {
    console.log('Adding column evaluatedAt to AssessmentSubmission...');
    await prisma.$executeRawUnsafe('ALTER TABLE AssessmentSubmission ADD COLUMN evaluatedAt DATETIME(3) NULL');
  }

  console.log('✅ SubmissionAnswer and AssessmentSubmission schema columns updated successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
