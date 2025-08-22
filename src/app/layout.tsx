import type { Metadata } from 'next';
import './globals.css';
import { Inter, Playfair_Display, IBM_Plex_Mono } from 'next/font/google';
import { site } from '@/content/site';
import Background from '@/components/Background';
import Cursor from '@/components/Cursor';
import Nav from '@/components/Nav';
import { NavLink } from '@/components/Nav'; // Import the new NavLink type

const fontSans = IBM_Plex_Mono({ subsets: ['latin'], weight: ['300','400','600'], variable: '--font-sans' });
const fontDisplay = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  // ... (metadata remains the same)
};

// --- NEW SIMPLIFIED NAVIGATION LINKS ---
const navLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#projects", label: "Projects" },
  { href: "#skills", label: "Skills" },
  { href: "#contact", label: "Contact" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontDisplay.variable}`}>
      <body>
        <Background />
        <Cursor />
        {/* --- UPDATED NAV COMPONENT USAGE --- */}
        <Nav
          logo="/favicon.svg"
          logoAlt="Columbus Portfolio Logo"
          links={navLinks}
        />
        <div className="pt-24">{children}</div>
      </body>
    </html>
  );
}