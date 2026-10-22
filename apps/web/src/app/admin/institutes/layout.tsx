import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Institute Provisioning & Multi-Campus Configuration',
  description:
    'Configure CHARUSAT constituent colleges (CSPIT, DEPSTAR, CMPICA, RPCP, PDPIAS, I2IM), academic years, and semester structures on CLIAS by Jigar Sakhia & Jigar.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Institute Provisioning',
    'CSPIT DEPSTAR Portal',
    'Multi-Campus Configuration',
    'CLIAS Institutes',
  ],
};

export default function AdminInstitutesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
