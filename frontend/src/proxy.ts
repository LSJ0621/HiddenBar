import { NextResponse, type NextRequest } from 'next/server';

const protectedPatterns = [
  /^\/bars\/new$/,
  /^\/bars\/[^/]+$/,
  /^\/bars\/[^/]+\/edit$/,
  /^\/my-bars$/,
  /^\/profile(\/edit)?$/,
  /^\/bookmarks$/,
  /^\/search$/,
  /^\/directions$/,
];

const adminPatterns = [/^\/admin(\/.*)?$/];

const authPatterns = [/^\/login$/, /^\/signup$/];

function matchesAny(pathname: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(pathname));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuth = !!request.cookies.get('accessToken')?.value;

  // Authenticated users should not see login/signup pages
  if (matchesAny(pathname, authPatterns) && hasAuth) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protected routes require authentication
  if (matchesAny(pathname, protectedPatterns) && !hasAuth) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes require authentication (role check happens client-side)
  if (matchesAny(pathname, adminPatterns) && !hasAuth) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
