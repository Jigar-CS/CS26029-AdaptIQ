import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminService — CSV Parsing & Validation', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should successfully parse valid CSV rows', () => {
    const validCsv = `enrollmentNumber,name,email,institute,department,program,semester,division,graduationYear
24CS001,Rahul Patel,rahul@charusat.edu.in,CSPIT,CSE,BTECH,5,A,2028
24CS002,Priya Sharma,priya@charusat.edu.in,CSPIT,CSE,BTECH,5,B,2028`;

    const result = service.parseCsvText(validCsv);
    expect(result.totalRows).toBe(2);
    expect(result.validCount).toBe(2);
    expect(result.invalidCount).toBe(0);
    expect(result.validRows[0].enrollmentNumber).toBe('24CS001');
  });

  it('should detect malformed rows (invalid domain, missing enrollment, duplicate)', () => {
    const invalidCsv = `enrollmentNumber,name,email,institute,department,program,semester,division,graduationYear
,No Enrollment,test@charusat.edu.in,CSPIT,CSE,BTECH,5,A,2028
24CS002,Wrong Domain,student@gmail.com,CSPIT,CSE,BTECH,5,A,2028
24CS003,Duplicate One,dup@charusat.edu.in,CSPIT,CSE,BTECH,5,A,2028
24CS003,Duplicate Two,dup2@charusat.edu.in,CSPIT,CSE,BTECH,5,B,2028`;

    const result = service.parseCsvText(invalidCsv);
    expect(result.totalRows).toBe(4);
    expect(result.invalidCount).toBeGreaterThanOrEqual(3);

    // Row 2 has missing enrollment number
    const row2Error = result.invalidRows.find((r) => r.rowNumber === 2);
    expect(row2Error.errors).toContain('Missing enrollment number');

    // Row 3 has wrong email domain
    const row3Error = result.invalidRows.find((r) => r.rowNumber === 3);
    expect(row3Error.errors.some((e) => e.includes('Email domain must be'))).toBe(true);

    // Row 5 has duplicate enrollment number
    const row5Error = result.invalidRows.find((r) => r.rowNumber === 5);
    expect(row5Error.errors.some((e) => e.includes('Duplicate enrollment number'))).toBe(true);
  });
});
