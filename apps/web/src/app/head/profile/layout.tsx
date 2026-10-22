import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dean Profile & Institutional Credentials',
  description:
    'Institutional executive credentials, dean portfolio, and campus governance authorization on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Dean Profile',
    'CHARUSAT Institutional Leadership',
  ],
};

export default function HeadProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
