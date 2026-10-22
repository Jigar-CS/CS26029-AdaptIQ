import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Counsellor Profile & Mentorship Caseload',
  description:
    'Manage mentorship appointments, department allocations, and office hour availability on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Counsellor Profile',
    'CHARUSAT Mentorship Allocation',
  ],
};

export default function CounsellorProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
