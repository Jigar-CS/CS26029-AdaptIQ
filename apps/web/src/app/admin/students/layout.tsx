import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Roster Directory & Enrollment Management',
  description:
    'Institutional student directory, batch enrollments, counsellor allocations, and credential resets on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Student Enrollment Management',
    'Student Directory Administration',
    'CLIAS Admin Students',
  ],
};

export default function AdminStudentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
