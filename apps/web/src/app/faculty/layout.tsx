import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Faculty Assessment Studio & Curriculum Analytics',
  description:
    'Comprehensive academic faculty console for AI question authoring, automated examination scheduling, live invigilation surveillance, and class-level OBE attainment telemetry on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Jigar Sakhia CHARUSAT',
    'Faculty Assessment Studio',
    'AI Question Generator',
    'CHARUSAT Faculty Portal',
    'CLIAS Faculty Console',
    'Live Invigilation Proctoring',
    'OBE CO PO Telemetry',
  ],
  authors: [
    { name: 'Jigar Sakhia', url: 'https://github.com/Jigar-CS' },
    { name: 'Jigar', url: 'https://github.com/Jigar-CS' },
    { name: 'Param Shah' },
  ],
  alternates: {
    canonical: '/faculty/dashboard',
  },
  openGraph: {
    title: 'Faculty Assessment Studio & Curriculum Analytics | CLIAS — CHARUSAT',
    description:
      'AI question synthesis, proctoring supervision, Bloom taxonomy analytics, and CO-PO attainment suite engineered for CHARUSAT faculty by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/faculty/dashboard',
  },
};

export default function FacultyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
