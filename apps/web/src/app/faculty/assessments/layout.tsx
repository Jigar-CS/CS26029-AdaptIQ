import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Assessment Authoring & Test Scheduling',
  description:
    'Design, configure, and publish mid-terms, quizzes, and end-semester examinations with security lockouts on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Assessment Authoring',
    'Online Exam Creation',
    'CLIAS Faculty Assessments',
    'CHARUSAT Test Scheduling',
  ],
  alternates: {
    canonical: '/faculty/assessments',
  },
  openGraph: {
    title: 'Assessment Authoring & Examination Scheduling | CLIAS — CHARUSAT',
    description:
      'Create mid-term tests, diagnostic quizzes, and continuous evaluations with custom weightage matrices, time windows, and proctoring parameters on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/faculty/assessments',
  },
};

export default function FacultyAssessmentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
