import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe<any[]>('SHOW COLUMNS FROM Assessment');
  console.log('Assessment columns:', cols.map(c => c.Field));

  const hasBatch = cols.some(c => c.Field === 'batch');
  const hasDivision = cols.some(c => c.Field === 'division');
  const hasRollFilter = cols.some(c => c.Field === 'rollFilter');

  if (!hasBatch) {
    console.log('Adding column batch...');
    await prisma.$executeRawUnsafe("ALTER TABLE Assessment ADD COLUMN batch VARCHAR(191) NULL DEFAULT 'ALL'");
  }
  if (!hasDivision) {
    console.log('Adding column division...');
    await prisma.$executeRawUnsafe("ALTER TABLE Assessment ADD COLUMN division VARCHAR(191) NULL DEFAULT 'ALL'");
  }
  if (!hasRollFilter) {
    console.log('Adding column rollFilter...');
    await prisma.$executeRawUnsafe("ALTER TABLE Assessment ADD COLUMN rollFilter VARCHAR(191) NULL DEFAULT 'ALL'");
  }
  console.log('Assessment columns updated safely without dropping any tables!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
