import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HOD Executive Dashboard & Department Health',
  description:
    'Departmental performance indicators, Course Outcome attainment charts, syllabus completion rates, and faculty distribution on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS HOD Dashboard',
    'Department Curriculum Health',
    'CHARUSAT HOD Analytics',
  ],
};

export default function HodDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
