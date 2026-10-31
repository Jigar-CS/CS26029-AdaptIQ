import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Institute Provisioning & Multi-Campus Configuration',
  description:
    'Configure CHARUSAT constituent colleges (CSPIT, DEPSTAR, CMPICA, RPCP, PDPIAS, I2IM), academic years, and semester structures on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Param Shah',
    'Param',
    'Institute Provisioning',
    'CSPIT DEPSTAR Portal',
    'Multi-Campus Configuration',
    'CLIAS Institutes',
  ],
  alternates: {
    canonical: '/admin/institutes',
  },
  openGraph: {
    title: 'Institute Provisioning & Multi-Campus Configuration | CLIAS — CHARUSAT',
    description:
      'Configure CHARUSAT constituent colleges (CSPIT, DEPSTAR, CMPICA, RPCP, PDPIAS, I2IM), academic years, and semester structures on CLIAS by Jigar Sakhia & Param Shah.',
    url: 'https://clias.vercel.app/admin/institutes',
  },
};

export default function AdminInstitutesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
