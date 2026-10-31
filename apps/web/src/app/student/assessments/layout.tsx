import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Examinations & Proctored Assessments',
  description:
    'University mid-term, diagnostic, and continuous assessments with AI surveillance, 1:1 biometric identity verification, exit pass security, and automated grading on CLIAS, engineered by Jigar Sakhia, Jigar, and Param Shah for CHARUSAT University.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Assessments',
    'CHARUSAT Online Exams',
    'AI Proctoring Portal',
    'Biometric 1:1 Face Verification',
    'Multi-Face Detection Proctoring',
    'Digital Ink Handwriting Assessment',
    'Automated Assessment Engine',
    'University Examination Security',
    'Exit Pass Verification',
  ],
  alternates: {
    canonical: '/student/assessments',
  },
  openGraph: {
    title: 'Examinations & Proctored Assessments | CLIAS — CHARUSAT',
    description:
      'University mid-term, diagnostic, and continuous assessments with AI surveillance, 1:1 biometric identity verification, exit pass security, and automated grading on CLIAS, engineered by Jigar Sakhia, Jigar, and Param Shah.',
    url: 'https://clias.vercel.app/student/assessments',
  },
};

export default function StudentAssessmentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
