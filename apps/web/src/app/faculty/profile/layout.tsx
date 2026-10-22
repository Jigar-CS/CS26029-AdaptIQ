import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Faculty Academic Profile & Department Affiliation',
  description:
    'Manage instructional courses, question authoring credits, and academic credentials on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Faculty Profile',
    'CHARUSAT Professor Credentials',
  ],
};

export default function FacultyProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
