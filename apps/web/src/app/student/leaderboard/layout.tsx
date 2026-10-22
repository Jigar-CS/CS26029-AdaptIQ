import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Campus & Department Leaderboard',
  description:
    'Real-time student rankings across batches, departments, accuracy ratings, and practice streaks on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Leaderboard',
    'CHARUSAT Student Rankings',
    'Academic Gamification',
    'Mastery Leaderboard',
  ],
};

export default function StudentLeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
