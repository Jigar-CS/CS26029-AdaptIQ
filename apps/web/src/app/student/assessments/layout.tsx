import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Examinations & Proctored Assessments',
  description:
    'University mid-term, diagnostic, and continuous assessments with AI surveillance and automated grading on CLIAS, built by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Assessments',
    'CHARUSAT Online Exams',
    'AI Proctoring Portal',
    'Automated Assessment Engine',
  ],
};

export default function StudentAssessmentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
