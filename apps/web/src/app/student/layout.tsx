import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Learning Intelligence & Practice Hub',
  description:
    'AI-powered smart adaptive practice drills, automated assessments, coding IDE, and curriculum learning pathways for CHARUSAT engineering students, engineered by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Jigar Sakhia CHARUSAT',
    'Jigar Sakhia AdaptIQ',
    'Student Learning Intelligence',
    'Smart Adaptive Practice',
    'CLIAS Student Dashboard',
    'CHARUSAT Student Portal',
    'AdaptIQ Practice Drills',
    'Bloom Taxonomy Learning',
  ],
  authors: [
    { name: 'Jigar Sakhia', url: 'https://github.com/Jigar-CS' },
    { name: 'Jigar', url: 'https://github.com/Jigar-CS' },
    { name: 'Param Shah' },
  ],
  alternates: {
    canonical: '/student/dashboard',
  },
  openGraph: {
    title: 'Student Learning Intelligence & Practice Hub | CLIAS — CHARUSAT',
    description:
      'AI-powered smart adaptive practice drills, automated assessments, coding IDE, and curriculum learning pathways for CHARUSAT engineering students, engineered by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/student/dashboard',
  },
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
