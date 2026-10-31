import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Campus & Department Leaderboard',
  description:
    'Real-time student rankings across batches, departments, accuracy ratings, and practice streaks on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Leaderboard',
    'CHARUSAT Student Rankings',
    'Academic Gamification',
    'Mastery Leaderboard',
  ],
  alternates: {
    canonical: '/student/leaderboard',
  },
  openGraph: {
    title: 'Campus & Department Leaderboard | CLIAS — CHARUSAT',
    description:
      'Real-time student rankings across batches, departments, accuracy ratings, and practice streaks on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/student/leaderboard',
  },
};

export default function StudentLeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
