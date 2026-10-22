import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Question Synthesis Studio',
  description:
    'Generate high-quality multiple choice, numerical, code snippet, and conceptual questions automatically using advanced AI models on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'AI Question Generator',
    'Automated Question Synthesis',
    'Bloom AI Assessment Studio',
    'CLIAS AI Generator',
    'CHARUSAT AI Studio',
  ],
};

export default function FacultyAIGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
