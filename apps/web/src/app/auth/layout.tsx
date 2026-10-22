import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication & Single Sign-On Portal',
  description:
    'Secure unified authentication and role-based access control for CHARUSAT University students, faculty, counsellors, and administrators on CLIAS (AdaptIQ) by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Login',
    'CHARUSAT Single Sign On',
    'AdaptIQ Auth',
    'Student Portal Login',
    'Faculty Portal Login',
    'CHARUSAT University',
  ],
  authors: [
    { name: 'Jigar Sakhia', url: 'https://github.com/Jigar-CS' },
    { name: 'Jigar' },
  ],
  openGraph: {
    title: 'Authentication & SSO Portal | CLIAS — CHARUSAT',
    description:
      'Secure login and registration portal for CHARUSAT students, faculty, and academic leadership engineered by Jigar Sakhia (Jigar).',
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
