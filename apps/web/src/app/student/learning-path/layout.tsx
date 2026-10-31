import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Personalized Adaptive Learning Path',
  description:
    'Syllabus-aligned prerequisite knowledge graphs and competency progression roadmaps designed for CHARUSAT students by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Adaptive Learning Path',
    'Knowledge Graph Roadmap',
    'CLIAS Curriculum Milestones',
    'CHARUSAT Engineering Path',
  ],
  alternates: {
    canonical: '/student/learning-path',
  },
  openGraph: {
    title: 'Personalized Adaptive Learning Path | CLIAS — CHARUSAT',
    description:
      'Syllabus-aligned prerequisite knowledge graphs and competency progression roadmaps designed for CHARUSAT students by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/student/learning-path',
  },
};

export default function StudentLearningPathLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
