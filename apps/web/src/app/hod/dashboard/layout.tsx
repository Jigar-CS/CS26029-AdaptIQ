import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HOD Executive Dashboard & Department Health',
  description:
    'Departmental performance indicators, Course Outcome attainment charts, syllabus completion rates, and faculty distribution on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS HOD Dashboard',
    'Department Curriculum Health',
    'CHARUSAT HOD Analytics',
  ],
  alternates: {
    canonical: '/hod/dashboard',
  },
  openGraph: {
    title: 'Department Executive Analytics & Course Telemetry | CLIAS — CHARUSAT',
    description:
      'Aggregate course pass rates, continuous assessment distribution curves, faculty authoring volume, and curriculum milestones on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/hod/dashboard',
  },
};

export default function HodDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
