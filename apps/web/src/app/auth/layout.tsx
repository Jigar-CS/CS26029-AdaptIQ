import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication & Single Sign-On Portal',
  description:
    'Secure unified authentication and role-based access control for CHARUSAT University students, faculty, counsellors, and administrators on CLIAS (AdaptIQ) by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
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
  alternates: {
    canonical: '/auth/login',
  },
  openGraph: {
    title: 'Authentication & Single Sign-On Portal | CLIAS — CHARUSAT',
    description:
      'Secure unified authentication and role-based access control for CHARUSAT University students, faculty, counsellors, and administrators on CLIAS (AdaptIQ) by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/auth/login',
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
