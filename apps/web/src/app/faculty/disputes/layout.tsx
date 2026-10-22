import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Question Dispute Resolution & Review',
  description:
    'Review student challenges, flagged questions, and re-evaluation requests transparently on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Dispute Resolution',
    'Question Review Portal',
    'CLIAS Faculty Disputes',
  ],
};

export default function FacultyDisputesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
