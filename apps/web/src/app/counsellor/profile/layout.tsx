import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Counsellor Profile & Mentorship Caseload',
  description:
    'Manage mentorship appointments, department allocations, and office hour availability on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Counsellor Profile',
    'CHARUSAT Mentorship Allocation',
  ],
  alternates: {
    canonical: '/counsellor/profile',
  },
  openGraph: {
    title: 'Counsellor Profile & Batch Mentorship Assignment | CLIAS — CHARUSAT',
    description:
      'Counsellor credentials, designated mentee cohorts, and institutional communication settings on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/counsellor/profile',
  },
};

export default function CounsellorProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
