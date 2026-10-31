import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Profile & Academic Credentials',
  description:
    'Manage your academic identity, security settings, and notification preferences on CLIAS (AdaptIQ) for CHARUSAT University, engineered by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Profile',
    'CHARUSAT Student Profile',
    'AdaptIQ Credentials',
  ],
  authors: [
    { name: 'Jigar Sakhia', url: 'https://github.com/Jigar-CS' },
    { name: 'Jigar' },
  ],
  alternates: {
    canonical: '/profile',
  },
  openGraph: {
    title: 'User Profile & Academic Credentials | CLIAS — CHARUSAT',
    description:
      'Manage your academic identity, security settings, and notification preferences on CLIAS (AdaptIQ) for CHARUSAT University, engineered by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/profile',
  },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
