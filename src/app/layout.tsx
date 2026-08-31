import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import StoreProvider from '@/lib/store/StoreProvider';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { RumProvider } from '@/lib/observability/RumProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.agora-schools.com'),
  title: {
    default: 'School Bud | Global Student Identity Ledger & School Management System',
    template: '%s | School Bud'
  },
  description: 'School Bud creates a borderless academic identity for every student, turning static paper trails into a living, portable digital profile secured by a global student ledger.',
  applicationName: 'School Bud',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'School Bud',
  },
  keywords: [
    'Digital Student Identity',
    'Global Student Ledger',
    'School Management System',
    'Digital Transcripts',
    'Academic Identity',
    'Verified Education Records',
    'EdTech Africa',
    'Student Data Portability',
    'Immutable Academic Records',
    'Blockchain Education Registry',
    'School Bud',
  ],
  authors: [{ name: 'School Bud Team' }],
  creator: 'School Bud',
  publisher: 'School Bud',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.agora-schools.com',
    siteName: 'School Bud',
    title: 'School Bud - The Digital Chain-of-Trust for Education',
    description: 'A borderless academic identity for every student. Secured, portable, and immutable records on a global ledger.',
    images: [
      {
        url: '/assets/logos/agora_main.png',
        width: 1200,
        height: 630,
        alt: 'School Bud - Digital Education Identity',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'School Bud - Digital Education Identity',
    description: 'Transforming traditional transcripts into a lifelong asset. Verified, immutable, and instantly accessible student data.',
    images: ['/assets/logos/agora_main.png'],
  },
  icons: {
    icon: [
      { url: '/assets/favicon.ico' },
      { url: '/assets/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/assets/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/assets/apple-touch-icon.png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'theme-color': '#2490FD',
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
        {/* Initial Theme Script to avoid FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('agora-theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var theme = stored === 'dark' ? 'dark'
                          : stored === 'system' ? (prefersDark ? 'dark' : 'light')
                          : 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'School Bud',
              url: 'https://www.agora-schools.com',
              logo: 'https://www.agora-schools.com/assets/logos/agora_main.png',
              description: 'School Bud creates a borderless academic identity for every student, anchoring educational history in a global student ledger.',
              sameAs: [
                'https://twitter.com/agora_edu',
                'https://linkedin.com/company/agora-edu'
              ]
            })
          }}
        />
        {/* Service/Product Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Service',
              name: 'School Bud Student Identity Ledger',
              provider: {
                '@type': 'Organization',
                name: 'School Bud'
              },
              description: 'A unified management system that turns static paper trails into a living, portable digital profile for students.',
              areaServed: 'Global',
              serviceType: 'Education Management'
            })
          }}
        />
      </head>
      <body className={montserrat.className} suppressHydrationWarning={true}>
        <ThemeProvider>
          <StoreProvider>
            <RumProvider>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
              <Toaster position="top-right" containerStyle={{ zIndex: 99999 }} />
            </RumProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
