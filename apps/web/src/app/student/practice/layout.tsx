import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Smart Adaptive Practice Drills',
  description:
    'AI-generated adaptive practice drills that dynamically scale difficulty to student responses across Bloom’s cognitive taxonomy on CLIAS, engineered by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Smart Adaptive Practice',
    'Adaptive Question Engine',
    'Bloom Taxonomy Practice',
    'CLIAS Practice Drills',
    'CHARUSAT Engineering Practice',
  ],
  alternates: {
    canonical: '/student/practice',
  },
  openGraph: {
    title: 'Smart Adaptive Practice Drills | CLIAS — CHARUSAT',
    description:
      'AI-generated adaptive practice drills that dynamically scale difficulty to student responses across Bloom’s cognitive taxonomy on CLIAS, engineered by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/student/practice',
  },
};

export default function StudentPracticeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
