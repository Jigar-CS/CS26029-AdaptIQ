import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Assigned Mentee Student Roster',
  description:
    'Comprehensive directory of assigned students, academic history, counseling notes, and individual learning progress on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Mentee Student Roster',
    'Student Counseling Records',
    'CLIAS Counsellor Students',
    'CHARUSAT Mentorship Roster',
  ],
  alternates: {
    canonical: '/faculty/counselling/students',
  },
  openGraph: {
    title: 'Mentee Roster & Academic Trajectory Dossiers | CLIAS — CHARUSAT',
    description:
      'Individual student learning trajectory dossiers, continuous assessment histories, and personal counselling logs on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/faculty/counselling/students',
  },
};

export default function FacultyCounsellingStudentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
