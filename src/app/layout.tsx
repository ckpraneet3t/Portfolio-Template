import type { Metadata } from 'next';
import './globals.css';
import { Inter, Playfair_Display, IBM_Plex_Mono } from 'next/font/google';
import { site } from '@/content/site';
import Background from '@/components/Background';
import Cursor from '@/components/Cursor';
import Nav from '@/components/Nav';
import { CardNavItem } from '@/components/Nav'; // Import the type for our data

// REMOVED: The incorrect import statement is gone.
// import yourLogo from '../public/favicon.svg'; 

const fontSans = IBM_Plex_Mono({ subsets: ['latin'], weight: ['300','400','600'], variable: '--font-sans' });
const fontDisplay = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  // ... (metadata remains the same)
};

// --- NAVIGATION DATA ---
const navItems: CardNavItem[] = [
  {
    label: "About Us",
    bgColor: "#0D0716",
    textColor: "#fff",
    links: [
      { label: "Home", href: "/", ariaLabel: "Go to homepage" },
      { label: "About", href: "#about", ariaLabel: "Learn about us" },
      { label: "Experience", href: "#experience", ariaLabel: "View our experience" },
    ]
  },
  {
    label: "Our Work",
    bgColor: "#170D27",
    textColor: "#fff",
    links: [
      { label: "Projects", href: "#projects", ariaLabel: "See our projects" },
      { label: "Skills", href: "#skills", ariaLabel: "Check out our skills" },
      { label: "Achievements", href: "#achievements", ariaLabel: "Our achievements" },
    ]
  },
  {
    label: "Connect",
    bgColor: "#271E37",
    textColor: "#fff",
    links: [
      { label: "Learning & Ideas", href: "#learning", ariaLabel: "Read our ideas" },
      { label: "Contact", href: "#contact", ariaLabel: "Get in touch" },
    ]
  }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontDisplay.variable}`}>
      <body>
        <Background />
        <Cursor />
        {/* --- UPDATED NAV COMPONENT USAGE --- */}
        <Nav
          // FIXED: The logo path is now a simple string pointing to the file in the public folder.
          logo="/favicon.svg"
          logoAlt="Columbus Portfolio Logo"
          items={navItems}
          baseColor="#ffffff"
          menuColor="#111111"
          buttonBgColor="#111111"
          buttonTextColor="#ffffff"
        />
        <div className="pt-24">{children}</div>
      </body>
    </html>
  );
}