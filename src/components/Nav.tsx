"use client";

import React from "react";
import Link from "next/link";
import "./Nav.css";

// --- Type Definitions ---
export type NavLink = {
  label: string;
  href: string;
};

export interface NavProps {
  logo: string;
  logoAlt?: string;
  links: NavLink[];
  className?: string;
}

// --- The Component ---
const Nav: React.FC<NavProps> = ({
  logo,
  logoAlt = "Logo",
  links,
  className = "",
}) => {
  return (
    <div className={`nav-container ${className}`}>
      <nav className="nav-bar">
        {/* Logo */}
        <Link href="/" className="nav-logo-link" aria-label="Go to homepage">
          <img src={logo} alt={logoAlt} className="nav-logo" />
        </Link>

        {/* Navigation Links */}
        <ul className="nav-links">
          {(links || []).map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="nav-link">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Nav;