import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HOD Leadership Profile & Department Governance',
  description:
    'Department administrative parameters, faculty assignment authorities, and academic leadership profile on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS HOD Profile',
    'CHARUSAT Department Head Profile',
  ],
  alternates: {
    canonical: '/hod/profile',
  },
  openGraph: {
    title: 'HOD Leadership Profile & Department Governance | CLIAS — CHARUSAT',
    description:
      'Department administrative parameters, faculty assignment authorities, and academic leadership profile on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/hod/profile',
  },
};

export default function HodProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
