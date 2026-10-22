import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HOD Leadership Profile & Department Governance',
  description:
    'Department administrative parameters, faculty assignment authorities, and academic leadership profile on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS HOD Profile',
    'CHARUSAT Department Head Profile',
  ],
};

export default function HodProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
