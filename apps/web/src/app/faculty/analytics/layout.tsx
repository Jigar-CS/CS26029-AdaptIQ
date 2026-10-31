import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Curriculum & Student Performance Analytics',
  description:
    'Course outcome attainment metrics, student cohort distribution, question discrimination indices, and predictive exam performance on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Curriculum Analytics',
    'Course Outcome Attainment',
    'OBE Metrics',
    'CLIAS Faculty Analytics',
    'CHARUSAT Academic Analytics',
  ],
  alternates: {
    canonical: '/faculty/analytics',
  },
  openGraph: {
    title: 'OBE CO-PO Attainment & Psychometric Telemetry | CLIAS — CHARUSAT',
    description:
      'NBA accreditation attainment matrices, question discrimination curves, student learning velocity metrics, and class performance quartiles on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/faculty/analytics',
  },
};

export default function FacultyAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
