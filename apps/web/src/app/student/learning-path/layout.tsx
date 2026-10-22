import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Personalized Adaptive Learning Path',
  description:
    'Syllabus-aligned prerequisite knowledge graphs and competency progression roadmaps designed for CHARUSAT students by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Adaptive Learning Path',
    'Knowledge Graph Roadmap',
    'CLIAS Curriculum Milestones',
    'CHARUSAT Engineering Path',
  ],
};

export default function StudentLearningPathLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
