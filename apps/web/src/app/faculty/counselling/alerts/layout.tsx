import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'At-Risk Academic Early Warning Alerts',
  description:
    'Automated early warning notifications highlighting students struggling with practice drills, failing continuous assessments, or showing irregular activity by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'At-Risk Early Warning Alerts',
    'Dropout Prevention Alerts',
    'CLIAS Counsellor Alerts',
    'Academic Risk Modeling',
  ],
  alternates: {
    canonical: '/faculty/counselling/alerts',
  },
  openGraph: {
    title: 'At-Risk Predictive Academic Warning Triggers | CLIAS — CHARUSAT',
    description:
      'Automated risk flags derived from sudden score drops, low practice velocity, assessment absences, and non-engagement indicators on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/faculty/counselling/alerts',
  },
};

export default function FacultyCounsellingAlertsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
