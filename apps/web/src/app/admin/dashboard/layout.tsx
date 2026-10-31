import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Master Dashboard & System Metrics',
  description:
    'Real-time system telemetry, active concurrent user sessions, database performance, API response latencies, and service health on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Admin Dashboard',
    'System Health Telemetry',
    'CHARUSAT Platform Metrics',
  ],
  alternates: {
    canonical: '/admin/dashboard',
  },
  openGraph: {
    title: 'Admin Master Dashboard & System Metrics | CLIAS — CHARUSAT',
    description:
      'Real-time system telemetry, active concurrent user sessions, database performance, API response latencies, and service health on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/admin/dashboard',
  },
};

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
