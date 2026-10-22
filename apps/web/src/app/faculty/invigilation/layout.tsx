import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Real-Time Proctoring & Live Invigilation',
  description:
    'Live exam monitoring dashboard with automated anomaly detection, tab switch logging, and proctoring surveillance controls on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Live Invigilation Dashboard',
    'Online Exam Proctoring',
    'Anomaly Detection Surveillance',
    'CLIAS Proctoring Portal',
  ],
};

export default function FacultyInvigilationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
