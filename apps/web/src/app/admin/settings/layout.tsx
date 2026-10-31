import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Settings & Security Configuration',
  description:
    'Global platform settings, API key configurations, LLM model endpoints, session timeout parameters, and security policies on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS System Settings',
    'Platform Security Configuration',
    'LLM API Configurations',
  ],
  alternates: {
    canonical: '/admin/settings',
  },
  openGraph: {
    title: 'System Settings & Security Configuration | CLIAS — CHARUSAT',
    description:
      'Global platform settings, API key configurations, LLM model endpoints, session timeout parameters, and security policies on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/admin/settings',
  },
};

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
