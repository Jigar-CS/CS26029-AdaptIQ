import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Question Bank & Bloom Taxonomy Management',
  description:
    'Curate, tag, and organize thousands of questions with Bloom levels, difficulty indices, and course outcomes on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Question Bank Management',
    'Bloom Taxonomy Tagging',
    'CLIAS Question Repository',
    'Engineering Question Bank',
  ],
};

export default function FacultyQuestionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
