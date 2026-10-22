import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Assessment Authoring & Test Scheduling',
  description:
    'Design, configure, and publish mid-terms, quizzes, and end-semester examinations with security lockouts on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Assessment Authoring',
    'Online Exam Creation',
    'CLIAS Faculty Assessments',
    'CHARUSAT Test Scheduling',
  ],
};

export default function FacultyAssessmentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
