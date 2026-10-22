import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dean Executive Dashboard & Institutional KPIs',
  description:
    'Macro-level academic KPIs, student retention trends, campus-wide assessment distributions, and accreditation compliance matrices on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'CLIAS Dean Dashboard',
    'Institutional KPIs',
    'CHARUSAT Academic Governance',
  ],
};

export default function HeadDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
