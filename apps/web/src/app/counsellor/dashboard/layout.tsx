import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Counsellor Dashboard & Mentee Cohort Health',
  description:
    'Real-time overview of assigned student cohorts, average engagement scores, active risk flags, and pending interventions on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Counsellor Dashboard',
    'Mentee Cohort Health',
    'CHARUSAT Student Counseling',
  ],
};

export default function CounsellorDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
