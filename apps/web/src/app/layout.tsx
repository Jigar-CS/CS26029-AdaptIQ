import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { SidebarProvider } from '@/lib/sidebar-context';
import { ThemeProvider } from '@/lib/theme-context';
import { AuthGuard } from '@/components/AuthGuard';
import { ToastProvider } from '@/lib/toast';

export const metadata: Metadata = {
  metadataBase: new URL('https://clias.vercel.app'),
  title: {
    default: 'CLIAS — CHARUSAT Learning Intelligence & Assessment System | AdaptIQ by Jigar Sakhia & Param Patel',
    template: '%s | CLIAS — CHARUSAT Learning Intelligence & Assessment System',
  },
  description:
    'CLIAS (AdaptIQ) is CHARUSAT University’s premier AI-powered smart adaptive practice, assessment, and student learning intelligence platform engineered by Jigar Sakhia, Jigar, Param Patel, and the AdaptIQ Team. Built for CSPIT and DEPSTAR Computer Science students, CLIAS combines Bloom’s taxonomy cognitive modeling, biometric 1:1 facial identity matching and real-time proctoring surveillance, automated digital ink handwriting answer sheet evaluation, multi-language coding compilation, Socratic AI tutoring, and real-time curriculum outcome (CO-PO) attainment analytics.',
  keywords: [
    // Creator Names & Aliases
    'Jigar Sakhia',
    'Jigar',
    'Jigar Sakhia CHARUSAT',
    'Jigar Sakhia CLIAS',
    'Jigar Sakhia AdaptIQ',
    'Jigar Sakhia Developer',
    'Jigar Sakhia Software Engineer',
    'Jigar Sakhia Full Stack Engineer',
    'Jigar Sakhia Computer Science',
    'Jigar CHARUSAT',
    'Jigar CLIAS',
    'Jigar-CS',
    'Param Patel',
    'Param',
    'Param Patel CHARUSAT',
    'AdaptIQ Team',
    'CLIAS Engineering Team',
    // Institution & University Ecosystem
    'CLIAS',
    'CLIAS CHARUSAT',
    'AdaptIQ',
    'AdaptIQ CLIAS',
    'CHARUSAT',
    'Charusat University',
    'Charotar University of Science and Technology',
    'CSPIT',
    'Chandubhai S Patel Institute of Technology',
    'DEPSTAR',
    'Devang Patel Institute of Advance Technology and Research',
    'CSPIT Computer Science and Engineering',
    'CHARUSAT Changa Gujarat',
    'CHARUSAT Exam Portal',
    'CLIAS Student Portal',
    'CLIAS Faculty Portal',
    'CLIAS Examination System',
    'CHARUSAT Learning Management System',
    'CS26029',
    'CS26029 AdaptIQ',
    // Natural Language Search Sentences
    'CHARUSAT AI powered adaptive learning platform',
    'Intelligent assessment system with biometric identity verification',
    'Automated handwritten answer sheet evaluation and grading',
    'Bloom taxonomy based question generation and cognitive modeling',
    'Next generation university computer based examination system',
    'AI proctored online exam portal with multi-face detection',
    'Outcome based education CO PO attainment analytics platform',
    'Adaptive practice drills with Socratic intelligent tutoring',
    'Student learning intelligence and at risk performance prediction',
    // Core Platform Capabilities & Modules
    'Smart Adaptive Practice',
    'Adaptive Learning Platform',
    'Adaptive Assessment Platform',
    'AI Assessment System',
    'AI Question Synthesis',
    'Socratic Tutoring',
    'Intelligent Tutoring System',
    'Bloom Taxonomy Assessment',
    'Outcome Based Education',
    'OBE CO PO Attainment',
    'Knowledge Graph Modeling',
    'Automated Proctoring Surveillance',
    'Biometric Identity Verification',
    '1:1 Face Verification Exam System',
    'Multi-Face Detection Proctoring',
    'Identity Impersonation Detection',
    'Digital Ink Handwriting Assessment',
    'Handwritten Answer Sheet Evaluation',
    'Descriptive Answer Evaluation AI',
    'Real-time Code Execution Engine',
    'Online Compiler Assessment',
    'Predictive Student Risk Modeling',
    'Cohort Attempt Analytics',
    'Gleam Spark Design System',
    'University Assessment Engine',
    'Computer Based Test CBT Platform',
    'Higher Education Academic Intelligence',
    'Engineering Learning Intelligence',
    'Continuous Assessment System',
    'Exit Pass Assessment Security',
    'Fullscreen Assessment Security Enforcement',
    'NBA Accreditation OBE Tools',
  ],
  authors: [
    { name: 'Jigar Sakhia', url: 'https://github.com/Jigar-CS' },
    { name: 'Jigar', url: 'https://github.com/Jigar-CS' },
    { name: 'Param Patel', url: 'https://github.com/Jigar-CS' },
    { name: 'Param' },
    { name: 'CHARUSAT University', url: 'https://www.charusat.ac.in' },
  ],
  creator: 'Jigar Sakhia (Jigar), Param Patel & The AdaptIQ Team',
  publisher: 'CHARUSAT (Charotar University of Science and Technology)',
  applicationName: 'CLIAS — CHARUSAT Learning Intelligence & Assessment System',
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  classification: 'Educational Technology, Academic Assessment & Adaptive Learning System',
  category: 'education',
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
    title: 'CLIAS — CHARUSAT Learning Intelligence & Assessment System | AdaptIQ by Jigar Sakhia & Param Patel',
    description:
      'AI-Powered Smart Adaptive Practice, Assessment, Biometric Identity Verification & Knowledge Modeling Platform developed for CHARUSAT by Jigar Sakhia, Jigar, and Param Patel.',
    url: 'https://clias.vercel.app',
    siteName: 'CLIAS — CHARUSAT Learning Intelligence & Assessment System',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://clias.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CLIAS - CHARUSAT Learning Intelligence & Assessment System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CLIAS — CHARUSAT Smart Adaptive Learning & Assessment Platform | Jigar Sakhia & Param Patel',
    description:
      'Next-generation AI learning intelligence, adaptive drills, biometric 1:1 proctoring, and automated grading engineered for CHARUSAT by Jigar Sakhia and Param Patel.',
    creator: '@CHARUSAT',
    site: '@CHARUSAT',
    images: ['https://clias.vercel.app/og-image.png'],
  },
  other: {
    'apple-mobile-web-app-title': 'CLIAS',
    'application-name': 'CLIAS — CHARUSAT',
    'msapplication-TileColor': '#e05033',
    'theme-color': '#0d1322',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
              '@graph': [
                {
                  '@type': 'EducationalOrganization',
                  '@id': 'https://www.charusat.ac.in/#organization',
                  name: 'Charotar University of Science and Technology (CHARUSAT)',
                  alternateName: ['CHARUSAT', 'CSPIT', 'DEPSTAR'],
                  url: 'https://www.charusat.ac.in',
                  logo: 'https://clias.vercel.app/icon.png',
                  address: {
                    '@type': 'PostalAddress',
                    addressLocality: 'Changa',
                    addressRegion: 'Gujarat',
                    postalCode: '388421',
                    addressCountry: 'IN',
                  },
                },
                {
                  '@type': 'WebApplication',
                  '@id': 'https://clias.vercel.app/#webapp',
                  name: 'CLIAS — CHARUSAT Learning Intelligence & Assessment System',
                  alternateName: [
                    'AdaptIQ',
                    'CLIAS CHARUSAT',
                    'CHARUSAT Adaptive Practice',
                    'AdaptIQ by Jigar Sakhia & Param Patel',
                  ],
                  url: 'https://clias.vercel.app',
                  applicationCategory: 'EducationalApplication',
                  operatingSystem: 'All modern web browsers (Chrome, Edge, Firefox, Safari)',
                  description:
                    'AI-Powered Student Learning Intelligence, Smart Adaptive Practice, Automated Assessment, Biometric Identity Verification, Digital Ink Handwriting Grading, and Knowledge Modeling Platform for CHARUSAT University engineered by Jigar Sakhia, Jigar, Param Patel, and the AdaptIQ Team.',
                  featureList: [
                    'Smart Adaptive Practice Drills',
                    'Biometric 1:1 Face Verification Exam Surveillance',
                    'Digital Ink Handwritten Answer Sheet Evaluation',
                    'Bloom Taxonomy Cognitive Modeling',
                    'Real-time Online Code Execution & Compiler Assessment',
                    'Socratic Intelligent Tutoring',
                    'OBE CO-PO Attainment Analytics',
                    'Cohort Attempt Analytics Console',
                  ],
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
                      name: 'Param Patel',
                      alternateName: 'Param',
                      url: 'https://github.com/Jigar-CS',
                      jobTitle: 'Software Engineer',
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
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'INR',
                  },
                  keywords:
                    'Jigar Sakhia, Jigar, CLIAS, CHARUSAT, AdaptIQ, Param, Param Patel, Smart Adaptive Practice, AI Assessment, Socratic Tutoring, Charusat University, CSPIT, DEPSTAR, Biometric Proctoring, Digital Ink Assessment',
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://clias.vercel.app/#website',
                  url: 'https://clias.vercel.app',
                  name: 'CLIAS — CHARUSAT Learning Intelligence & Assessment System',
                  description:
                    'CHARUSAT University’s official AI-powered adaptive learning, examination, and student academic intelligence portal.',
                  publisher: {
                    '@id': 'https://www.charusat.ac.in/#organization',
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen text-[#1a2540] dark:text-[#e8edf5] selection:bg-[#e05033]/20 selection:text-[#e05033] antialiased font-sans relative">
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
              <ToastProvider>
                <SidebarProvider>
                  <AuthGuard>{children}</AuthGuard>
                </SidebarProvider>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
