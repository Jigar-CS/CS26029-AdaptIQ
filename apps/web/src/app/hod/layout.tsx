import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HOD Department Curriculum & OBE Console',
  description:
    'Department-level Course Outcome (CO) and Program Outcome (PO) attainment monitoring, faculty workload analytics, and syllabus milestone tracking on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Jigar Sakhia CHARUSAT',
    'HOD Department Console',
    'OBE CO PO Attainment',
    'Curriculum Milestones',
    'CHARUSAT HOD Portal',
    'CLIAS Department Head',
  ],
  authors: [
    { name: 'Jigar Sakhia', url: 'https://github.com/Jigar-CS' },
    { name: 'Jigar', url: 'https://github.com/Jigar-CS' },
    { name: 'Param Shah' },
  ],
  alternates: {
    canonical: '/hod/dashboard',
  },
  openGraph: {
    title: 'Head of Department (HOD) Academic Governance Console | CLIAS — CHARUSAT',
    description:
      'Department-wide curriculum attainment telemetry, course coordinator performance, examination audits, and NBA accreditation reporting for CHARUSAT HODs on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/hod/dashboard',
  },
};

export default function HodLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
