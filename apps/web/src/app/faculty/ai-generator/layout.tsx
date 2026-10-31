import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Question Synthesis Studio',
  description:
    'Generate high-quality multiple choice, numerical, code snippet, and conceptual questions automatically using advanced AI models on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'AI Question Generator',
    'Automated Question Synthesis',
    'Bloom AI Assessment Studio',
    'CLIAS AI Generator',
    'CHARUSAT AI Studio',
  ],
  alternates: {
    canonical: '/faculty/ai-generator',
  },
  openGraph: {
    title: 'AI Question Generation & Cognitive Synthesis Studio | CLIAS — CHARUSAT',
    description:
      'Automated AI synthesis of multi-tier questions, distractors, evaluation rubrics, and code test fixtures tailored to CHARUSAT syllabus by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/faculty/ai-generator',
  },
};

export default function FacultyAIGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
