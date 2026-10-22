import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Institutional Governance & Dean Console',
  description:
    'Campus-wide academic intelligence, institute-level accreditation telemetry (NAAC/NBA), multi-program evaluation, and governance console for CHARUSAT University leadership on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Jigar Sakhia CHARUSAT',
    'Dean Academic Console',
    'Institutional Governance',
    'Accreditation Analytics',
    'CHARUSAT Dean Portal',
    'CLIAS Institutional Head',
  ],
  authors: [
    { name: 'Jigar Sakhia', url: 'https://github.com/Jigar-CS' },
    { name: 'Jigar', url: 'https://github.com/Jigar-CS' },
    { name: 'Param' },
  ],
  openGraph: {
    title: 'Institutional Governance & Dean Console | CLIAS — CHARUSAT',
    description:
      'Campus-wide academic metrics, multi-program attainment, and accreditation governance engineered for CHARUSAT by Jigar Sakhia & Jigar.',
    url: 'https://clias.vercel.app/head/dashboard',
  },
};

export default function HeadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
