import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Settings & Security Configuration',
  description:
    'Global platform settings, API key configurations, LLM model endpoints, session timeout parameters, and security policies on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS System Settings',
    'Platform Security Configuration',
    'LLM API Configurations',
  ],
};

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
