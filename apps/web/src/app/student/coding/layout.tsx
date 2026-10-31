import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interactive Cloud Coding IDE & Drills',
  description:
    'Full-featured browser coding sandbox with multi-language execution (Python, C++, Java, JS), unit test verifications, and AI algorithmic hints by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Coding IDE',
    'Interactive Code Runner',
    'CHARUSAT Coding Practice',
    'Data Structures & Algorithms Drills',
  ],
  alternates: {
    canonical: '/student/coding',
  },
  openGraph: {
    title: 'Interactive Cloud Coding IDE & Drills | CLIAS — CHARUSAT',
    description:
      'Full-featured browser coding sandbox with multi-language execution (Python, C++, Java, JS), unit test verifications, and AI algorithmic hints by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/student/coding',
  },
};

export default function StudentCodingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
