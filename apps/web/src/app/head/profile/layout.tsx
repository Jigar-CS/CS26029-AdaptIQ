import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dean Profile & Institutional Credentials',
  description:
    'Institutional executive credentials, dean portfolio, and campus governance authorization on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Dean Profile',
    'CHARUSAT Institutional Leadership',
  ],
  alternates: {
    canonical: '/head/profile',
  },
  openGraph: {
    title: 'Dean Profile & Institutional Credentials | CLIAS — CHARUSAT',
    description:
      'Institutional executive credentials, dean portfolio, and campus governance authorization on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/head/profile',
  },
};

export default function HeadProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
