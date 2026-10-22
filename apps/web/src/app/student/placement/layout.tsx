import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Placement Readiness & Mock Interviews',
  description:
    'Technical recruitment drills, coding interview simulations, aptitude tests, and company-specific question sets on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Placement Preparation',
    'CHARUSAT Campus Placements',
    'Technical Mock Interviews',
    'Aptitude Drills',
  ],
};

export default function StudentPlacementLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
