import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Faculty Academic Profile & Department Affiliation',
  description:
    'Manage instructional courses, question authoring credits, and academic credentials on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Faculty Profile',
    'CHARUSAT Professor Credentials',
  ],
  alternates: {
    canonical: '/faculty/profile',
  },
  openGraph: {
    title: 'Faculty Profile & Academic Department Credentials | CLIAS — CHARUSAT',
    description:
      'Academic credentials, assigned courses, teaching evaluations, and department role authorizations on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/faculty/profile',
  },
};

export default function FacultyProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
