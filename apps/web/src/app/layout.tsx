import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { SidebarProvider } from '@/lib/sidebar-context';
import { ThemeProvider } from '@/lib/theme-context';
import { AuthGuard } from '@/components/AuthGuard';

export const metadata: Metadata = {
  metadataBase: new URL('https://clias.vercel.app'),
  title: {
    default: 'CLIAS — CHARUSAT Learning Intelligence & Assessment System | AdaptIQ by Jigar Sakhia & Jigar',
    template: '%s | CLIAS — CHARUSAT',
  },
  description:
    'CLIAS (AdaptIQ) is CHARUSAT University’s premier AI-powered smart adaptive practice, assessment, and student learning intelligence platform engineered by Jigar Sakhia (Jigar), Param, and team. Features Bloom’s cognitive modeling, automated proctoring, Socratic tutoring, and real-time curriculum telemetry.',
  keywords: [
    'Jigar Sakhia',
    'Jigar',
    'Jigar Sakhia CHARUSAT',
    'Jigar Sakhia CLIAS',
    'Jigar Sakhia AdaptIQ',
    'Jigar Sakhia Developer',
    'Jigar Sakhia Engineer',
    'Jigar CHARUSAT',
    'Jigar CLIAS',
    'CLIAS',
    'CHARUSAT',
    'Charusat University',
    'Charotar University of Science and Technology',
    'AdaptIQ',
    'Param',
    'Param Patel',
    'Smart Adaptive Practice',
    'Adaptive Learning Platform',
    'AI Assessment System',
    'AI Question Synthesis',
    'Socratic Tutoring',
    'Intelligent Tutoring System',
    'Bloom Taxonomy Assessment',
    'Outcome Based Education',
    'OBE CO PO Attainment',
    'Knowledge Graph Modeling',
    'Automated Proctoring Surveillance',
    'Predictive Student Risk Modeling',
    'CSPIT',
    'DEPSTAR',
    'CHARUSAT Exam Portal',
    'CLIAS Student Portal',
    'University Assessment Engine',
    'CS26029',
    'Adaptive Practice Drills',
    'Engineering Learning Intelligence',
    'Higher Education AI',
  ],
  authors: [
    { name: 'Jigar Sakhia', url: 'https://github.com/Jigar-CS' },
    { name: 'Jigar', url: 'https://github.com/Jigar-CS' },
    { name: 'Param' },
    { name: 'CHARUSAT University', url: 'https://www.charusat.ac.in' },
  ],
  creator: 'Jigar Sakhia (Jigar), Param & The AdaptIQ Team',
  publisher: 'CHARUSAT (Charotar University of Science and Technology)',
  applicationName: 'CLIAS',
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://clias.vercel.app',
  },
  openGraph: {
    title: 'CLIAS — CHARUSAT Learning Intelligence & Assessment System | AdaptIQ by Jigar Sakhia',
    description:
      'AI-Powered Smart Adaptive Practice, Assessment & Knowledge Modeling Platform developed for CHARUSAT by Jigar Sakhia (Jigar) and Param.',
    url: 'https://clias.vercel.app',
    siteName: 'CLIAS — CHARUSAT Learning Intelligence',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CLIAS — CHARUSAT Smart Adaptive Learning & Assessment Platform | Jigar Sakhia',
    description:
      'Next-generation AI learning intelligence, adaptive drills, and automated proctoring engineered for CHARUSAT by Jigar Sakhia (Jigar) and Param.',
    creator: '@CHARUSAT',
  },
  category: 'education',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Structured Data (JSON-LD) for Search Engine Rich Snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'CLIAS — CHARUSAT Learning Intelligence & Assessment System',
              alternateName: ['AdaptIQ', 'CLIAS CHARUSAT', 'CHARUSAT Adaptive Practice', 'AdaptIQ by Jigar Sakhia'],
              url: 'https://clias.vercel.app',
              applicationCategory: 'EducationalApplication',
              operatingSystem: 'All',
              description:
                'AI-Powered Student Learning Intelligence, Smart Adaptive Practice, Automated Assessment, and Knowledge Modeling Platform for CHARUSAT University engineered by Jigar Sakhia (Jigar) and Param.',
              author: [
                {
                  '@type': 'Person',
                  name: 'Jigar Sakhia',
                  alternateName: 'Jigar',
                  url: 'https://github.com/Jigar-CS',
                  jobTitle: 'Lead Software Engineer & Platform Architect',
                },
                {
                  '@type': 'Person',
                  name: 'Jigar',
                  url: 'https://github.com/Jigar-CS',
                },
                {
                  '@type': 'Person',
                  name: 'Param',
                },
              ],
              creator: {
                '@type': 'Organization',
                name: 'CHARUSAT University',
                url: 'https://www.charusat.ac.in',
              },
              keywords:
                'Jigar Sakhia, Jigar, CLIAS, CHARUSAT, AdaptIQ, Param, Smart Adaptive Practice, AI Assessment, Socratic Tutoring, Charusat University, CSPIT, DEPSTAR',
            }),
          }}
        />
      </head>
      <body className="min-h-screen text-[#1a2540] dark:text-[#e8edf5] selection:bg-[#e05033]/20 selection:text-[#e05033] antialiased font-sans relative">
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-4XQ75TTFN3"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-4XQ75TTFN3');
          `}
        </Script>
        {/* Persistent Fullscreen Matrix Grid Overlay (GPU composited, zero scroll overhead) */}
        <div
          className="fixed inset-0 pointer-events-none z-0 matrix-grid"
          aria-hidden="true"
          style={{ position: 'fixed', inset: 0, transform: 'translateZ(0)' }}
        />
        <div className="relative z-10 min-h-screen">
          <ThemeProvider>
            <AuthProvider>
              <SidebarProvider>
                <AuthGuard>{children}</AuthGuard>
              </SidebarProvider>
            </AuthProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
