import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dean Executive Dashboard & Institutional KPIs',
  description:
    'Macro-level academic KPIs, student retention trends, campus-wide assessment distributions, and accreditation compliance matrices on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'CLIAS Dean Dashboard',
    'Institutional KPIs',
    'CHARUSAT Academic Governance',
  ],
  alternates: {
    canonical: '/head/dashboard',
  },
  openGraph: {
    title: 'Dean Executive Dashboard & Institutional KPIs | CLIAS — CHARUSAT',
    description:
      'Macro-level academic KPIs, student retention trends, campus-wide assessment distributions, and accreditation compliance matrices on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/head/dashboard',
  },
};

export default function HeadDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
