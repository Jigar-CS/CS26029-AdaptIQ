import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Academic Profile',
  description:
    'View cumulative GPA, registered courses, topic mastery distribution, and past assessment transcripts on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Student Profile',
    'CHARUSAT Student Transcript',
    'Academic Portfolio',
  ],
  alternates: {
    canonical: '/student/profile',
  },
  openGraph: {
    title: 'Student Academic Profile | CLIAS — CHARUSAT',
    description:
      'View cumulative GPA, registered courses, topic mastery distribution, and past assessment transcripts on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/student/profile',
  },
};

export default function StudentProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
