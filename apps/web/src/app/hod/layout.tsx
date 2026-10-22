import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HOD Department Curriculum & OBE Console',
  description:
    'Department-level Course Outcome (CO) and Program Outcome (PO) attainment monitoring, faculty workload analytics, and syllabus milestone tracking on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
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
    { name: 'Param' },
  ],
  openGraph: {
    title: 'HOD Department Curriculum & OBE Console | CLIAS — CHARUSAT',
    description:
      'Departmental curriculum governance, CO-PO attainment matrices, and faculty analytics engineered for CHARUSAT HODs by Jigar Sakhia & Jigar.',
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
