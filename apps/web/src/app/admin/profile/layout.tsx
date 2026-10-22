import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Administrator Profile & Security Keys',
  description:
    'Master administrator credentials, two-factor authentication keys, and audit log access on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Admin Profile',
    'System Administrator Credentials',
  ],
};

export default function AdminProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
