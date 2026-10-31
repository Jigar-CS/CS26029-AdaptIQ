import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Administrator Profile & Security Keys',
  description:
    'Master administrator credentials, two-factor authentication keys, and audit log access on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Admin Profile',
    'System Administrator Credentials',
  ],
  alternates: {
    canonical: '/admin/profile',
  },
  openGraph: {
    title: 'Administrator Profile & Security Keys | CLIAS — CHARUSAT',
    description:
      'Master administrator credentials, two-factor authentication keys, and audit log access on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/admin/profile',
  },
};

export default function AdminProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
