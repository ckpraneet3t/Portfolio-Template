import type { Metadata } from 'next';
import './globals.css';
import { Inter, Playfair_Display, IBM_Plex_Mono } from 'next/font/google';
import { site } from '@/content/site';
import Background from '@/components/Background';
import Cursor from '@/components/Cursor';
import Nav from '@/components/Nav';

const fontSans = IBM_Plex_Mono({ subsets: ['latin'], weight: ['300','400','600'], variable: '--font-sans' });
const fontDisplay = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: {
    default: 'Columbus — Portfolio',
    template: '%s — Columbus Portfolio'
  },
  description: site.description,
  metadataBase: new URL(site.url),
  openGraph: {
    title: 'Columbus — Portfolio',
    description: site.description,
    url: site.url,
    siteName: site.name,
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Columbus — Portfolio',
    description: site.description
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
        <div className="pt-14">{children}</div>
      </body>
    </html>
  );
}


