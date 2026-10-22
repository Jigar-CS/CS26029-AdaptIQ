import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'At-Risk Academic Early Warning Alerts',
  description:
    'Automated early warning notifications highlighting students struggling with practice drills, failing continuous assessments, or showing irregular activity by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'At-Risk Early Warning Alerts',
    'Dropout Prevention Alerts',
    'CLIAS Counsellor Alerts',
    'Academic Risk Modeling',
  ],
};

export default function CounsellorAlertsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
