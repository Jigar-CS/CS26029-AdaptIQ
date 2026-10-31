import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Counsellor At-Risk Student Monitoring Console',
  description:
    'Predictive academic early warning indicators, mentee roster telemetry, and counseling intervention logs for CHARUSAT academic counsellors on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Jigar Sakhia CHARUSAT',
    'Counsellor Monitoring Console',
    'At-Risk Student Alerts',
    'Predictive Academic Early Warning',
    'CHARUSAT Counsellor Portal',
    'CLIAS Mentorship Console',
  ],
  authors: [
    { name: 'Jigar Sakhia', url: 'https://github.com/Jigar-CS' },
    { name: 'Jigar', url: 'https://github.com/Jigar-CS' },
    { name: 'Param Shah' },
  ],
  alternates: {
    canonical: '/counsellor/dashboard',
  },
  openGraph: {
    title: 'Student Mentorship & At-Risk Intervention Hub | CLIAS — CHARUSAT',
    description:
      'Early warning indicators, predictive drop-out risk modeling, attendance correlations, and batch mentorship tracking for CHARUSAT counsellors on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/counsellor/dashboard',
  },
};

export default function CounsellorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
