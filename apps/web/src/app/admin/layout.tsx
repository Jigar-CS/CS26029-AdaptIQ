import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Super Administrator & System Control Console',
  description:
    'Master administrator console for university multi-tenancy, institute configurations, role-based access management, database migrations, and system telemetry on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Jigar Sakhia CHARUSAT',
    'Super Admin Console',
    'CLIAS Admin Dashboard',
    'CHARUSAT System Management',
    'Multi-Tenant Academic Architecture',
    'AdaptIQ Master Settings',
  ],
  authors: [
    { name: 'Jigar Sakhia', url: 'https://github.com/Jigar-CS' },
    { name: 'Jigar', url: 'https://github.com/Jigar-CS' },
    { name: 'Param Shah' },
  ],
  alternates: {
    canonical: '/admin/dashboard',
  },
  openGraph: {
    title: 'Super Administrator & System Control Console | CLIAS — CHARUSAT',
    description:
      'Master administrator console for university multi-tenancy, institute configurations, role-based access management, database migrations, and system telemetry on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/admin/dashboard',
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
