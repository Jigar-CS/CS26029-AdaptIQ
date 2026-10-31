import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Real-Time Proctoring & Live Invigilation',
  description:
    'Live exam monitoring dashboard with automated anomaly detection, tab switch logging, and proctoring surveillance controls on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Live Invigilation Dashboard',
    'Online Exam Proctoring',
    'Anomaly Detection Surveillance',
    'CLIAS Proctoring Portal',
  ],
  alternates: {
    canonical: '/faculty/invigilation',
  },
  openGraph: {
    title: 'Live Proctored Exam Surveillance & Integrity Console | CLIAS — CHARUSAT',
    description:
      'Real-time multi-student webcam surveillance, biometric face verification alerts, tab-switch anomaly detection, and exit pass verification on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/faculty/invigilation',
  },
};

export default function FacultyInvigilationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
