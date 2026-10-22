import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secure Account Sign In',
  description:
    'Sign in to CLIAS (AdaptIQ) CHARUSAT Learning Intelligence and Assessment System. Access student practice drills, exams, and analytics engineered by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Login',
    'CHARUSAT Student Login',
    'CHARUSAT Faculty Login',
    'AdaptIQ Login',
  ],
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
