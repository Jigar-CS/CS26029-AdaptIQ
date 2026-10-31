import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Counsellor Dashboard & Mentee Cohort Health',
  description:
    'Real-time overview of assigned student cohorts, average engagement scores, active risk flags, and pending interventions on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Counsellor Dashboard',
    'Mentee Cohort Health',
    'CHARUSAT Student Counseling',
  ],
  alternates: {
    canonical: '/faculty/counselling',
  },
  openGraph: {
    title: 'Counsellor Overview & Mentorship Analytics | CLIAS — CHARUSAT',
    description:
      'Track academic wellness indices, at-risk student queues, and mentorship intervention meeting schedules on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/faculty/counselling',
  },
};

export default function FacultyCounsellingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
