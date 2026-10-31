import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Roster Directory & Enrollment Management',
  description:
    'Institutional student directory, batch enrollments, counsellor allocations, and credential resets on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Student Enrollment Management',
    'Student Directory Administration',
    'CLIAS Admin Students',
  ],
  alternates: {
    canonical: '/admin/students',
  },
  openGraph: {
    title: 'Student Roster Directory & Enrollment Management | CLIAS — CHARUSAT',
    description:
      'Institutional student directory, batch enrollments, counsellor allocations, and credential resets on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/admin/students',
  },
};

export default function AdminStudentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
