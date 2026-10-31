import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Question Dispute Resolution & Review',
  description:
    'Review student challenges, flagged questions, and re-evaluation requests transparently on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Dispute Resolution',
    'Question Review Portal',
    'CLIAS Faculty Disputes',
  ],
  alternates: {
    canonical: '/faculty/disputes',
  },
  openGraph: {
    title: 'Student Grade Disputes & Re-Evaluation Queue | CLIAS — CHARUSAT',
    description:
      'Review digital ink handwritten answer sheets, re-evaluate AI grading rubrics, and resolve student assessment appeals transparently on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/faculty/disputes',
  },
};

export default function FacultyDisputesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
