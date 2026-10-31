import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Placement Readiness & Mock Interviews',
  description:
    'Technical recruitment drills, coding interview simulations, aptitude tests, and company-specific question sets on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Placement Preparation',
    'CHARUSAT Campus Placements',
    'Technical Mock Interviews',
    'Aptitude Drills',
  ],
  alternates: {
    canonical: '/student/placement',
  },
  openGraph: {
    title: 'Placement Readiness & Mock Interviews | CLIAS — CHARUSAT',
    description:
      'Technical recruitment drills, coding interview simulations, aptitude tests, and company-specific question sets on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/student/placement',
  },
};

export default function StudentPlacementLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
