import type { Metadata } from 'next';
import './globals.css';
// REMOVED: Unused 'Inter' font import
import { Playfair_Display, IBM_Plex_Mono } from 'next/font/google';
import { site } from '@/content/site';
import Background from '@/components/Background';
import Cursor from '@/components/Cursor';
import Nav from '@/components/Nav';

const fontSans = IBM_Plex_Mono({ subsets: ['latin'], weight: ['300', '400', '600'], variable: '--font-sans' });
const fontDisplay = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });

// ADDED: Constants for reusable metadata to keep it DRY
const siteTitle = 'Columbus — Portfolio';
const siteDescription = site.description;

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: `%s — Columbus Portfolio` // You could also use a variable here if needed
  },
  description: siteDescription,
  metadataBase: new URL(site.url),
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: site.url,
    siteName: site.name,
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription
  },
  icons: {
    icon: '/favicon.svg'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontDisplay.variable}`}>
      <body>
        <Background />
        <Cursor />
        <Nav />
        {/* CHANGED: Using a semantic <main> tag for better accessibility and SEO */}
        <main className="pt-14">{children}</main>
      </body>
    </html>
  );
}