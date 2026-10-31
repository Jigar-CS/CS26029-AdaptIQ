import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Faculty Dashboard & Teaching Analytics',
  description:
    'Overview of active courses, scheduled assessments, class mastery curves, and evaluation queues on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Faculty Dashboard',
    'Teaching Analytics',
    'CHARUSAT Faculty Dashboard',
  ],
  alternates: {
    canonical: '/faculty/dashboard',
  },
  openGraph: {
    title: 'Faculty Academic Command Console | CLIAS — CHARUSAT',
    description:
      'Course-level diagnostic intelligence, assessment metrics, batch performance distributions, and AI generation shortcuts on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/faculty/dashboard',
  },
};

export default function FacultyDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
