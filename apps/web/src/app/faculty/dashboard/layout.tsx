import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Faculty Dashboard & Teaching Analytics',
  description:
    'Overview of active courses, scheduled assessments, class mastery curves, and evaluation queues on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Faculty Dashboard',
    'Teaching Analytics',
    'CHARUSAT Faculty Dashboard',
  ],
};

export default function FacultyDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
