import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Assigned Mentee Student Roster',
  description:
    'Comprehensive directory of assigned students, academic history, counseling notes, and individual learning progress on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Mentee Student Roster',
    'Student Counseling Records',
    'CLIAS Counsellor Students',
    'CHARUSAT Mentorship Roster',
  ],
};

export default function CounsellorStudentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
