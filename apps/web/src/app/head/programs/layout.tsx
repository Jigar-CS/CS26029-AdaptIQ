import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Degree Programs & Accreditation Analytics',
  description:
    'Evaluate B.Tech, M.Tech, and postgraduate curriculum health, NAAC/NBA criteria compliance, and Program Educational Objectives (PEO) attainment on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Degree Programs Analytics',
    'Accreditation Compliance',
    'NBA NAAC PEO Attainment',
    'CLIAS Programs Console',
  ],
  alternates: {
    canonical: '/head/programs',
  },
  openGraph: {
    title: 'Degree Programs & Accreditation Analytics | CLIAS — CHARUSAT',
    description:
      'Evaluate B.Tech, M.Tech, and postgraduate curriculum health, NAAC/NBA criteria compliance, and Program Educational Objectives (PEO) attainment on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/head/programs',
  },
};

export default function HeadProgramsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
