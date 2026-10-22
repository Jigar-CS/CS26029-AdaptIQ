import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Dashboard & Real-Time Mastery',
  description:
    'Track cognitive topic mastery, learning curve velocity, active streaks, and recommended practice drills on CLIAS (AdaptIQ) by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Student Dashboard',
    'Topic Mastery Tracking',
    'Adaptive Learning Velocity',
    'CHARUSAT Student Analytics',
  ],
};

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
