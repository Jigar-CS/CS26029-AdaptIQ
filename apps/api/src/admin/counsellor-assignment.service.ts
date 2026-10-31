import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';

export interface ParsedAssignmentPair {
  counsellorQuery: string;
  studentsQuery: string;
}

export interface AssignmentResultItem {
  id: string;
  counsellorId: string;
  counsellorName: string;
  counsellorEmail: string;
  studentId: string;
  enrollmentNumber: string;
  studentName: string;
  division: string;
  semester: number;
}

export interface AssignmentUploadResponse {
  success: boolean;
  message: string;
  totalAssignmentsCreated: number;
  counsellorsCount: number;
  studentsCount: number;
  assignments: AssignmentResultItem[];
  unmatchedStudents: string[];
  unmatchedCounsellors: string[];
}

@Injectable()
export class CounsellorAssignmentService {
  private readonly logger = new Logger(CounsellorAssignmentService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Main entry point to process an uploaded file (Excel, CSV, or PDF).
   */
  async processUploadedFile(
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<AssignmentUploadResponse> {
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    let pairs: ParsedAssignmentPair[] = [];

    if (ext === 'pdf') {
      pairs = await this.parsePdfFile(fileBuffer);
    } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      pairs = await this.parseExcelOrCsvFile(fileBuffer);
    } else {
      throw new BadRequestException(
        `Unsupported file format '.${ext}'. Please upload an Excel (.xlsx, .xls), CSV (.csv), or PDF (.pdf) file.`,
      );
    }

    if (pairs.length === 0) {
      throw new BadRequestException(
        'Could not extract counsellor and student assignments from the uploaded file. Please verify the file contents or download the sample format.',
      );
    }

    return this.commitAssignments(pairs);
  }

  /**
   * Parse Excel or CSV buffers using XLSX
   */
  async parseExcelOrCsvFile(buffer: Buffer): Promise<ParsedAssignmentPair[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const pairs: ParsedAssignmentPair[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (!rows || rows.length === 0) continue;

      // Check if row 0 or 1 contains headers
      let headerRowIdx = -1;
      let counsellorEmailColIdx = -1;
      let counsellorNameColIdx = -1;
      let studentsColIdx = -1;

      for (let r = 0; r < Math.min(5, rows.length); r++) {
        const row = rows[r];
        if (!Array.isArray(row)) continue;

        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').toLowerCase().trim();
          if (
            (val.includes('counsellor') || val.includes('counselor') || val.includes('mentor') || val.includes('faculty')) &&
            (val.includes('email') || val.includes('mail'))
          ) {
            counsellorEmailColIdx = c;
          } else if (
            (val.includes('counsellor') || val.includes('counselor') || val.includes('mentor') || val.includes('faculty') || val.includes('teacher')) &&
            !val.includes('phone') && !val.includes('contact') && !val.includes('mobile') && !val.includes('dept')
          ) {
            counsellorNameColIdx = c;
          }

          if (
            val.includes('student') ||
            val.includes('enrollment') ||
            val.includes('id range') ||
            val.includes('mentee') ||
            val.includes('roll')
          ) {
            studentsColIdx = c;
          }
        }

        const effectiveCounsellorCol = counsellorEmailColIdx !== -1 ? counsellorEmailColIdx : counsellorNameColIdx;
        if (effectiveCounsellorCol !== -1 && studentsColIdx !== -1 && effectiveCounsellorCol !== studentsColIdx) {
          headerRowIdx = r;
          break;
        }
      }

      const counsellorColIdx = counsellorEmailColIdx !== -1 ? counsellorEmailColIdx : counsellorNameColIdx;

      if (headerRowIdx !== -1 && counsellorColIdx !== -1 && studentsColIdx !== -1) {
        // Tabular column layout
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!Array.isArray(row)) continue;

          // Prefer email, fallback to name
          const counsellorVal = String(
            row[counsellorColIdx] || (counsellorNameColIdx !== -1 ? row[counsellorNameColIdx] : '') || '',
          ).trim();
          const studentsVal = String(row[studentsColIdx] || '').trim();

          if (counsellorVal && studentsVal) {
            pairs.push({ counsellorQuery: counsellorVal, studentsQuery: studentsVal });
          }
        }
      } else {
        // Fallback: Free-form key-value inspection across cells
        let currentCounsellor = '';

        for (const row of rows) {
          if (!Array.isArray(row)) continue;
          const lineText = row.map((cell) => String(cell || '').trim()).filter(Boolean).join(' ');

          const counsellorMatch = lineText.match(
            /(?:counsellor|counselor|faculty|mentor)\s*(?:name)?\s*[:\-]\s*([^\n\r,;]+)/i,
          );
          if (counsellorMatch) {
            currentCounsellor = counsellorMatch[1].trim();
          }

          const studentsMatch = lineText.match(
            /(?:assigned\s+students|student\s+ids?|enrollment\s*(?:range|nos?|numbers?)?|students?)\s*[:\-]\s*(.+)/i,
          );
          if (studentsMatch && currentCounsellor) {
            pairs.push({
              counsellorQuery: currentCounsellor,
              studentsQuery: studentsMatch[1].trim(),
            });
          } else if (row.length >= 2) {
            const firstCell = String(row[0] || '').trim();
            const secondCell = String(row[1] || '').trim();
            if (firstCell && secondCell) {
              pairs.push({
                counsellorQuery: firstCell,
                studentsQuery: secondCell,
              });
            }
          }
        }
      }
    }

    return pairs;
  }

  /**
   * Parse PDF text content
   */
  async parsePdfFile(buffer: Buffer): Promise<ParsedAssignmentPair[]> {
    let fullText = '';
    try {
      const pdfModule = require('pdf-parse');
      if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer });
        const res = await parser.getText();
        if (typeof res === 'string') fullText = res;
        else if (res && typeof res.text === 'string') fullText = res.text;
        else if (res && Array.isArray(res.pages)) {
          fullText = res.pages.map((p: any) => p.text || '').join('\n');
        }
        await parser.destroy();
      } else if (typeof pdfModule === 'function') {
        const res = await pdfModule(buffer);
        fullText = res.text || '';
      }
    } catch (err) {
      this.logger.warn('pdf-parse module extraction fallback to buffer text search', err);
      fullText = buffer.toString('utf8');
    }

    if (!fullText || fullText.trim().length === 0) {
      fullText = buffer.toString('latin1');
    }

    const pairs: ParsedAssignmentPair[] = [];
    const lines = fullText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let currentCounsellor = '';

    for (const line of lines) {
      // 1. Check Counsellor pattern
      const cMatch = line.match(
        /(?:counsellor|counselor|faculty|mentor)\s*(?:name)?\s*[:\-]\s*([^\n\r]+)/i,
      );
      if (cMatch) {
        currentCounsellor = cMatch[1].trim();
        continue;
      }

      // 2. Check Students pattern
      const sMatch = line.match(
        /(?:assigned\s+students|student\s+ids?|enrollment\s*(?:range|nos?|numbers?)?|students?)\s*[:\-]\s*([^\n\r]+)/i,
      );
      if (sMatch && currentCounsellor) {
        pairs.push({
          counsellorQuery: currentCounsellor,
          studentsQuery: sMatch[1].trim(),
        });
        continue;
      }

      // 3. Tabular row with pipes, commas, or multiple tabs (e.g. "Dr. Patel | 24CS001-24CS040")
      if (line.includes('|')) {
        const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const cPart = parts[0];
          const sPart = parts[1];
          if (!cPart.toLowerCase().includes('counsellor') && !cPart.toLowerCase().includes('faculty') && sPart.length > 0) {
            pairs.push({ counsellorQuery: cPart, studentsQuery: sPart });
          }
        }
      } else if (line.includes('\t') || line.includes('  ')) {
        const parts = line.split(/\t+|\s{2,}/).map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const cPart = parts[0];
          const sPart = parts.slice(1).join(', ');
          if (!cPart.toLowerCase().includes('counsellor') && !cPart.toLowerCase().includes('faculty') && sPart.length > 0) {
            pairs.push({ counsellorQuery: cPart, studentsQuery: sPart });
          }
        }
      }
    }

    return pairs;
  }

  /**
   * Expands multiple ID ranges (e.g., "1 to 10 and also 20 to 30", "24CS001-24CS010, 24CS020-24CS030"),
   * optional exclusions ("but not 11 to 19"), comma/line-separated IDs, or student names.
   */
  expandStudentsQuery(rawQuery: string): string[] {
    let excludedTokens = new Set<string>();
    let mainQuery = rawQuery;

    // Check for exclusion clauses: e.g. "but not 11 to 19", "except 11-19", "excluding 11 to 19", "without 11 to 19"
    const excludeMatch = rawQuery.match(/(?:except|excluding|but\s+not|without)\s+([^\n\r]+)$/i);
    if (excludeMatch) {
      mainQuery = rawQuery.substring(0, excludeMatch.index).trim();
      const exTokens = this.expandStudentsQuery(excludeMatch[1]);
      exTokens.forEach((t) => excludedTokens.add(t.toLowerCase()));
    }

    // Normalize connectors between multiple ranges or student IDs:
    // "and also", "and", "also", "&", "+" -> convert into comma delimiters
    const normalized = mainQuery.replace(/\s+(?:and\s+also|and|also|&|\+)\s+/gi, ', ');

    // Split by comma, semicolon, newline, pipe, or multiple slashes
    const rawChunks = normalized
      .split(/[,;\n\r|/]+/)
      .map((c) => c.trim())
      .filter(Boolean);

    const tokens: string[] = [];

    for (const chunk of rawChunks) {
      // Strip common prefixes: "id:", "ids", "roll no:", "enrollment range:"
      const cleaned = chunk
        .replace(/^(?:ids?|roll\s*(?:nos?|numbers?)?|enrollments?|students?)\s*[:=]?\s*/i, '')
        .trim();

      // Check Range Pattern: e.g. "24CS001-24CS010", "24CS001 to 24CS010", "24CS001 - 10", "1 to 10", "1-10", "01 to 10"
      const rangeMatch = cleaned.match(
        /^([a-zA-Z]+[0-9]*[a-zA-Z]+|[a-zA-Z]+|[0-9]+[a-zA-Z]+)?\s*(\d+)\s*(?:-|to|–|—)\s*([a-zA-Z]+[0-9]*[a-zA-Z]+|[a-zA-Z]+|[0-9]+[a-zA-Z]+)?\s*(\d+)$/i,
      );

      if (rangeMatch) {
        const p1 = (rangeMatch[1] || '').toUpperCase();
        const startStr = rangeMatch[2];
        const startNum = parseInt(startStr, 10);
        const p2 = (rangeMatch[3] || p1).toUpperCase();
        const endStr = rangeMatch[4];
        const endNum = parseInt(endStr, 10);

        if (p1 === p2 && !isNaN(startNum) && !isNaN(endNum) && startNum <= endNum && endNum - startNum <= 500) {
          const padLen = p1
            ? Math.max(startStr.length, endStr.length > startStr.length ? endStr.length : startStr.length)
            : (startStr.length > 1 ? startStr.length : 0);

          for (let i = startNum; i <= endNum; i++) {
            const formatted = padLen > 0 ? String(i).padStart(padLen, '0') : String(i);
            tokens.push(p1 ? p1 + formatted : formatted);
          }
          continue;
        }
      }

      // Individual ID or Student Name
      tokens.push(cleaned || chunk);
    }

    return Array.from(new Set(tokens.filter(Boolean))).filter(
      (t) => !excludedTokens.has(t.toLowerCase()),
    );
  }

  /**
   * Commit assignments into the database
   */
  async commitAssignments(pairs: ParsedAssignmentPair[]): Promise<AssignmentUploadResponse> {
    const createdAssignments: AssignmentResultItem[] = [];
    const unmatchedStudents: string[] = [];
    const unmatchedCounsellors: string[] = [];
    const counsellorsMapped = new Set<string>();
    const studentsMapped = new Set<string>();

    // 1. Expand student tokens for each pair and collect all tokens
    const pairMappings: Array<{
      counsellorQuery: string;
      tokens: string[];
    }> = [];

    const allTokenSet = new Set<string>();

    for (const pair of pairs) {
      const studentTokens = this.expandStudentsQuery(pair.studentsQuery);
      pairMappings.push({
        counsellorQuery: pair.counsellorQuery,
        tokens: studentTokens,
      });
      studentTokens.forEach((t) => allTokenSet.add(t.trim()));
    }

    // 2. Pre-resolve unique counsellors into a Map
    const uniqueCounsellorQueries = Array.from(new Set(pairs.map((p) => p.counsellorQuery.trim())));
    const counsellorMap = new Map<string, any>();

    for (const cQuery of uniqueCounsellorQueries) {
      const counsellorUser = await this.resolveCounsellor(cQuery);
      if (counsellorUser) {
        counsellorMap.set(cQuery.toLowerCase(), counsellorUser);
      } else {
        unmatchedCounsellors.push(cQuery);
      }
    }

    // 3. Bulk fetch AuthorizedStudents matching any of the tokens
    const allTokensArr = Array.from(allTokenSet);
    const upperTokens = allTokensArr.map((t) => t.toUpperCase());
    const lowerTokens = allTokensArr.map((t) => t.toLowerCase());

    const foundAuthStudents = await this.prisma.authorizedStudent.findMany({
      where: {
        OR: [
          { enrollmentNumber: { in: upperTokens } },
          { email: { in: lowerTokens } },
          { name: { in: allTokensArr } },
        ],
      },
      include: {
        studentProfile: true,
      },
    });

    const studentByEnrollment = new Map<string, any>();
    const studentByEmail = new Map<string, any>();
    const studentByName = new Map<string, any>();

    for (const s of foundAuthStudents) {
      if (s.enrollmentNumber) studentByEnrollment.set(s.enrollmentNumber.toUpperCase(), s);
      if (s.email) studentByEmail.set(s.email.toLowerCase(), s);
      if (s.name) studentByName.set(s.name.toLowerCase(), s);
    }

    // Precomputed password hash for rapid auto-provisioning
    const defaultPasswordHash = '$2a$10$6lnQ3RkKKNFC2N9Fg3D.p.3ARP3JQUwRTa74JLU1sR7pFTmCusKFq';

    // Helper to find or provision student profile rapidly from memory or single fallback
    const resolveFastStudent = async (token: string): Promise<any | null> => {
      const clean = token.trim();
      const cleanUpper = clean.toUpperCase();
      const cleanLower = clean.toLowerCase();

      let authStudent =
        studentByEnrollment.get(cleanUpper) ||
        studentByEmail.get(cleanLower) ||
        studentByName.get(cleanLower);

      if (!authStudent) {
        return await this.resolveStudent(token);
      }

      if (authStudent.studentProfile) {
        return authStudent.studentProfile;
      }

      // Provision profile if not existing
      let studentUser = await this.prisma.user.findUnique({
        where: { email: authStudent.email },
      });

      if (!studentUser) {
        studentUser = await this.prisma.user.create({
          data: {
            email: authStudent.email,
            passwordHash: defaultPasswordHash,
            role: UserRole.STUDENT,
            status: UserStatus.ACTIVE,
            emailVerified: true,
          },
        });
      }

      const newProfile = await this.prisma.studentProfile.create({
        data: {
          userId: studentUser.id,
          authorizedStudentId: authStudent.id,
        },
      });

      authStudent.studentProfile = newProfile;
      return newProfile;
    };

    // 4. Build assignment records and match pairs
    const assignmentsToInsert: Array<{ counsellorId: string; studentId: string }> = [];
    const assignmentMetadataList: Array<{
      counsellor: any;
      studentProfileId: string;
      token: string;
    }> = [];

    for (const mapping of pairMappings) {
      const counsellorUser = counsellorMap.get(mapping.counsellorQuery.toLowerCase());
      if (!counsellorUser) continue;

      counsellorsMapped.add(counsellorUser.id);

      for (const token of mapping.tokens) {
        const studentProfile = await resolveFastStudent(token);
        if (!studentProfile) {
          unmatchedStudents.push(`${token} (for ${counsellorUser.email})`);
          continue;
        }

        studentsMapped.add(studentProfile.id);
        assignmentsToInsert.push({
          counsellorId: counsellorUser.id,
          studentId: studentProfile.id,
        });
        assignmentMetadataList.push({
          counsellor: counsellorUser,
          studentProfileId: studentProfile.id,
          token,
        });
      }
    }

    // 5. Bulk insert assignments using createMany with skipDuplicates: true
    if (assignmentsToInsert.length > 0) {
      await this.prisma.counsellorAssignment.createMany({
        data: assignmentsToInsert.map((a) => ({
          id: randomUUID(),
          counsellorId: a.counsellorId,
          studentId: a.studentId,
          assignedAt: new Date(),
        })),
        skipDuplicates: true,
      });
    }

    // 6. Bulk resolve created assignments metadata for response
    const assignedProfiles = await this.prisma.studentProfile.findMany({
      where: {
        id: { in: Array.from(studentsMapped) },
      },
      include: {
        authorizedStudent: true,
      },
    });

    const profileMap = new Map<string, any>();
    assignedProfiles.forEach((p) => profileMap.set(p.id, p));

    for (const meta of assignmentMetadataList) {
      const prof = profileMap.get(meta.studentProfileId);
      const auth = prof?.authorizedStudent;
      if (auth) {
        createdAssignments.push({
          id: `${meta.counsellor.id}-${meta.studentProfileId}`,
          counsellorId: meta.counsellor.id,
          counsellorName: meta.counsellor.email.split('@')[0],
          counsellorEmail: meta.counsellor.email,
          studentId: meta.studentProfileId,
          enrollmentNumber: auth.enrollmentNumber,
          studentName: auth.name,
          division: auth.division,
          semester: auth.semester,
        });
      }
    }

    // Sort assignments enrollment number-wise
    createdAssignments.sort((a, b) =>
      (a.enrollmentNumber || '').localeCompare(b.enrollmentNumber || '', undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );

    return {
      success: true,
      message: `Successfully mapped ${createdAssignments.length} student assignments across ${counsellorsMapped.size} counsellor(s).`,
      totalAssignmentsCreated: createdAssignments.length,
      counsellorsCount: counsellorsMapped.size,
      studentsCount: studentsMapped.size,
      assignments: createdAssignments,
      unmatchedStudents: Array.from(new Set(unmatchedStudents)),
      unmatchedCounsellors: Array.from(new Set(unmatchedCounsellors)),
    };
  }

  /**
   * Find or create counsellor user
   */
  private async resolveCounsellor(query: string): Promise<any | null> {
    const clean = query.trim().replace(/^Dr\.\s*|^Prof\.\s*|^Mr\.\s*|^Mrs\.\s*|^Ms\.\s*/i, '').trim();

    // 1. By exact email
    let user = await this.prisma.user.findFirst({
      where: {
        email: { equals: query.toLowerCase() },
      },
    });

    if (user) return user;

    // 2. By partial email or name match in existing counsellors/faculty
    const candidates = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.FACULTY, UserRole.HOD] },
      },
    });

    // Check if query is contained in email or employeeCode
    const cleanLower = clean.toLowerCase();
    const cleanSlug = cleanLower.replace(/[^a-z0-9]/g, '');
    const cleanWords = cleanLower.split(/\s+/).filter((w) => w.length >= 2);

    user = candidates.find((c) => {
      const emailLower = c.email.toLowerCase();
      const emailLocal = emailLower.split('@')[0];
      const emailSlug = emailLocal.replace(/[^a-z0-9]/g, '');

      return (
        emailLower === cleanLower ||
        emailLower.includes(cleanLower) ||
        (cleanSlug.length >= 3 && (emailSlug.includes(cleanSlug) || cleanSlug.includes(emailSlug))) ||
        (cleanWords.length >= 2 && cleanWords.every((w) => emailSlug.includes(w)))
      );
    });

    if (user) return user;

    // 3. If query literally contains "counsellor" or "mentor" and a counsellor user exists
    if (query.toLowerCase().includes('counsellor') || query.toLowerCase().includes('mentor')) {
      const defaultCounsellor = candidates.find((c) => c.role === UserRole.FACULTY);
      if (defaultCounsellor) return defaultCounsellor;
    }

    // 4. Provision a new Counsellor account for this name/email if not yet created
    const emailSlug = clean.toLowerCase().replace(/[^a-z0-9]/g, '.');
    const newEmail = emailSlug.includes('@') ? emailSlug : `${emailSlug}@charusat.edu.in`;
    const passwordHash = await bcrypt.hash('clias123', 10);

    return this.prisma.user.create({
      data: {
        email: newEmail,
        passwordHash,
        role: UserRole.FACULTY,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
    });
  }

  /**
   * Find or provision student profile
   */
  private async resolveStudent(token: string): Promise<any | null> {
    const clean = token.trim();
    if (!clean) return null;

    // 1. Search AuthorizedStudent by exact enrollmentNumber, email, or name
    let authStudent = await this.prisma.authorizedStudent.findFirst({
      where: {
        OR: [
          { enrollmentNumber: { equals: clean } },
          { enrollmentNumber: { equals: clean.toUpperCase() } },
          { email: { equals: clean.toLowerCase() } },
          { name: { equals: clean } },
        ],
      },
      include: {
        studentProfile: true,
      },
    });

    // 2. If clean token is numeric (e.g. "1", "10", "20"), check existing enrollment numeric suffixes
    if (!authStudent && /^\d+$/.test(clean)) {
      const num = parseInt(clean, 10);
      const allAuth = await this.prisma.authorizedStudent.findMany({
        include: { studentProfile: true },
      });
      authStudent =
        allAuth.find((s) => {
          const m = s.enrollmentNumber.match(/(\d+)$/);
          return m ? parseInt(m[1], 10) === num : false;
        }) || null;
    }

    // 3. Substring name match if clean token has more than 3 chars and is not purely numeric
    if (!authStudent && clean.length > 3 && !/^\d+$/.test(clean)) {
      authStudent = await this.prisma.authorizedStudent.findFirst({
        where: {
          name: { contains: clean },
        },
        include: {
          studentProfile: true,
        },
      });
    }

    // 4. Auto-provision AuthorizedStudent if this student ID does not yet exist
    if (!authStudent) {
      let candidateEnrollment: string | null = null;

      if (/^[0-9]{2}[A-Za-z]{2,5}[0-9]{2,4}$/i.test(clean)) {
        // Formatted enrollment number like "24CS015"
        candidateEnrollment = clean.toUpperCase();
      } else if (/^\d+$/.test(clean)) {
        // Plain roll number like "1", "20", infer prefix from existing records
        const sample = await this.prisma.authorizedStudent.findFirst({
          orderBy: { enrollmentNumber: 'asc' },
        });
        const m = sample?.enrollmentNumber.match(/^([a-zA-Z]+[0-9]*[a-zA-Z]+|[a-zA-Z]+|[0-9]+[a-zA-Z]+)?\s*(\d+)$/);
        const prefix = m ? m[1] : '24CS';
        const padLen = m ? m[2].length : 3;
        candidateEnrollment = `${prefix}${String(clean).padStart(padLen, '0')}`;
      }

      if (candidateEnrollment) {
        authStudent = (await this.prisma.authorizedStudent.findUnique({
          where: { enrollmentNumber: candidateEnrollment },
          include: { studentProfile: true },
        })) as any;

        if (!authStudent) {
          const sample = await this.prisma.authorizedStudent.findFirst();
          authStudent = (await this.prisma.authorizedStudent.create({
            data: {
              enrollmentNumber: candidateEnrollment,
              name: `Student ${candidateEnrollment}`,
              email: `${candidateEnrollment.toLowerCase()}@charusat.edu.in`,
              institute: sample?.institute || 'CSPIT',
              department: sample?.department || 'Computer Science & Engineering',
              programName: sample?.programName || 'B.Tech CSE',
              semester: sample?.semester || 4,
              division: sample?.division || 'CS Div 1',
              graduationYear: sample?.graduationYear || new Date().getFullYear() + 4,
            },
            include: { studentProfile: true },
          })) as any;
        }
      }
    }

    if (!authStudent) {
      // Check if student profile exists with this enrollment or email in User
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: clean.toLowerCase() } },
            { email: { startsWith: clean.toLowerCase() } },
          ],
        },
        include: {
          studentProfile: true,
        },
      });
      if (user?.studentProfile) return user.studentProfile;
      return null;
    }

    // If AuthorizedStudent already has a StudentProfile, return it
    if (authStudent.studentProfile) {
      return authStudent.studentProfile;
    }

    // If student hasn't logged in yet, auto-provision User and StudentProfile
    let studentUser = await this.prisma.user.findUnique({
      where: { email: authStudent.email },
    });

    if (!studentUser) {
      const passwordHash = await bcrypt.hash('student123', 10);
      studentUser = await this.prisma.user.create({
        data: {
          email: authStudent.email,
          passwordHash,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          emailVerified: true,
        },
      });
    }

    return this.prisma.studentProfile.create({
      data: {
        userId: studentUser.id,
        authorizedStudentId: authStudent.id,
      },
    });
  }

  /**
   * Get all assignments grouped by counsellor
   */
  async getAllAssignments(): Promise<any[]> {
    const assignments = await this.prisma.counsellorAssignment.findMany({
      include: {
        student: {
          include: {
            authorizedStudent: true,
            skillMasteries: true,
            practiceSessions: {
              select: { id: true },
            },
            proctoringSessions: {
              select: { id: true, trustScore: true, violationsCount: true, status: true },
            },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Fetch counsellors details
    const counsellorIds = Array.from(new Set(assignments.map((a) => a.counsellorId)));
    const counsellors = await this.prisma.user.findMany({
      where: { id: { in: counsellorIds } },
      select: { id: true, email: true, role: true },
    });
    const counsellorMap = new Map(counsellors.map((c) => [c.id, c]));

    return assignments.map((a) => {
      const c = counsellorMap.get(a.counsellorId);
      const student = a.student;
      const masteries = student.skillMasteries || [];
      const avgMastery =
        masteries.length > 0
          ? Math.round(masteries.reduce((sum, m) => sum + m.masteryScore, 0) / masteries.length)
          : 0;

      const proctoring = student.proctoringSessions || [];
      const totalViolations = proctoring.reduce((sum, p) => sum + (p.violationsCount || 0), 0);
      const latestTrust = proctoring.length > 0 ? proctoring[0].trustScore : 100;

      return {
        id: a.id,
        assignedAt: a.assignedAt,
        counsellorId: a.counsellorId,
        counsellorEmail: c?.email || a.counsellorId,
        counsellorName: c?.email ? c.email.split('@')[0] : 'Counsellor',
        studentId: student.id,
        enrollmentNumber: student.authorizedStudent.enrollmentNumber,
        studentName: student.authorizedStudent.name,
        email: student.authorizedStudent.email,
        semester: student.authorizedStudent.semester,
        division: student.authorizedStudent.division,
        averageMastery: avgMastery,
        practiceSessionsCount: student.practiceSessions?.length || 0,
        totalViolations,
        trustScore: latestTrust,
      };
    });
  }

  /**
   * Delete assignment by id
   */
  async deleteAssignment(assignmentId: string): Promise<any> {
    return this.prisma.counsellorAssignment.delete({
      where: { id: assignmentId },
    });
  }

  /**
   * Generate downloadable sample files for Excel, CSV, and PDF
   */
  getSampleFile(format: 'xlsx' | 'csv'): { buffer: Buffer; mimeType: string; filename: string } {
    const sampleData = [
      {
        'Counsellor Name': 'Dr. Rajesh Patel',
        'Counsellor Email': 'counsellor@charusat.edu.in',
        'Assigned Student IDs / Range / Names': '24CS001-24CS010, 24CS020-24CS030',
      },
      {
        'Counsellor Name': 'Prof. Sneha Joshi',
        'Counsellor Email': 'sneha.cse@charusat.ac.in',
        'Assigned Student IDs / Range / Names': 'id 11 to 19 and also 31 to 45',
      },
      {
        'Counsellor Name': 'Dr. Amit Dave',
        'Counsellor Email': 'amit.cse@charusat.ac.in',
        'Assigned Student IDs / Range / Names': 'Rahul Patel, Priya Sharma, 24CS046-24CS050',
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Counsellor-Allocations');

    if (format === 'csv') {
      const csvStr = XLSX.utils.sheet_to_csv(ws);
      return {
        buffer: Buffer.from(csvStr, 'utf-8'),
        mimeType: 'text/csv',
        filename: 'clias_counsellor_student_allocation_sample.csv',
      };
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return {
      buffer: buf,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'clias_counsellor_student_allocation_sample.xlsx',
    };
  }
}
