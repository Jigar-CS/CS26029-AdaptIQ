import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { SidebarProvider } from '@/lib/sidebar-context';
import { ThemeProvider } from '@/lib/theme-context';

export const metadata: Metadata = {
  title: 'CLIAS — CHARUSAT Learning Intelligence & Assessment System',
  description: 'AI-Powered Student Learning Intelligence, Adaptive Practice, Assessment, and Knowledge Modeling Platform',
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
              <SidebarProvider>{children}</SidebarProvider>
            </AuthProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
