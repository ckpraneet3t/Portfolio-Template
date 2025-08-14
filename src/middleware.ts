import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Allow home page
	if (pathname === '/') {
		return NextResponse.next();
	}

	// Map known routes to in-page anchors on home
	const pathToHash: Record<string, string> = {
		'/about': '#about',
		'/experience': '#experience',
		'/projects': '#projects',
		'/ideas': '#ideas',
		'/learning': '#learning',
		'/research': '#research',
		'/resources': '#research',
		'/talks': '#talks',
		'/contact': '#contact',
	};

	const url = request.nextUrl.clone();
	url.pathname = '/';
	const hash = pathToHash[pathname];
	url.hash = hash ?? '';
	return NextResponse.redirect(url);
}

// Exclude Next.js internals, API routes, files with extensions (static assets), and SEO files
export const config = {
	matcher: [
		// Match all paths except:
		// - next internals: _next
		// - API routes: api
		// - static files with extensions: .*
		// - common SEO/static files
		"/((?!_next|api|.*\\..*|robots.txt|sitemap.xml|favicon.ico|favicon.svg|manifest.webmanifest).*)",
	],
};


