import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Institutional Account Registration',
  description:
    'Register for a new student or academic account on CLIAS CHARUSAT platform. Built by Jigar Sakhia & Jigar with smart adaptive learning integration.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Register',
    'CHARUSAT Student Registration',
    'AdaptIQ Registration',
  ],
  alternates: {
    canonical: '/auth/register',
  },
  openGraph: {
    title: 'Institutional Account Registration | CLIAS — CHARUSAT',
    description:
      'Register for a new student or academic account on CLIAS CHARUSAT platform. Built by Jigar Sakhia & Param Shah with smart adaptive learning integration.',
    url: 'https://clias.vercel.app/auth/register',
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
