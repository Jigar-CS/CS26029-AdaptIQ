import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interactive Cloud Coding IDE & Drills',
  description:
    'Full-featured browser coding sandbox with multi-language execution (Python, C++, Java, JS), unit test verifications, and AI algorithmic hints by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Coding IDE',
    'Interactive Code Runner',
    'CHARUSAT Coding Practice',
    'Data Structures & Algorithms Drills',
  ],
};

export default function StudentCodingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
