import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Institutional Account Registration',
  description:
    'Register for a new student or academic account on CLIAS CHARUSAT platform. Built by Jigar Sakhia & Jigar with smart adaptive learning integration.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Register',
    'CHARUSAT Student Registration',
    'AdaptIQ Registration',
  ],
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
