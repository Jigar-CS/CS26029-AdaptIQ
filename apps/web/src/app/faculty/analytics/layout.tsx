import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Curriculum & Student Performance Analytics',
  description:
    'Course outcome attainment metrics, student cohort distribution, question discrimination indices, and predictive exam performance on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Curriculum Analytics',
    'Course Outcome Attainment',
    'OBE Metrics',
    'CLIAS Faculty Analytics',
    'CHARUSAT Academic Analytics',
  ],
};

export default function FacultyAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
