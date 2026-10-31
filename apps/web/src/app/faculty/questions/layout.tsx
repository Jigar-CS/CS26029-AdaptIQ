import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Question Bank & Bloom Taxonomy Management',
  description:
    'Curate, tag, and organize thousands of questions with Bloom levels, difficulty indices, and course outcomes on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Question Bank Management',
    'Bloom Taxonomy Tagging',
    'CLIAS Question Repository',
    'Engineering Question Bank',
  ],
  alternates: {
    canonical: '/faculty/questions',
  },
  openGraph: {
    title: 'Curriculum Question Bank & Bloom Taxonomy Matrix | CLIAS — CHARUSAT',
    description:
      'Manage departmental question repositories categorized by course outcomes (CO), Bloom cognitive levels, and discrimination index on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/faculty/questions',
  },
};

export default function FacultyQuestionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
