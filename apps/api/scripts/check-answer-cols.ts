import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe<any[]>('SHOW COLUMNS FROM SubmissionAnswer');
  console.log('SubmissionAnswer columns:', cols.map(c => `${c.Field} (${c.Type})`));

  const subCols = await prisma.$queryRawUnsafe<any[]>('SHOW COLUMNS FROM AssessmentSubmission');
  console.log('AssessmentSubmission columns:', subCols.map(c => `${c.Field} (${c.Type})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
