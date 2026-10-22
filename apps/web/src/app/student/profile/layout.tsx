import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Academic Profile',
  description:
    'View cumulative GPA, registered courses, topic mastery distribution, and past assessment transcripts on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Student Profile',
    'CHARUSAT Student Transcript',
    'Academic Portfolio',
  ],
};

export default function StudentProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
